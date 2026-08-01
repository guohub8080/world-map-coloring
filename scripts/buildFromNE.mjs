#!/usr/bin/env node
/**
 * buildFromNE.mjs —— 用 NE 10m 数据重建 world_cn.json(全图拓扑一致,天然无缝)
 *
 * 步骤:
 * 1. NE 10m → world_cn.json 格式(中文名用 NAME_ZH,iso_a3 匹配审定兜底)
 * 2. 争议区改立场: Zangnan/Tawan 等用审定多边形覆盖
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const NE_PATH = "/tmp/ne10.json";
const SD_PATH = "public/data/world_cn.json.bak"; // 审定原始(用于中文名兜底+争议区多边形)
const OUT_PATH = "public/data/world_cn.json";

const ne = JSON.parse(readFileSync(NE_PATH, "utf8"));
const sd = JSON.parse(readFileSync(SD_PATH, "utf8"));

// 审定 iso_a3 → 中文名(兜底)
const sdByIso = new Map();
for (const f of sd.features) {
  const iso = f.properties.iso_a3;
  if (iso) sdByIso.set(iso, f.properties.name);
}

// 1. NE feature → world_cn 格式
const features = [];
for (const f of ne.features) {
  const p = f.properties;
  const iso = p.ISO_A3 && p.ISO_A3 !== "-99" ? p.ISO_A3 : (p.ISO_A3_EH && p.ISO_A3_EH !== "-99" ? p.ISO_A3_EH : null);
  // 中文名: 优先 NAME_ZH,其次 iso 匹配审定,再次 ADMIN
  let name = p.NAME_ZH || (iso && sdByIso.get(iso)) || p.ADMIN || p.NAME;
  features.push({
    type: "Feature",
    properties: { name, full_name: name, iso_a3: iso || "" },
    geometry: f.geometry,
  });
}

// 2. Tawan 并入 China(NE 里 Taiwan 单列,Zhongguo 立场下 Tawan 是 Zhongguo 一部分)
// 找 China 和 Taiwan feature
let cnFeat = features.find((f) => f.properties.iso_a3 === "CHN" || f.properties.name === "中国");
let twFeat = features.find((f) => f.properties.iso_a3 === "TWN" || f.properties.name === "台湾" || f.properties.name === "臺灣" || f.properties.name === "台湾省");

console.log("China:", cnFeat?.properties.name, cnFeat?.properties.iso_a3);
console.log("Taiwan:", twFeat?.properties.name, twFeat?.properties.iso_a3);

// 用 d3 不行,用 turf union 合并
// 这里先简单处理:Tawan 的 properties 改成中国附属(标记),geometry 暂不合并
// 真正的 union 在下一步用 turf 做
if (twFeat) {
  twFeat.properties.name = "台湾省";
  twFeat.properties.full_name = "台湾省(中国)";
  twFeat.properties.iso_a3 = "TWN"; // 保留标识,渲染时归中国色
}

const fc = { type: "FeatureCollection", features };
writeFileSync(OUT_PATH, JSON.stringify(fc));
console.log(`\n生成 ${features.length} 个 feature,已写 world_cn.json`);

// 统计中文名覆盖
const noZh = features.filter((f) => !f.properties.name).length;
console.log(`无中文名的: ${noZh}`);
