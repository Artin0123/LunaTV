/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

import { AdminConfig } from './admin.types';
import { ensureString, ensureStringArray } from './data-utils';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

// 添加Upstash Redis操作重试包装器
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      const isLastAttempt = i === maxRetries - 1;
      const isConnectionError =
        err.message?.includes('Connection') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ENOTFOUND') ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        err.name === 'UpstashError';

      if (isConnectionError && !isLastAttempt) {
        console.log(
          `Upstash Redis operation failed, retrying... (${i + 1}/${maxRetries})`,
        );
        console.error('Error:', err.message);

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

export class UpstashRedisStorage implements IStorage {
  private client: Redis;

  constructor() {
    this.client = getUpstashRedisClient();
  }

  // ---------- 播放记录 ----------
  private prKey(user: string, key: string) {
    return `u:${user}:pr:${key}`; // u:username:pr:source+id
  }

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    const val = await withRetry(() =>
      this.client.get(this.prKey(userName, key)),
    );
    return val ? (val as PlayRecord) : null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    await withRetry(() => this.client.set(this.prKey(userName, key), record));
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<Record<string, PlayRecord>> {
    const pattern = `u:${userName}:pr:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};

    // 使用 MGET 批量获取，替代 N 次单独 GET（减少 N-1 次 Redis 往返）
    const values = await withRetry(() =>
      this.client.mget<PlayRecord[]>(...keys),
    );
    const result: Record<string, PlayRecord> = {};
    const prefix = `u:${userName}:pr:`;
    for (let i = 0; i < keys.length; i++) {
      if (values[i]) {
        const keyPart = ensureString(keys[i].replace(prefix, ''));
        result[keyPart] = values[i] as PlayRecord;
      }
    }
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.prKey(userName, key)));
  }

  // ---------- 收藏 ----------
  private favKey(user: string, key: string) {
    return `u:${user}:fav:${key}`;
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const val = await withRetry(() =>
      this.client.get(this.favKey(userName, key)),
    );
    return val ? (val as Favorite) : null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.favKey(userName, key), favorite),
    );
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const pattern = `u:${userName}:fav:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};

    // 使用 MGET 批量获取
    const values = await withRetry(() => this.client.mget<Favorite[]>(...keys));
    const result: Record<string, Favorite> = {};
    const prefix = `u:${userName}:fav:`;
    for (let i = 0; i < keys.length; i++) {
      if (values[i]) {
        const keyPart = ensureString(keys[i].replace(prefix, ''));
        result[keyPart] = values[i] as Favorite;
      }
    }
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.favKey(userName, key)));
  }

  // ---------- 用户注册 / 登录 ----------
  private userPwdKey(user: string) {
    return `u:${user}:pwd`;
  }

  private userIndexKey() {
    return 'u:index';
  }

  private async deleteKeysInChunks(
    keys: string[],
    chunkSize = 500,
  ): Promise<void> {
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      await withRetry(() => this.client.del(...chunk));
    }
  }

  // bcrypt 哈希轮数（10 是推荐值，Serverless 中性能可接受）
  private static BCRYPT_ROUNDS = 10;

  async registerUser(userName: string, password: string): Promise<void> {
    // 使用 bcrypt 哈希密码后存储
    const hash = await bcrypt.hash(password, UpstashRedisStorage.BCRYPT_ROUNDS);
    await withRetry(() => this.client.set(this.userPwdKey(userName), hash));
    await withRetry(() => this.client.sadd(this.userIndexKey(), userName));
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const stored = await withRetry(() =>
      this.client.get(this.userPwdKey(userName)),
    );
    if (stored === null) return false;

    const storedStr = ensureString(stored);

    // 检测是否为 bcrypt 哈希（以 $2a$ 或 $2b$ 开头）
    if (storedStr.startsWith('$2')) {
      return bcrypt.compare(password, storedStr);
    }

    // 兼容旧版明文密码：验证后自动迁移到 bcrypt 哈希
    if (storedStr === password) {
      // 自动升级为 bcrypt 哈希（静默迁移）
      const hash = await bcrypt.hash(
        password,
        UpstashRedisStorage.BCRYPT_ROUNDS,
      );
      await withRetry(() => this.client.set(this.userPwdKey(userName), hash));
      return true;
    }

    return false;
  }

  // 检查用户是否存在
  async checkUserExist(userName: string): Promise<boolean> {
    const exists = await withRetry(() =>
      this.client.exists(this.userPwdKey(userName)),
    );
    return exists === 1;
  }

  // 修改用户密码
  async changePassword(userName: string, newPassword: string): Promise<void> {
    // 使用 bcrypt 哈希新密码后存储
    const hash = await bcrypt.hash(
      newPassword,
      UpstashRedisStorage.BCRYPT_ROUNDS,
    );
    await withRetry(() => this.client.set(this.userPwdKey(userName), hash));
  }

  async getUserPasswordHash(userName: string): Promise<string | null> {
    const stored = await withRetry(() =>
      this.client.get(this.userPwdKey(userName)),
    );
    if (stored === null) return null;
    return ensureString(stored);
  }

  async setUserPasswordHash(
    userName: string,
    passwordHash: string,
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.userPwdKey(userName), passwordHash),
    );
    await withRetry(() => this.client.sadd(this.userIndexKey(), userName));
  }

  // 删除用户及其所有数据
  async deleteUser(userName: string): Promise<void> {
    // 单次匹配用户命名空间，避免 3 次 KEYS 扫描
    const userPattern = `u:${userName}:*`;
    const userKeys = await withRetry(() => this.client.keys(userPattern));
    if (userKeys.length > 0) {
      await this.deleteKeysInChunks(userKeys);
    }
    await withRetry(() => this.client.srem(this.userIndexKey(), userName));
  }

  // ---------- 搜索历史 ----------
  private shKey(user: string) {
    return `u:${user}:sh`; // u:username:sh
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    const result = await withRetry(() =>
      this.client.lrange(this.shKey(userName), 0, -1),
    );
    // 确保返回的都是字符串类型
    return ensureStringArray(result as any[]);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const key = this.shKey(userName);
    const kw = ensureString(keyword);
    // 使用 Pipeline 合并 3 次 Redis 操作为 1 次网络往返
    const pipeline = this.client.pipeline();
    pipeline.lrem(key, 0, kw); // 去重
    pipeline.lpush(key, kw); // 插入到最前
    pipeline.ltrim(key, 0, SEARCH_HISTORY_LIMIT - 1); // 限制长度
    await withRetry(() => pipeline.exec());
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const key = this.shKey(userName);
    if (keyword) {
      await withRetry(() => this.client.lrem(key, 0, ensureString(keyword)));
    } else {
      await withRetry(() => this.client.del(key));
    }
  }

  // ---------- 获取全部用户 ----------
  async getAllUsers(): Promise<string[]> {
    const indexedUsers = await withRetry(() =>
      this.client.smembers<string[]>(this.userIndexKey()),
    );
    const normalizedUsers = ensureStringArray((indexedUsers || []) as any[]);
    if (normalizedUsers.length > 0) {
      return normalizedUsers;
    }

    // 兼容旧数据：索引缺失时回退到 KEYS，并回填索引
    const keys = await withRetry(() => this.client.keys('u:*:pwd'));
    const discoveredUsers = keys
      .map((k) => {
        const match = k.match(/^u:(.+?):pwd$/);
        return match ? ensureString(match[1]) : undefined;
      })
      .filter((u): u is string => typeof u === 'string');
    if (discoveredUsers.length > 0) {
      await withRetry(() =>
        this.client.sadd(this.userIndexKey(), discoveredUsers),
      );
    }
    return discoveredUsers;
  }

  // ---------- 管理员配置 ----------
  private adminConfigKey() {
    return 'admin:config';
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const val = await withRetry(() => this.client.get(this.adminConfigKey()));
    return val ? (val as AdminConfig) : null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    await withRetry(() => this.client.set(this.adminConfigKey(), config));
  }

  // ---------- 跳过片头片尾配置 ----------
  private skipConfigKey(user: string, source: string, id: string) {
    return `u:${user}:skip:${source}+${id}`;
  }

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    const val = await withRetry(() =>
      this.client.get(this.skipConfigKey(userName, source, id)),
    );
    return val ? (val as SkipConfig) : null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.skipConfigKey(userName, source, id), config),
    );
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    await withRetry(() =>
      this.client.del(this.skipConfigKey(userName, source, id)),
    );
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: SkipConfig }> {
    const pattern = `u:${userName}:skip:*`;
    const keys = await withRetry(() => this.client.keys(pattern));

    if (keys.length === 0) {
      return {};
    }

    const configs: { [key: string]: SkipConfig } = {};

    // 批量获取所有配置
    const values = await withRetry(() => this.client.mget(keys));

    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        // 从key中提取source+id
        const match = key.match(/^u:.+?:skip:(.+)$/);
        if (match) {
          const sourceAndId = match[1];
          configs[sourceAndId] = value as SkipConfig;
        }
      }
    });

    return configs;
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    try {
      // 获取所有用户
      const allUsers = await this.getAllUsers();

      // 删除所有用户及其数据
      for (const username of allUsers) {
        await this.deleteUser(username);
      }

      // 删除管理员配置
      await withRetry(() => this.client.del(this.adminConfigKey()));
      await withRetry(() => this.client.del(this.userIndexKey()));

      console.log('所有数据已清空');
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new Error('清空数据失败');
    }
  }
}

// 单例 Upstash Redis 客户端
function getUpstashRedisClient(): Redis {
  const globalKey = Symbol.for('__MOONTV_UPSTASH_REDIS_CLIENT__');
  let client: Redis | undefined = (global as any)[globalKey];

  if (!client) {
    const upstashUrl = (process.env.UPSTASH_URL || '').trim();
    const upstashToken = (process.env.UPSTASH_TOKEN || '').trim();

    if (!upstashUrl || !upstashToken) {
      throw new Error(
        'UPSTASH_URL and UPSTASH_TOKEN env variables must be set',
      );
    }

    // 创建 Upstash Redis 客户端
    client = new Redis({
      url: upstashUrl,
      token: upstashToken,
      // 可选配置
      retry: {
        retries: 3,
        backoff: (retryCount: number) =>
          Math.min(1000 * Math.pow(2, retryCount), 30000),
      },
    });

    console.log('Upstash Redis client created successfully');

    (global as any)[globalKey] = client;
  }

  return client;
}
