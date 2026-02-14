/**
 * 数据类型转换辅助函数
 * 从 Upstash Redis 返回的数据可能不是预期类型，
 * 这些函数确保类型安全。
 */

export function ensureString(value: unknown): string {
  return String(value);
}

export function ensureStringArray(value: unknown[]): string[] {
  return value.map((item) => String(item));
}
