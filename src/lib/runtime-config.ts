export type StorageType = 'localstorage' | 'upstash';
export type DoubanProxyType =
  | 'direct'
  | 'cors-proxy-zwei'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'cors-anywhere'
  | 'custom';
export type DoubanImageProxyType =
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'custom';

export interface RuntimeCategory {
  name: string;
  type: 'movie' | 'tv';
  query: string;
}

export interface RuntimeConfig {
  STORAGE_TYPE: StorageType;
  DOUBAN_PROXY_TYPE: DoubanProxyType;
  DOUBAN_PROXY: string;
  DOUBAN_IMAGE_PROXY_TYPE: DoubanImageProxyType;
  DOUBAN_IMAGE_PROXY: string;
  DISABLE_YELLOW_FILTER: boolean;
  CUSTOM_CATEGORIES: RuntimeCategory[];
  FLUID_SEARCH: boolean;
}

declare global {
  interface Window {
    RUNTIME_CONFIG?: Partial<RuntimeConfig>;
  }
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  STORAGE_TYPE: 'localstorage',
  DOUBAN_PROXY_TYPE: 'cmliussss-cdn-tencent',
  DOUBAN_PROXY: '',
  DOUBAN_IMAGE_PROXY_TYPE: 'cmliussss-cdn-tencent',
  DOUBAN_IMAGE_PROXY: '',
  DISABLE_YELLOW_FILTER: false,
  CUSTOM_CATEGORIES: [],
  FLUID_SEARCH: true,
};

function toStorageType(value: unknown): StorageType {
  return value === 'upstash' || value === 'localstorage'
    ? value
    : DEFAULT_RUNTIME_CONFIG.STORAGE_TYPE;
}

function toDoubanProxyType(value: unknown): DoubanProxyType {
  return value === 'direct' ||
    value === 'cors-proxy-zwei' ||
    value === 'cmliussss-cdn-tencent' ||
    value === 'cmliussss-cdn-ali' ||
    value === 'cors-anywhere' ||
    value === 'custom'
    ? value
    : DEFAULT_RUNTIME_CONFIG.DOUBAN_PROXY_TYPE;
}

function toDoubanImageProxyType(value: unknown): DoubanImageProxyType {
  return value === 'direct' ||
    value === 'server' ||
    value === 'img3' ||
    value === 'cmliussss-cdn-tencent' ||
    value === 'cmliussss-cdn-ali' ||
    value === 'custom'
    ? value
    : DEFAULT_RUNTIME_CONFIG.DOUBAN_IMAGE_PROXY_TYPE;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function toBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toCategories(value: unknown): RuntimeCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is RuntimeCategory =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as RuntimeCategory).name === 'string' &&
        ((item as RuntimeCategory).type === 'movie' ||
          (item as RuntimeCategory).type === 'tv') &&
        typeof (item as RuntimeCategory).query === 'string',
    )
    .map((item) => ({
      name: item.name,
      type: item.type,
      query: item.query,
    }));
}

type RuntimeConfigInput = Partial<Record<keyof RuntimeConfig, unknown>>;

export function getRuntimeConfig(): RuntimeConfig {
  const raw: RuntimeConfigInput =
    typeof window !== 'undefined'
      ? window.RUNTIME_CONFIG || {}
      : {
          STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE,
          DOUBAN_PROXY_TYPE: process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE,
          DOUBAN_PROXY: process.env.NEXT_PUBLIC_DOUBAN_PROXY,
          DOUBAN_IMAGE_PROXY_TYPE:
            process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE,
          DOUBAN_IMAGE_PROXY: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY,
          DISABLE_YELLOW_FILTER:
            process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
          CUSTOM_CATEGORIES: [],
          FLUID_SEARCH: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
        };

  return {
    STORAGE_TYPE: toStorageType(raw.STORAGE_TYPE),
    DOUBAN_PROXY_TYPE: toDoubanProxyType(raw.DOUBAN_PROXY_TYPE),
    DOUBAN_PROXY: toStringValue(
      raw.DOUBAN_PROXY,
      DEFAULT_RUNTIME_CONFIG.DOUBAN_PROXY,
    ),
    DOUBAN_IMAGE_PROXY_TYPE: toDoubanImageProxyType(
      raw.DOUBAN_IMAGE_PROXY_TYPE,
    ),
    DOUBAN_IMAGE_PROXY: toStringValue(
      raw.DOUBAN_IMAGE_PROXY,
      DEFAULT_RUNTIME_CONFIG.DOUBAN_IMAGE_PROXY,
    ),
    DISABLE_YELLOW_FILTER: toBooleanValue(
      raw.DISABLE_YELLOW_FILTER,
      DEFAULT_RUNTIME_CONFIG.DISABLE_YELLOW_FILTER,
    ),
    CUSTOM_CATEGORIES: toCategories(raw.CUSTOM_CATEGORIES),
    FLUID_SEARCH: toBooleanValue(
      raw.FLUID_SEARCH,
      DEFAULT_RUNTIME_CONFIG.FLUID_SEARCH,
    ),
  };
}

export function getStorageType(): StorageType {
  return getRuntimeConfig().STORAGE_TYPE;
}
