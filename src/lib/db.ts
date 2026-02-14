/* eslint-disable no-console */

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';
import { UpstashRedisStorage } from './upstash.db';

// storage type 常量: 'localstorage' | 'upstash'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'upstash'
    | undefined) || 'localstorage';

// 创建存储实例
// - upstash：连接 Upstash Redis（生产环境）
// - localstorage：返回 null，由客户端 db.client.ts 处理
function createStorage(): IStorage | null {
  switch (STORAGE_TYPE) {
    case 'upstash':
      return new UpstashRedisStorage();
    case 'localstorage':
    default:
      return null;
  }
}

const DB_STORAGE_KEY = Symbol.for('__LUNATV_DB_STORAGE_SINGLETON__');

type GlobalWithDbStorage = typeof globalThis & {
  [DB_STORAGE_KEY]?: {
    storageType: typeof STORAGE_TYPE;
    storage: IStorage | null;
  };
};

function getStorage(): IStorage | null {
  const globalRef = globalThis as GlobalWithDbStorage;
  const current = globalRef[DB_STORAGE_KEY];
  if (!current || current.storageType !== STORAGE_TYPE) {
    globalRef[DB_STORAGE_KEY] = {
      storageType: STORAGE_TYPE,
      storage: createStorage(),
    };
  }
  return globalRef[DB_STORAGE_KEY]?.storage ?? null;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

/**
 * 数据库管理器
 *
 * 在 localstorage 模式下，服务器端无持久化存储，所有方法返回安全默认值。
 * 客户端的数据操作由 db.client.ts 直接通过 localStorage 完成。
 * 在 upstash 模式下，所有方法委托给 UpstashRedisStorage。
 */
export class DbManager {
  /** 获取存储实例，不可用时返回 null */
  private get storage(): IStorage | null {
    return getStorage();
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<PlayRecord | null> {
    if (!this.storage) return null;
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord,
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    if (!this.storage) return {};
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<Favorite | null> {
    if (!this.storage) return null;
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite,
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    if (!this.storage) return {};
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string,
  ): Promise<boolean> {
    if (!this.storage) return false;
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    if (!this.storage) return false;
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    if (!this.storage) return false;
    return this.storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.changePassword(userName, newPassword);
  }

  async getUserPasswordHash(userName: string): Promise<string | null> {
    if (!this.storage) return null;
    return this.storage.getUserPasswordHash(userName);
  }

  async setUserPasswordHash(
    userName: string,
    passwordHash: string,
  ): Promise<void> {
    if (!this.storage) return;
    await this.storage.setUserPasswordHash(userName, passwordHash);
  }

  async deleteUser(userName: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.deleteUser(userName);
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    if (!this.storage) return [];
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (!this.storage) return [];
    return this.storage.getAllUsers();
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (!this.storage) return null;
    return this.storage.getAdminConfig();
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (!this.storage) return;
    await this.storage.setAdminConfig(config);
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    if (!this.storage) return null;
    return this.storage.getSkipConfig(userName, source, id);
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    if (!this.storage) return;
    await this.storage.setSkipConfig(userName, source, id, config);
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    if (!this.storage) return;
    await this.storage.deleteSkipConfig(userName, source, id);
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: SkipConfig }> {
    if (!this.storage) return {};
    return this.storage.getAllSkipConfigs(userName);
  }

  // ---------- 数据清理 ----------
  async clearAllData(): Promise<void> {
    if (!this.storage) return;
    await this.storage.clearAllData();
  }
}

// 导出默认实例
export const db = new DbManager();
