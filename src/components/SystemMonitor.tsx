'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---- 类型定义 ----

interface MonitorData {
  success: boolean;
  timestamp: string;
  collectionTimeMs: number;
  cpu: { percent: number };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    heapUsedPercent: number;
  };
  storage: {
    status: 'connected' | 'error' | 'not_configured';
    latencyMs: number | null;
  };
  requests: {
    total: number;
    qps: number;
  };
  instance: {
    uptimeSeconds: number;
    isWarmStart: boolean;
    nodeVersion: string;
    platform: string;
  };
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}

interface HealthData {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
}

interface HistoryPoint {
  time: string;
  cpu: number;
  heapUsed: number;
  rss: number;
  storageLatency: number | null;
  qps: number;
}

// ---- 常量 ----

const POLL_INTERVAL_MS = 10_000;
const MAX_HISTORY = 60; // 60 条 = 10 分钟

// ---- 参考阈值（与平台无关，可按部署环境调整）----
const MEMORY_REFERENCE_MB = 1024;
const LATENCY_REFERENCE_MS = 1000;

// ---- 辅助函数 ----

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** 健康指示色 */
function levelColor(level: 'good' | 'warn' | 'danger'): {
  text: string;
  bg: string;
  ring: string;
} {
  switch (level) {
    case 'good':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
        ring: 'ring-green-500/40',
      };
    case 'warn':
      return {
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        ring: 'ring-yellow-500/40',
      };
    case 'danger':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
        ring: 'ring-red-500/40',
      };
  }
}

/** 判断 CPU 使用级别 */
function cpuLevel(percent: number): 'good' | 'warn' | 'danger' {
  if (percent < 50) return 'good';
  if (percent < 80) return 'warn';
  return 'danger';
}

/** 判断内存使用级别（基于 RSS 粗略阈值） */
function memoryLevel(rssMB: number): 'good' | 'warn' | 'danger' {
  const ratio = rssMB / MEMORY_REFERENCE_MB;
  if (ratio < 0.6) return 'good';
  if (ratio < 0.8) return 'warn';
  return 'danger';
}

/** 判断延迟级别 */
function latencyLevel(ms: number): 'good' | 'warn' | 'danger' {
  if (ms < 100) return 'good';
  if (ms < 500) return 'warn';
  return 'danger';
}

/** 判断堆使用率级别 */
function heapLevel(percent: number): 'good' | 'warn' | 'danger' {
  // 考虑到 V8 的垃圾回收机制比较懒，90% 甚至以上都是常见水平，放宽报警阈值
  if (percent < 90) return 'good';
  if (percent < 95) return 'warn';
  return 'danger';
}

function statusDotCls(status: string): string {
  switch (status) {
    case 'healthy':
    case 'connected':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'unhealthy':
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'healthy':
    case 'connected':
      return '正常';
    case 'degraded':
      return '部分异常';
    case 'unhealthy':
    case 'error':
      return '异常';
    case 'not_configured':
      return '未配置';
    default:
      return '未知';
  }
}

// ---- 环形进度条 ----

function RingGauge({
  percent,
  size = 72,
  strokeWidth = 6,
  level,
  label,
  value,
  unit,
  tooltip,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  level: 'good' | 'warn' | 'danger';
  label: string;
  value: string;
  unit: string;
  tooltip: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  const colors = levelColor(level);

  return (
    <div className='flex flex-col items-center' title={tooltip}>
      <div className='relative' style={{ width: size, height: size }}>
        <svg width={size} height={size} className='-rotate-90'>
          {/* 背景轨道 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill='none'
            stroke='currentColor'
            className='text-gray-200 dark:text-gray-700'
            strokeWidth={strokeWidth}
          />
          {/* 进度弧 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill='none'
            stroke='currentColor'
            className={colors.text}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap='round'
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* 中间数字 */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className={`text-sm font-bold font-mono ${colors.text}`}>
            {value}
            <span className='text-[10px] font-normal'>{unit}</span>
          </span>
        </div>
      </div>
      <span className='text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center leading-tight'>
        {label}
      </span>
    </div>
  );
}

// ---- Mini SVG Sparkline ----

function Sparkline({
  data,
  width = 200,
  height = 48,
  color = '#3b82f6',
  label,
  unit,
  tooltip,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label: string;
  unit: string;
  tooltip: string;
}) {
  if (data.length < 2) {
    return (
      <div
        className='text-xs text-gray-400 italic flex items-center justify-center'
        style={{ width: '100%', height: height + 28 }}
      >
        数据采集中…
      </div>
    );
  }

  const max = Math.max(...data) * 1.15 || 1;
  const min = Math.min(...data) * 0.85;
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const current = data[data.length - 1];
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const maxVal = Math.max(...data);

  return (
    <div title={tooltip}>
      <div className='flex items-baseline justify-between mb-1'>
        <span className='text-xs text-gray-500 dark:text-gray-400'>
          {label}
        </span>
        <div className='flex items-baseline gap-2'>
          <span className='text-[10px] text-gray-400'>
            avg {avg.toFixed(1)}
          </span>
          <span className='text-[10px] text-gray-400'>
            max {maxVal.toFixed(1)}
          </span>
          <span className='text-sm font-mono font-semibold text-gray-700 dark:text-gray-200'>
            {current.toFixed(1)}
            <span className='text-xs font-normal text-gray-400'>{unit}</span>
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className='w-full'
        preserveAspectRatio='none'
      >
        <defs>
          <linearGradient
            id={`grad-${label.replace(/\s/g, '')}`}
            x1='0'
            y1='0'
            x2='0'
            y2='1'
          >
            <stop offset='0%' stopColor={color} stopOpacity='0.25' />
            <stop offset='100%' stopColor={color} stopOpacity='0.02' />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#grad-${label.replace(/\s/g, '')})`}
        />
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  );
}

// ---- 数据卡片 ----

function MetricCard({
  label,
  value,
  unit,
  sub,
  level,
  tooltip,
}: {
  label: string;
  value: string | number;
  unit: string;
  sub?: string;
  level?: 'good' | 'warn' | 'danger';
  tooltip: string;
}) {
  const colors = level ? levelColor(level) : null;

  return (
    <div
      className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow'
      title={tooltip}
    >
      <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
        {label}
      </div>
      <div
        className={`text-xl font-bold font-mono ${
          colors ? colors.text : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {value}
        <span className='text-sm font-normal text-gray-400 ml-0.5'>{unit}</span>
      </div>
      {sub && <div className='text-xs text-gray-400 mt-1'>{sub}</div>}
    </div>
  );
}

// ---- 主组件 ----

export default function SystemMonitor() {
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchMs, setLastFetchMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthTick = useRef(0);

  const fetchMonitor = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch('/api/admin/monitor');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MonitorData = await res.json();
      setMonitor(data);
      setError(null);

      setHistory((prev) => {
        const point: HistoryPoint = {
          time: new Date().toLocaleTimeString(),
          cpu: data.cpu.percent,
          heapUsed: data.memory.heapUsed,
          rss: data.memory.rss,
          storageLatency: data.storage.latencyMs,
          qps: data.requests.qps,
        };
        const next = [...prev, point];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取监控数据失败');
    } finally {
      setLastFetchMs(Date.now() - start);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitor/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealth(data);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    if (polling) {
      fetchMonitor();
      fetchHealth();
      timerRef.current = setInterval(() => {
        fetchMonitor();
        healthTick.current++;
        // 健康检查 30 秒一次
        if (healthTick.current % 3 === 0) {
          fetchHealth();
        }
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [polling, fetchMonitor, fetchHealth]);

  // ---- 渲染 ----

  return (
    <div className='space-y-6'>
      {/* 控制栏 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <button
            onClick={() => setPolling((p) => !p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              polling
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            {polling ? (
              <>
                <span className='inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse' />
                每 10 秒自动刷新
              </>
            ) : (
              '⏸ 已暂停'
            )}
          </button>
          <button
            onClick={() => {
              fetchMonitor();
              fetchHealth();
            }}
            className='px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors'
          >
            立即刷新
          </button>
        </div>
        <div className='text-xs text-gray-400'>
          {history.length > 0 && (
            <span>
              已采集 {history.length} 笔 · 请求耗时 {lastFetchMs}ms
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300'>
          ⚠️ {error}
        </div>
      )}

      {/* === 环形仪表盘 (核心指标一目了然) === */}
      {monitor && (
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
            ⚡ 核心指标
          </h4>
          <div className='flex flex-wrap items-start justify-around gap-4'>
            <RingGauge
              percent={monitor.cpu.percent}
              level={cpuLevel(monitor.cpu.percent)}
              label='CPU 使用率'
              value={monitor.cpu.percent.toFixed(0)}
              unit='%'
              tooltip='查看算力是否不足。'
            />
            <RingGauge
              percent={monitor.memory.heapUsedPercent}
              level={heapLevel(monitor.memory.heapUsedPercent)}
              label='JS 堆内存'
              value={monitor.memory.heapUsed.toFixed(0)}
              unit='MB'
              tooltip={`查看代码是否有内存泄漏，当前 ${monitor.memory.heapUsed}MB / ${monitor.memory.heapTotal}MB（${monitor.memory.heapUsedPercent}%）。`}
            />
            <RingGauge
              percent={(monitor.memory.rss / MEMORY_REFERENCE_MB) * 100}
              level={memoryLevel(monitor.memory.rss)}
              label='总内存(RSS)'
              value={monitor.memory.rss.toFixed(0)}
              unit='MB'
              tooltip={`查看内存是否不足，目前约占系统参考值的 ${((monitor.memory.rss / MEMORY_REFERENCE_MB) * 100).toFixed(0)}%。`}
            />
            <RingGauge
              percent={
                monitor.storage.latencyMs !== null
                  ? Math.min(
                      (monitor.storage.latencyMs / LATENCY_REFERENCE_MS) * 100,
                      100,
                    )
                  : 0
              }
              level={
                monitor.storage.latencyMs !== null
                  ? latencyLevel(monitor.storage.latencyMs)
                  : 'good'
              }
              label='存储延迟'
              value={
                monitor.storage.latencyMs !== null
                  ? monitor.storage.latencyMs.toString()
                  : '-'
              }
              unit='ms'
              tooltip='查看数据库或第三方 API 响应是否变慢。'
            />
          </div>
        </div>
      )}

      {/* === 数字指标卡片 === */}
      {monitor && (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <MetricCard
            label='📊 监控请求总数'
            value={monitor.requests.total}
            unit='次'
            sub={`监控 QPS: ${monitor.requests.qps}`}
            tooltip='当前监控 API（/api/admin/monitor）在本实例启动后的累计请求数，QPS 为该接口最近 60 秒的平均每秒请求量。'
          />
          <MetricCard
            label='⏱ 运行时间'
            value={formatUptime(monitor.instance.uptimeSeconds)}
            unit=''
            sub={monitor.instance.isWarmStart ? '♻️ 运行中' : '🆕 刚启动'}
            tooltip='当前服务进程连续运行时间。'
          />
          <MetricCard
            label='🗄 存储状态'
            value={statusLabel(monitor.storage.status)}
            unit=''
            sub={
              monitor.storage.latencyMs !== null
                ? `延迟 ${monitor.storage.latencyMs}ms`
                : undefined
            }
            level={
              monitor.storage.status === 'connected'
                ? 'good'
                : monitor.storage.status === 'error'
                  ? 'danger'
                  : undefined
            }
            tooltip='后端存储连接状态与最近一次延迟。'
          />
          <MetricCard
            label='🖥 平台信息'
            value={monitor.instance.nodeVersion}
            unit=''
            sub={`OS: ${monitor.instance.platform}`}
            tooltip='Node.js 版本和操作系统平台。'
          />
        </div>
      )}

      {/* === 实时趋势图 === */}
      {history.length >= 2 && (
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
            📈 实时趋势（最近{' '}
            {Math.ceil((history.length * POLL_INTERVAL_MS) / 60000)} 分钟）
          </h4>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Sparkline
              data={history.map((h) => h.cpu)}
              color='#ef4444'
              label='CPU 使用率'
              unit='%'
              tooltip='CPU 忙碌的趋势。如果线一直维持在很高的地方，代表网站一直在算东西，可能会卡。'
            />
            <Sparkline
              data={history.map((h) => h.rss)}
              color='#8b5cf6'
              label='总内存 (RSS)'
              unit=' MB'
              tooltip='整个网站吃掉的内存趋势。只要图表是一上一下的就没事，如果一直往上爬到顶，最后就会崩溃。'
            />
            <Sparkline
              data={history.map((h) => h.heapUsed)}
              color='#3b82f6'
              label='JS 堆内存'
              unit=' MB'
              tooltip='代码执行用掉的内存。在这边线像锯齿状（满了之后自动清空掉回低点）是完全正常的。'
            />
            <Sparkline
              data={history
                .map((h) => h.storageLatency)
                .filter((v): v is number => v !== null)}
              color='#10b981'
              label='存储延迟'
              unit=' ms'
              tooltip='网站去后面找资料花费的时间。突然飙高代表网络经常不稳、或者是硬盘读取太卡了。'
            />
          </div>
        </div>
      )}

      {/* === 健康检查 === */}
      {health && (
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              🏥 健康检查
            </h4>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                health.status === 'healthy'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : health.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {statusLabel(health.status)}
            </span>
          </div>
          <div className='space-y-2'>
            {health.checks.map((check) => (
              <div
                key={check.name}
                className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0'
              >
                <div className='flex items-center gap-2'>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${statusDotCls(
                      check.status,
                    )}`}
                  />
                  <span className='text-sm text-gray-700 dark:text-gray-300'>
                    {check.name}
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <span className='text-xs text-gray-400 font-mono'>
                    {check.latencyMs}ms
                  </span>
                  {check.error && (
                    <span className='text-xs text-red-500 max-w-[200px] truncate'>
                      {check.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无数据占位 */}
      {!monitor && !error && (
        <div className='text-center py-8 text-gray-400 dark:text-gray-500'>
          <div className='animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-2' />
          正在采集数据…
        </div>
      )}
    </div>
  );
}
