/**
 * 进程级监控统计（模块级单例）
 *
 * 在 Serverless 环境中，每个函数实例有自己的进程，
 * 这些计数器在实例回收后自动归零。
 */

// ---- 请求计数 ----

let totalRequests = 0;
const requestTimestamps: number[] = [];

/** 记录一次请求 */
export function recordRequest(): void {
  totalRequests++;
  requestTimestamps.push(Date.now());
}

/** 获取总请求数 */
export function getTotalRequests(): number {
  return totalRequests;
}

/** 计算最近 60 秒的 QPS */
export function calculateQPS(): number {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  return Math.round((requestTimestamps.length / 60) * 100) / 100;
}

// ---- CPU 采样 ----

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

/** 获取自上次调用以来的 CPU 使用百分比 */
export function getCpuPercent(): number {
  const currentCpu = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const elapsedMs = currentTime - lastCpuTime;

  if (elapsedMs <= 0) return 0;

  const totalCpuMs = (currentCpu.user + currentCpu.system) / 1000;
  const percent = Math.round((totalCpuMs / elapsedMs) * 100 * 100) / 100;

  lastCpuUsage = process.cpuUsage();
  lastCpuTime = Date.now();

  return Math.min(percent, 100);
}

// ---- 模块加载时间 ----

export const MODULE_LOAD_TIME = Date.now();
