export type SubscriptionConfigFormat = 'json' | 'base58';

export async function decodeSubscriptionConfig(
  rawContent: string,
): Promise<{ content: string; format: SubscriptionConfigFormat }> {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('配置内容为空');
  }

  // 优先支持明文 JSON，便于本地调试与人工维护
  try {
    JSON.parse(trimmed);
    return { content: trimmed, format: 'json' };
  } catch {
    // 非 JSON 时继续尝试 Base58
  }

  try {
    const bs58 = (await import('bs58')).default;
    const decodedBytes = bs58.decode(trimmed);
    const decodedText = new TextDecoder().decode(decodedBytes).trim();
    JSON.parse(decodedText);
    return { content: decodedText, format: 'base58' };
  } catch {
    throw new Error('配置内容格式错误：仅支持明文 JSON 或 Base58(JSON)');
  }
}
