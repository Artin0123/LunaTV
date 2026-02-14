/* eslint-disable no-console */

/**
 * 纯記憶體 IStorage 實作 — 用於本地開發和測試。
 *
 * - 不需要任何外部服務（Upstash / Redis）
 * - 資料僅保存在 Node.js 進程記憶體中
 * - 重啟 dev server 資料即消失
 *
 * 用法：在 .env.local 中設定 NEXT_PUBLIC_STORAGE_TYPE=memory
 */

import bcrypt from 'bcryptjs';

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

// 搜索历史最大条数（與 upstash.db.ts 保持一致）
const SEARCH_HISTORY_LIMIT = 20;

export class InMemoryStorage implements IStorage {
  // 所有資料以巢狀 Map 存放
  private playRecords = new Map<string, Map<string, PlayRecord>>();
  private favorites = new Map<string, Map<string, Favorite>>();
  private users = new Map<string, string>(); // userName -> hashedPassword
  private searchHistories = new Map<string, string[]>();
  private adminConfig: AdminConfig | null = null;
  private skipConfigs = new Map<string, Map<string, SkipConfig>>();

  constructor() {
    console.log('📦 InMemoryStorage 已初始化（開發模式，資料不持久化）');
  }

  // ========== 播放記錄 ==========

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    return this.playRecords.get(userName)?.get(key) ?? null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    if (!this.playRecords.has(userName)) {
      this.playRecords.set(userName, new Map());
    }
    this.playRecords.get(userName)!.set(key, record);
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<{ [key: string]: PlayRecord }> {
    const map = this.playRecords.get(userName);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    this.playRecords.get(userName)?.delete(key);
  }

  // ========== 收藏 ==========

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    return this.favorites.get(userName)?.get(key) ?? null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    if (!this.favorites.has(userName)) {
      this.favorites.set(userName, new Map());
    }
    this.favorites.get(userName)!.set(key, favorite);
  }

  async getAllFavorites(
    userName: string,
  ): Promise<{ [key: string]: Favorite }> {
    const map = this.favorites.get(userName);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    this.favorites.get(userName)?.delete(key);
  }

  // ========== 使用者 ==========

  async registerUser(userName: string, password: string): Promise<void> {
    const hashed = await bcrypt.hash(password, 10);
    this.users.set(userName, hashed);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const hashed = this.users.get(userName);
    if (!hashed) return false;
    return bcrypt.compare(password, hashed);
  }

  async checkUserExist(userName: string): Promise<boolean> {
    return this.users.has(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 10);
    this.users.set(userName, hashed);
  }

  async getUserPasswordHash(userName: string): Promise<string | null> {
    return this.users.get(userName) ?? null;
  }

  async setUserPasswordHash(
    userName: string,
    passwordHash: string,
  ): Promise<void> {
    this.users.set(userName, passwordHash);
  }

  async deleteUser(userName: string): Promise<void> {
    this.users.delete(userName);
    this.playRecords.delete(userName);
    this.favorites.delete(userName);
    this.searchHistories.delete(userName);
    this.skipConfigs.delete(userName);
  }

  // ========== 搜索歷史 ==========

  async getSearchHistory(userName: string): Promise<string[]> {
    return this.searchHistories.get(userName) ?? [];
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    let history = this.searchHistories.get(userName) ?? [];
    // 去重：移除已存在的相同關鍵字
    history = history.filter((h) => h !== keyword);
    // 加到最前面
    history.unshift(keyword);
    // 限制數量
    if (history.length > SEARCH_HISTORY_LIMIT) {
      history = history.slice(0, SEARCH_HISTORY_LIMIT);
    }
    this.searchHistories.set(userName, history);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (keyword) {
      const history = this.searchHistories.get(userName) ?? [];
      this.searchHistories.set(
        userName,
        history.filter((h) => h !== keyword),
      );
    } else {
      this.searchHistories.delete(userName);
    }
  }

  // ========== 使用者列表 ==========

  async getAllUsers(): Promise<string[]> {
    return [...this.users.keys()];
  }

  // ========== 管理員配置 ==========

  async getAdminConfig(): Promise<AdminConfig | null> {
    return this.adminConfig;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    this.adminConfig = config;
  }

  // ========== 跳過片頭片尾 ==========

  private skipKey(source: string, id: string): string {
    return `${source}:${id}`;
  }

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    return (
      this.skipConfigs.get(userName)?.get(this.skipKey(source, id)) ?? null
    );
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    if (!this.skipConfigs.has(userName)) {
      this.skipConfigs.set(userName, new Map());
    }
    this.skipConfigs.get(userName)!.set(this.skipKey(source, id), config);
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    this.skipConfigs.get(userName)?.delete(this.skipKey(source, id));
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: SkipConfig }> {
    const map = this.skipConfigs.get(userName);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  // ========== 資料清理 ==========

  async clearAllData(): Promise<void> {
    this.playRecords.clear();
    this.favorites.clear();
    this.users.clear();
    this.searchHistories.clear();
    this.adminConfig = null;
    this.skipConfigs.clear();
    console.log('📦 InMemoryStorage: 所有資料已清除');
  }
}
