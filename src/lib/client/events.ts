'use client';

export type CacheUpdateEvent =
  | 'playRecordsUpdated'
  | 'favoritesUpdated'
  | 'searchHistoryUpdated'
  | 'skipConfigsUpdated';

// 全局错误触发函数
export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', {
        detail: { message },
      }),
    );
  }
}

/**
 * 用于 React 组件监听数据更新的事件监听器
 * 使用方法：
 *
 * useEffect(() => {
 *   const unsubscribe = subscribeToDataUpdates('playRecordsUpdated', (data) => {
 *     setPlayRecords(data);
 *   });
 *   return unsubscribe;
 * }, []);
 */
export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleUpdate = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener(eventType, handleUpdate as EventListener);

  return () => {
    window.removeEventListener(eventType, handleUpdate as EventListener);
  };
}
