/**
 * API 输入验证 Schema 定义
 *
 * 使用 Zod 为 API Route 定义输入验证规则。
 * 通过 schema.safeParse(body) 替代手动 typeof 检查，
 * 提供更清晰的错误信息和更安全的输入验证。
 */

import { z } from 'zod';

// ---- 认证相关 ----

/** POST /api/login */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').optional(),
  password: z.string().min(1, '密码不能为空'),
});

/** POST /api/change-password */
export const changePasswordSchema = z.object({
  newPassword: z.string().min(1, '新密码不得为空'),
});

// ---- 收藏相关 ----

/** POST /api/favorites body */
export const saveFavoriteSchema = z.object({
  key: z
    .string()
    .min(1, 'key 不能为空')
    .regex(/^.+\+.+$/, 'key 格式错误，应为 source+id'),
  favorite: z.object({
    title: z.string().min(1, '标题不能为空'),
    source_name: z.string().min(1, 'source_name 不能为空'),
    year: z.string().default(''),
    cover: z.string().default(''),
    total_episodes: z.number().int().default(0),
    save_time: z.number().default(() => Date.now()),
    search_title: z.string().optional(),
    origin: z.enum(['vod', 'live']).optional(),
  }),
});

// ---- 播放记录相关 ----

/** POST /api/playrecords body */
export const savePlayRecordSchema = z.object({
  key: z
    .string()
    .min(1, 'key 不能为空')
    .regex(/^.+\+.+$/, 'key 格式错误，应为 source+id'),
  record: z.object({
    title: z.string().min(1, '标题不能为空'),
    source_name: z.string().min(1, 'source_name 不能为空'),
    year: z.string().default(''),
    cover: z.string().default(''),
    index: z.number().int().default(0),
    total_episodes: z.number().int().default(0),
    play_time: z.number().default(0),
    total_time: z.number().default(0),
    save_time: z.number().default(() => Date.now()),
    search_title: z.string().optional(),
  }),
});

// ---- 搜索历史相关 ----

/** POST /api/searchhistory body */
export const addSearchHistorySchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词过长'),
});

// ---- 跳过片头片尾配置 ----

/** POST /api/skipconfigs body */
export const saveSkipConfigSchema = z.object({
  key: z
    .string()
    .min(1, 'key 不能为空')
    .regex(/^.+\+.+$/, 'key 格式错误，应为 source+id'),
  config: z.object({
    enable: z.boolean().default(true),
    intro_time: z.number().int().min(0).default(0),
    outro_time: z.number().int().min(0).default(0),
  }),
});

// ---- 通用验证辅助函数 ----

/**
 * 验证请求体并返回解析后的数据。
 * 如果验证失败，返回 null 和格式化的错误信息。
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.errors.map((e) => e.message).join('; ');
  return { success: false, error: messages };
}
