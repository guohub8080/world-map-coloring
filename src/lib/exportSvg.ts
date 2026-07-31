import { geoPath } from "d3-geo";
import { worldFeatureCollection, dashFeatures } from "./worldData";
import { getProjection } from "./projections";

interface ExportOptions {
  fills: Record<string, string>;
  projectionId: string;
  centerLon: number;
  centerLat?: number;
  defaultColor: string;
  borderColor: string;
  borderWidth: number;
  seaColor: string;
  title?: string;
  showLegend?: boolean;
  /** 导出画布的 viewBox 尺寸（生成 viewBox="0 0 w h"），默认 1600×900 */
  width?: number;
  height?: number;
  /** 地图内容四周留白（viewBox 单位），默认 10 */
  padding?: number;
}

export function buildSvgString(opts: ExportOptions): string {
  const {
    fills, projectionId, centerLon, centerLat = 0,
    defaultColor, borderColor, borderWidth, seaColor, title, showLegend,
    width = 1600, height = 900, padding = 10,
  } = opts;
  // 地图区域按用户设定的 viewBox 尺寸渲染；标题/图例等附加元素向底部扩展
  const W = Math.max(100, Math.round(width));
  const mapH = Math.max(100, Math.round(height));
  const pad = Math.min(Math.max(0, padding), Math.min(W, mapH) / 2 - 1);
  const features = worldFeatureCollection.features;
  const legendRows = showLegend ? Object.keys(fills).length : 0;
  const legendH = legendRows > 0 ? 40 + legendRows * 26 + 16 : 0;
  const H = mapH + legendH + (title ? 70 : 0);
  const offsetY = title ? 70 : 0;

  const projection = getProjection(projectionId).create(centerLon, centerLat).fitExtent(
    [[pad, pad], [W - pad, mapH - pad]],
    { type: "FeatureCollection", features } as GeoJSON.FeatureCollection
  );
  const pathGen = geoPath(projection);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif">`
  );
  parts.push(`<rect width="${W}" height="${H}" fill="${seaColor}"/>`);
  if (title) {
    parts.push(
      `<text x="${W / 2}" y="44" text-anchor="middle" font-size="32" font-weight="600" fill="#1f2937">${escapeXml(title)}</text>`
    );
  }
  parts.push(`<g transform="translate(0,${offsetY})">`);
  for (const f of features) {
    const name = (f.properties as { name: string }).name;
    const d = pathGen(f);
    if (!d) continue;
    const fill = fills[name] || defaultColor;
    parts.push(
      `<path d="${d}" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}" stroke-linejoin="round"><title>${escapeXml(name)}</title></path>`
    );
  }
  // 南海十段线
  for (const f of dashFeatures) {
    const d = pathGen(f as unknown as GeoJSON.Feature);
    if (!d) continue;
    parts.push(`<path d="${d}" fill="${borderColor}" stroke="none"/>`);
  }
  parts.push(`</g>`);

  if (legendRows > 0) {
    const ly = offsetY + mapH + 16;
    parts.push(
      `<g transform="translate(40,${ly})"><rect x="-20" y="-12" width="${W - 80 + 40}" height="${legendH - 8}" rx="8" fill="#ffffff" opacity="0.85" stroke="#e5e7eb"/>`
    );
    parts.push(`<text x="0" y="14" font-size="18" font-weight="600" fill="#374151">图例</text>`);
    Object.entries(fills).forEach(([name, color], i) => {
      const y = 40 + i * 26;
      parts.push(
        `<rect x="0" y="${y - 13}" width="18" height="18" rx="3" fill="${color}" stroke="${borderColor}" stroke-width="0.5"/>`,
        `<text x="28" y="${y + 1}" font-size="15" fill="#374151">${escapeXml(name)}</text>`
      );
    });
    parts.push(`</g>`);
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
