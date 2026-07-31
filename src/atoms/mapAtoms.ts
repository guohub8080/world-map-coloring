import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { worldFeatures } from "../lib/worldData";
import { createDebouncedStorage } from "../lib/debouncedStorage";

// 所有持久化 atom 统一用节流 storage：读同步（无闪烁），写 debounce（高频拖动不卡）
// getOnInit:true 让首屏直接用 localStorage 值初始化，避免闪烁
// 每个类型单独建 storage 实例，确保 atomWithStorage 重载走「同步」分支
const Fills = createDebouncedStorage<Record<string, string>>();
const Str = createDebouncedStorage<string>();
const Num = createDebouncedStorage<number>();
const Bool = createDebouncedStorage<boolean>();
const ON_INIT = { getOnInit: true } as const;

/** 填色状态：内部以国家中文名为键（与数据要素对应） */
export const fillsAtom = atomWithStorage<Record<string, string>>("wmf:fills", {}, Fills, ON_INIT);

/** 撤销历史（不持久化） */
export const historyAtom = atom<Record<string, string>[]>([]);

/** 当前画笔颜色 */
export const currentColorAtom = atomWithStorage<string>("wmf:color", "#3b82f6", Str, ON_INIT);

/** 橡皮擦模式 */
export const eraserAtom = atom<boolean>(false);

/** 投影 */
export const projectionIdAtom = atomWithStorage<string>("wmf:projection", "natural-earth", Str, ON_INIT);

/** 中心经度 */
export const centerLonAtom = atomWithStorage<number>("wmf:center", 105, Num, ON_INIT);

/** 中心纬度（投影旋转/中心；圆锥投影同时联动标准纬线） */
export const centerLatAtom = atomWithStorage<number>("wmf:centerlat", 0, Num, ON_INIT);

/** 重置中心经纬度（105°E / 0°） */
export const resetCenterAtom = atom(null, (_get, set) => {
  set(centerLonAtom, 105);
  set(centerLatAtom, 0);
});

/** 地图标题 */
export const mapTitleAtom = atomWithStorage<string>("wmf:title", "", Str, ON_INIT);

/** 导出是否含图例 */
export const withLegendAtom = atomWithStorage<boolean>("wmf:legend", true, Bool, ON_INIT);

/** 导出 SVG 的 viewBox 尺寸（最终生成 viewBox="0 0 w h"）；屏幕上地图也按此比例显示 */
export const exportWidthAtom = atomWithStorage<number>("wmf:exportW", 1600, Num, ON_INIT);
export const exportHeightAtom = atomWithStorage<number>("wmf:exportH", 900, Num, ON_INIT);

/** 地图内容四周留白（viewBox 单位），上下左右统一 */
export const exportPaddingAtom = atomWithStorage<number>("wmf:exportPad", 10, Num, ON_INIT);

/** 样式设置 */
export const landColorAtom = atomWithStorage<string>("wmf:land", "#e8e4da", Str, ON_INIT);
export const seaColorAtom = atomWithStorage<string>("wmf:sea", "#cfe8f3", Str, ON_INIT);
export const borderColorAtom = atomWithStorage<string>("wmf:border", "#9ca3af", Str, ON_INIT);
export const borderWidthAtom = atomWithStorage<number>("wmf:borderW", 0.6, Num, ON_INIT);

/** 导入面板展开状态（不持久化） */
export const showImportAtom = atom<boolean>(false);

// ---------- 派生 ----------

/** 中文名 → ISO-3 映射表（惰性构建：数据异步加载后首次用到时填充） */
const nameToIso: Record<string, string> = {};
let nameToIsoBuilt = false;
function ensureNameToIso() {
  if (nameToIsoBuilt) return;
  nameToIsoBuilt = true;
  for (const f of worldFeatures) {
    const p = f.properties as { name: string; iso_a3?: string };
    if (p.iso_a3) nameToIso[p.name] = p.iso_a3;
  }
}

/** 当前填色的 ISO-3 键 JSON（派生，实时同步） */
export const isoJsonAtom = atom((get) => {
  ensureNameToIso();
  const fills = get(fillsAtom);
  const out: Record<string, string> = {};
  for (const [name, color] of Object.entries(fills)) {
    out[nameToIso[name] || name] = color;
  }
  return JSON.stringify(out, null, 2);
});

/** 已着色国家条目（派生） */
export const filledEntriesAtom = atom((get) => Object.entries(get(fillsAtom)));

// ---------- 操作（write-only atoms） ----------

/** 给国家填色 / 擦除 */
export const applyFillAtom = atom(null, (get, set, name: string) => {
  const fills = get(fillsAtom);
  const eraser = get(eraserAtom);
  const color = get(currentColorAtom);
  set(historyAtom, (h) => [...h, fills]);
  if (eraser) {
    if (!fills[name]) return;
    const next = { ...fills };
    delete next[name];
    set(fillsAtom, next);
  } else {
    if (fills[name] === color) return;
    set(fillsAtom, { ...fills, [name]: color });
  }
});

/** 撤销 */
export const undoAtom = atom(null, (get, set) => {
  const h = get(historyAtom);
  if (h.length === 0) return;
  set(fillsAtom, h[h.length - 1]);
  set(historyAtom, h.slice(0, -1));
});

/** 清空 */
export const clearAllAtom = atom(null, (get, set) => {
  const fills = get(fillsAtom);
  if (Object.keys(fills).length === 0) return;
  set(historyAtom, (h) => [...h, fills]);
  set(fillsAtom, {});
});

/** 移除单个国家 */
export const removeFillAtom = atom(null, (get, set, name: string) => {
  const fills = get(fillsAtom);
  if (!fills[name]) return;
  set(historyAtom, (h) => [...h, fills]);
  const next = { ...fills };
  delete next[name];
  set(fillsAtom, next);
});

/** 导入（合并/替换） */
export const importFillsAtom = atom(
  null,
  (get, set, payload: { fills: Record<string, string>; mode: "merge" | "replace" }) => {
    const fills = get(fillsAtom);
    set(historyAtom, (h) => [...h, fills]);
    set(fillsAtom, payload.mode === "replace" ? payload.fills : { ...fills, ...payload.fills });
  }
);

/** 替换全部 fills（供侧栏 JSON 编辑器回写） */
export const setFillsAtom = atom(null, (get, set, fills: Record<string, string>) => {
  set(historyAtom, (h) => [...h, get(fillsAtom)]);
  set(fillsAtom, fills);
});

/** 恢复样式默认值 */
export const resetStyleAtom = atom(null, (_get, set) => {
  set(landColorAtom, "#e8e4da");
  set(seaColorAtom, "#cfe8f3");
  set(borderColorAtom, "#9ca3af");
  set(borderWidthAtom, 0.6);
});
