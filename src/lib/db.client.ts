'use client';

/**
 * 仅在浏览器端使用的数据库工具，目前基于 localStorage 实现。
 * 之所以单独拆分文件，是为了避免在客户端 bundle 中引入 `fs`, `path` 等 Node.js 内置模块，
 * 从而解决诸如 "Module not found: Can't resolve 'fs'" 的问题。
 *
 * 此文件已重构为重新导出 `src/lib/client/` 下的模块。
 */

// Re-export types
export type { Favorite, PlayRecord } from './types';

// Re-export from sub-modules
export * from './client/api-client';
export * from './client/cache-manager';
export * from './client/events';
export * from './client/favorites';
export * from './client/play-records';
export * from './client/search-history';
export * from './client/skip-configs';
