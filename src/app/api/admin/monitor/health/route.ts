/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// 健康检查超时时间（毫秒）
const HEALTH_CHECK_TIMEOUT = 5000;

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}

// 带超时的 fetch
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function hasAdminAccess(request: NextRequest): Promise<boolean> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo?.username) return false;

  if (authInfo.username === process.env.USERNAME) return true;

  const config = await getConfig();
  const user = config.UserConfig.Users.find(
    (item) => item.username === authInfo.username,
  );
  return Boolean(user && user.role === 'admin' && !user.banned);
}

export async function GET(request: NextRequest) {
  if (!(await hasAdminAccess(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const checks: HealthCheckResult[] = [];

    // 1. 检查 Upstash 连接
    const redisStart = Date.now();
    try {
      await getConfig();
      checks.push({
        name: 'upstash-redis',
        status: 'healthy',
        latencyMs: Date.now() - redisStart,
      });
    } catch (err) {
      checks.push({
        name: 'upstash-redis',
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // 2. 检查采集源 API 是否可达
    const config = await getConfig();
    if (config?.SourceConfig) {
      // 只检查前 3 个源，避免超时
      const sourcesToCheck = config.SourceConfig.filter(
        (s) => !s.disabled,
      ).slice(0, 3);
      for (const source of sourcesToCheck) {
        if (!source.api) continue;

        const sourceStart = Date.now();
        try {
          let response = await fetchWithTimeout(
            source.api,
            HEALTH_CHECK_TIMEOUT,
          );
          // 部分源不支持 HEAD，回退到 GET 再判定状态码
          if (response.status === 405 || response.status === 501) {
            response = await fetch(source.api, {
              method: 'GET',
              signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
            });
          }
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          checks.push({
            name: `source:${source.name || source.api}`,
            status: 'healthy',
            latencyMs: Date.now() - sourceStart,
          });
        } catch (err) {
          checks.push({
            name: `source:${source.name || source.api}`,
            status: 'unhealthy',
            latencyMs: Date.now() - sourceStart,
            error:
              err instanceof Error ? err.message : 'Timeout or unreachable',
          });
        }
      }
    }

    // 3. 计算总体健康状态
    const unhealthyCount = checks.filter(
      (c) => c.status === 'unhealthy',
    ).length;
    const totalChecks = checks.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overallStatus = 'healthy';
    } else if (unhealthyCount < totalChecks) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return NextResponse.json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        checks: [],
      },
      { status: 500 },
    );
  }
}
