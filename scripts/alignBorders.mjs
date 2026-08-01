#!/usr/bin/env node
/**
 * alignBorders.mjs —— 邻国边界缝合(重写版,不破坏拓扑)
 *
 * 核心改进:
 * 1. 不用 splice 原地修改,而是构建全新环数组后整体替换
 * 2. 地理范围保护:只处理 Zhongguo 周边(经60-140 纬0-55)的点,排除远离的第三国
 * 3. 闭合性保证:新环首尾点相同
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "public", "data", "world_cn.json");
const BAK_PATH = DATA_PATH + ".bak";

const COINCIDE = 0.02;
const OFF_MAX = 0.7;
const MIN_GAP = 2;
const LON_MIN = 60, LON_MAX = 140, LAT_MIN = 0, LAT_MAX = 55;

function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

function projectToRing(pt, ring) {
  let best = { pt: [ring[0][0], ring[0][1]], seg: 0, d: 1e9 };
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / l2));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(pt[0] - cx, pt[1] - cy);
    if (d < best.d) best = { pt: [cx, cy], seg: i, d };
  }
  return best;
}

function inChinaRegion(pt) {
  return pt[0] >= LON_MIN && pt[0] <= LON_MAX && pt[1] >= LAT_MIN && pt[1] <= LAT_MAX;
}

function sewRing(cnRing, nbRing) {
  const cnN = cnRing.length;
  if (!nbRing.some((p) => inChinaRegion(p))) return null;

  const proj = nbRing.map((p) => projectToRing(p, cnRing));
  const coincident = proj.map((p) => p.d < COINCIDE);

  const gaps = [];
  let i = 0;
  while (i < nbRing.length) {
    if (!coincident[i] && proj[i].d < OFF_MAX) {
      let j = i;
      while (j < nbRing.length && !coincident[j] && proj[j].d < OFF_MAX) j++;
      const leftAnchor = i > 0 && coincident[i - 1];
      const rightAnchor = j < nbRing.length && coincident[j];
      if (j - i >= MIN_GAP && leftAnchor && rightAnchor) gaps.push([i, j - 1]);
      i = j;
    } else i++;
  }
  if (gaps.length === 0) return null;

  const newRing = [];
  let k = 0;
  while (k < nbRing.length) {
    const gap = gaps.find(([s, e]) => k >= s && k <= e);
    if (gap) {
      const [s, e] = gap;
      const aSeg = proj[s - 1].seg;
      const bSeg = proj[e + 1].seg;
      const fwd = (bSeg - aSeg + cnN) % cnN;
      const bwd = (aSeg - bSeg + cnN) % cnN;
      const arcLen = Math.min(fwd, bwd);
      // 防膨胀:弧顶点数不超过偏离段原点数的5倍
      const maxArc = (e - s + 1) * 5 + 10;
      if (arcLen > 1 && arcLen <= maxArc) {
        const useFwd = fwd <= bwd;
        const steps = Math.min(arcLen, maxArc);
        for (let m = 1; m < steps; m++) {
          const idx = useFwd ? (aSeg + m) % cnN : (aSeg - m + cnN) % cnN;
          newRing.push([cnRing[idx][0], cnRing[idx][1]]);
        }
      } else {
        // 弧太长(防膨胀)或太短:用投影点
        for (let m = s; m <= e; m++) newRing.push(proj[m].pt);
      }
      k = e + 1;
    } else {
      newRing.push([nbRing[k][0], nbRing[k][1]]);
      k++;
    }
  }
  if (newRing.length > 0 && (newRing[0][0] !== newRing[newRing.length - 1][0] || newRing[0][1] !== newRing[newRing.length - 1][1])) {
    newRing.push([newRing[0][0], newRing[0][1]]);
  }
  return newRing;
}

function main() {
  if (!existsSync(DATA_PATH)) { console.error("找不到 " + DATA_PATH); process.exit(1); }
  if (!existsSync(BAK_PATH)) { copyFileSync(DATA_PATH, BAK_PATH); console.log("已备份 → world_cn.json.bak"); }
  const fc = JSON.parse(readFileSync(BAK_PATH, "utf8"));
  const byName = new Map(fc.features.map((f) => [f.properties.name, f]));
  const cn = byName.get("中国");
  if (!cn) { console.error("找不到中国"); process.exit(1); }
  const cnRing0 = cn.geometry.coordinates[0][0];

  const targets = [
    "哈萨克斯坦", "俄罗斯", "蒙古", "朝鲜",
    "印度", "不丹", "尼泊尔", "缅甸", "越南", "老挝",
    "吉尔吉斯斯坦", "塔吉克斯坦", "阿富汗", "巴基斯坦",
    "锡亚琴冰川",
  ];
  for (const name of targets) {
    const f = byName.get(name);
    if (!f) { console.warn(`  跳过:无${name}`); continue; }
    let count = 0;
    if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates) {
        for (let ri = 0; ri < poly.length; ri++) {
          const result = sewRing(cnRing0, poly[ri]);
          if (result) { poly[ri] = result; count++; }
        }
      }
    } else if (f.geometry.type === "Polygon") {
      const result = sewRing(cnRing0, f.geometry.coordinates[0]);
      if (result) { f.geometry.coordinates[0] = result; count++; }
    }
    console.log(`${name}: 缝合 ${count} 处${count === 0 ? "(无)" : ""}`);
  }

  writeFileSync(DATA_PATH, JSON.stringify(fc));
  console.log("\n完成,已写回 world_cn.json");
}

main();
