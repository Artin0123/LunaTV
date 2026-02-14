/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import {
  calculateQPS,
  getCpuPercent,
  getTotalRequests,
  MODULE_LOAD_TIME,
  recordRequest,
} from '@/lib/monitor-stats';

export const runtime = 'nodejs';

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

  // 记录本次请求
  recordRequest();

  try {
    const startTime = Date.now();

    // 1. CPU 使用率
    const cpuPercent = getCpuPercent();

    // 2. 内存使用
    const mem = process.memoryUsage();
    const toMB = (bytes: number) =>
      Math.round((bytes / 1024 / 1024) * 100) / 100;

    const memory = {
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      rss: toMB(mem.rss),
      external: toMB(mem.external),
      heapUsedPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    };

    // 3. 存储延迟
    let storageLatencyMs: number | null = null;
    let storageStatus: 'connected' | 'error' | 'not_configured' =
      'not_configured';

    try {
      const pingStart = Date.now();
      const config = await getConfig();
      storageLatencyMs = Date.now() - pingStart;
      storageStatus = config ? 'connected' : 'not_configured';
    } catch (err) {
      console.error('Storage health check failed:', err);
      storageStatus = 'error';
    }

    // 4. 实例信息
    const instanceUptime = Math.round((Date.now() - MODULE_LOAD_TIME) / 1000);

    // 5. 请求统计
    const qps = calculateQPS();
    const total = getTotalRequests();

    // 6. 采集耗时
    const collectionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      collectionTimeMs,
      cpu: {
        percent: cpuPercent,
      },
      memory,
      storage: {
        status: storageStatus,
        latencyMs: storageLatencyMs,
      },
      requests: {
        total,
        qps,
      },
      instance: {
        uptimeSeconds: instanceUptime,
        isWarmStart: instanceUptime > 5,
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  } catch (error) {
    console.error('Monitor API failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
