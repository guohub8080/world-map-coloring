import { worldFeatures } from "./worldData";

/**
 * 填色数据导入/导出
 *
 * 键可以是中文名，也可以是 ISO 3166-1 alpha-3 代码（CHN / USA / JPN…）
 * 或 alpha-2 代码（CN / US / JP…），自动识别，消除重名/语言歧义。
 *
 * 颜色支持任意 CSS 值：#RGB / #RRGGBB / #RRGGBBAA / rgb() / rgba() / hsl() 等。
 */

// 建立代码 → 中文名 的查找表（惰性构建：数据异步加载后首次调用时填充）
const CODE_TO_NAME: Record<string, string> = {};
const NAME_SET = new Set<string>();
let lookupBuilt = false;
function ensureLookup() {
  if (lookupBuilt) return;
  lookupBuilt = true;
  for (const f of worldFeatures) {
    const { name, iso_a3 } = f.properties as { name: string; iso_a3?: string; iso_a2?: string };
    const iso_a2 = (f.properties as { iso_a2?: string }).iso_a2;
    NAME_SET.add(name);
    if (iso_a3) CODE_TO_NAME[iso_a3.toUpperCase()] = name;
    if (iso_a2) CODE_TO_NAME[iso_a2.toUpperCase()] = name;
  }
}

/** 将键（中文名 / ISO a3 / ISO a2）解析为数据内的国家中文名；未匹配返回 null */
export function resolveCountryKey(key: string): string | null {
  ensureLookup();
  const k = key.trim();
  if (!k) return null;
  if (NAME_SET.has(k)) return k;
  const byCode = CODE_TO_NAME[k.toUpperCase()];
  if (byCode) return byCode;
  return null;
}

/** 校验并规范化一个颜色值；非法返回 null */
export function normalizeColor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const el = document.createElement("span");
  el.style.color = "";
  el.style.color = s;
  return el.style.color ? s : null;
}

export interface ParseResult {
  fills: Record<string, string>;
  errors: string[];
}

/** 解析导入的 JSON 文本为 fills（键支持中文名或 ISO 代码） */
export function parseFillsJson(text: string): ParseResult {
  const errors: string[] = [];
  const fills: Record<string, string> = {};
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { fills, errors: ["JSON 解析失败，请检查格式"] };
  }

  const entries: [string, unknown][] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const key = o.name ?? o.iso ?? o.iso_a3 ?? o.code;
        if (key != null) entries.push([String(key), o.color]);
        else errors.push(`数组项缺少 name/iso 字段: ${JSON.stringify(item).slice(0, 60)}`);
      } else {
        errors.push(`数组项格式无效: ${JSON.stringify(item).slice(0, 60)}`);
      }
    }
  } else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) entries.push([k, v]);
  } else {
    return { fills, errors: ["顶层必须是对象或数组"] };
  }

  for (const [rawKey, colorRaw] of entries) {
    const name = resolveCountryKey(rawKey);
    if (!name) {
      errors.push(`未识别的国家/代码: 「${rawKey}」`);
      continue;
    }
    const color = normalizeColor(colorRaw);
    if (color) {
      fills[name] = color;
    } else {
      errors.push(`「${rawKey}」颜色值无效: ${String(colorRaw)}`);
    }
  }
  return { fills, errors };
}

/** 将 fills 转为 ISO-3 键对象（保持键序稳定） */
export function fillsToIsoObject(fills: Record<string, string>): Record<string, string> {
  const nameToIso: Record<string, string> = {};
  for (const f of worldFeatures) {
    const p = f.properties as { name: string; iso_a3?: string };
    if (p.iso_a3) nameToIso[p.name] = p.iso_a3;
  }
  const out: Record<string, string> = {};
  for (const [name, color] of Object.entries(fills)) {
    out[nameToIso[name] || name] = color;
  }
  return out;
}

/** 导出为 ISO alpha-3 代码为键的 JSON（无歧义） */
export function fillsToIsoJson(fills: Record<string, string>): string {
  const nameToIso: Record<string, string> = {};
  for (const f of worldFeatures) {
    const p = f.properties as { name: string; iso_a3?: string };
    if (p.iso_a3) nameToIso[p.name] = p.iso_a3;
  }
  const out: Record<string, string> = {};
  for (const [name, color] of Object.entries(fills)) {
    out[nameToIso[name] || name] = color;
  }
  return JSON.stringify(out, null, 2);
}

/** 导出当前 fills 为格式化 JSON（中文名键） */
export function fillsToJson(fills: Record<string, string>): string {
  return JSON.stringify(fills, null, 2);
}

export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
