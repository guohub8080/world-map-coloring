/**
 * 延迟落盘的 localStorage storage（对应 jotai 的 SyncStorage）
 *
 * 背景：atomWithStorage 默认每次 setState 都同步写 localStorage，
 * 选色器拖动等高频更新下会卡顿。
 *
 * 策略：
 * - 读：同步读 localStorage（首屏无闪烁、无 Suspense）
 * - 写：debounce（trailing）—— 连续写只在「停顿 DEBOUNCE_MS 后」真正落盘一次；
 *   中途状态照常在内存中更新，UI 完全流畅
 * - 页面关闭前强制 flush，避免最后一条更新丢失
 *
 * 说明：这里直接手写 SyncStorage<Value> 形状（带 JSON 序列化），
 * 而非用 createJSONStorage——后者泛型 Value 会推断成 unknown，
 * 导致 atomWithStorage 的重载误判为异步存储。
 */

import type { WritableAtom } from "jotai/vanilla";

// SyncStorage<Value> 的最小形状（与 jotai 内置类型一致）
export interface SyncStorage<Value> {
  getItem: (key: string, initialValue: Value) => Value;
  setItem: (key: string, newValue: Value) => void;
  removeItem: (key: string) => void;
  subscribe?: (key: string, callback: (value: Value) => void, initialValue: Value) => (() => void) | undefined;
}

const DEBOUNCE_MS = 400;

// 按 key 隔离的 debounce 定时器（不同 atom 互不干扰）
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// 待落盘的最新值缓存（用于卸载时 flush）
const pending = new Map<string, string>();

function flushKey(key: string, value: string) {
  const t = timers.get(key);
  if (t) {
    clearTimeout(t);
    timers.delete(key);
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 配额满 / 隐私模式：静默忽略 */
  }
}

/** 页面关闭/隐藏前强制落盘所有待写值，防止丢失最后一次更新 */
function flushAll() {
  for (const [key, value] of pending) flushKey(key, value);
  pending.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

/**
 * 传给 atomWithStorage 第 3 参数的节流 JSON storage（同步语义）。
 * 用工厂函数确保每个 Value 类型独立，避免 unknown 回退。
 */
export function createDebouncedStorage<Value>(): SyncStorage<Value> {
  return {
    getItem(key: string, initialValue: Value): Value {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return initialValue;
        return JSON.parse(raw) as Value;
      } catch {
        return initialValue;
      }
    },
    setItem(key: string, newValue: Value): void {
      let serialized: string;
      try {
        serialized = JSON.stringify(newValue);
      } catch {
        return; // 含循环引用等不可序列化的值：放弃落盘
      }
      pending.set(key, serialized);
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        timers.delete(key);
        try {
          localStorage.setItem(key, serialized);
        } catch {
          /* 忽略 */
        }
        pending.delete(key);
      }, DEBOUNCE_MS);
      timers.set(key, t);
    },
    removeItem(key: string): void {
      const t = timers.get(key);
      if (t) {
        clearTimeout(t);
        timers.delete(key);
      }
      pending.delete(key);
      try {
        localStorage.removeItem(key);
      } catch {
        /* 忽略 */
      }
    },
  };
}

// 保留默认导出给既有调用：用 unknown 兜底（每个 atom 应改用 createDebouncedStorage<T>()）
export const debouncedStorage = createDebouncedStorage<unknown>();

// 仅用于让 WritableAtom 类型被引用，避免某些打包配置下 unused 报错
export type { WritableAtom };
