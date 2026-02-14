import { NextRequest } from 'next/server';

type AuthInfo = {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  role?: 'owner' | 'admin' | 'user';
};

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): AuthInfo | null {
  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): AuthInfo | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce(
      (acc, cookie) => {
        const trimmed = cookie.trim();
        const firstEqualIndex = trimmed.indexOf('=');

        if (firstEqualIndex > 0) {
          const key = trimmed.substring(0, firstEqualIndex);
          const value = trimmed.substring(firstEqualIndex + 1);
          if (key && value) {
            acc[key] = value;
          }
        }

        return acc;
      },
      {} as Record<string, string>,
    );

    // auth 是 HttpOnly，客户端优先读取可访问的 auth_client；
    // 同时保留对旧版 auth（非 HttpOnly）的兼容读取。
    const rawCookie = cookies['auth_client'] || cookies['auth'];
    if (!rawCookie) {
      return null;
    }

    // 处理可能的双重编码
    let decoded = decodeURIComponent(rawCookie);

    // 如果解码后仍然包含 %，说明是双重编码，需要再次解码
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    return null;
  }
}
