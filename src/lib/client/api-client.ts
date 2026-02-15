'use client';

import {
  deleteOpenApi,
  type DeletePath,
  type DeleteQuery,
  type DeleteSuccessResponse,
  getOpenApi,
  type GetPath,
  type GetQuery,
  type GetSuccessResponse,
} from '../openapi-client';

// ---- 工具函数 ----
/**
 * 通用的 fetch 函数，处理 401 状态码自动跳转登录
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, options);
  if (!res.ok) {
    // 如果是 401 未授权，跳转到登录页面
    if (res.status === 401) {
      // 调用 logout 接口
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('注销请求失败:', error);
      }
      const currentUrl = window.location.pathname + window.location.search;
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('redirect', currentUrl);
      window.location.href = loginUrl.toString();
      throw new Error('用户未授权，已跳转到登录页面');
    }
    throw new Error(`请求 ${url} 失败: ${res.status}`);
  }
  return res;
}

export async function fetchFromApi<P extends GetPath>(
  path: P,
  query?: GetQuery<P>,
): Promise<GetSuccessResponse<P>> {
  const result = await getOpenApi(path, {
    request: fetchWithAuth,
    query,
  });
  return result.data as GetSuccessResponse<P>;
}

export async function deleteFromApi<P extends DeletePath>(
  path: P,
  query?: DeleteQuery<P>,
): Promise<DeleteSuccessResponse<P>> {
  const result = await deleteOpenApi(path, {
    request: fetchWithAuth,
    query,
  });
  return result.data as DeleteSuccessResponse<P>;
}
