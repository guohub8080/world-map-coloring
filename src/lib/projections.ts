import {
  geoNaturalEarth1,
  geoMercator,
  geoEquirectangular,
  geoAzimuthalEquidistant,
  geoEqualEarth,
  geoConicEquidistant,
} from "d3-geo";
import { geoRobinson, geoAiry } from "d3-geo-projection";
import type { GeoProjection } from "d3-geo";

export interface ProjectionDef {
  id: string;
  label: string;
  /** centerLon/centerLat: 中心经纬度；返回已设置好中心旋转的投影 */
  create: (centerLon: number, centerLat?: number) => GeoProjection;
}

/**
 * 投影方案说明：
 * - 形变只来自投影算法本身（墨卡托的高纬度拉伸、圆锥的弧线等均为固有性质）；
 * - 中心经纬度通过 rotate([-lon, -lat]) 做球面旋转：先旋转球体、再投影，
 *   因此任何投影在任意中心下都不会因旋转产生额外撕裂；
 * - 圆锥等距：中心纬度作为投影中心，标准纬线自动取 中心纬度 ±20°（夹取 ±80°）；
 * - 所有投影均支持中心经度（-180~180）与中心纬度（-80~80）动态调整。
 */

const clampLat = (v: number) => Math.min(80, Math.max(-80, v));

export const PROJECTIONS: ProjectionDef[] = [
  { id: "natural-earth", label: "自然地球（球形）", create: (c, la = 0) => geoNaturalEarth1().rotate([-c, -la]) },
  { id: "mercator", label: "墨卡托（网络地图）", create: (c, la = 0) => geoMercator().rotate([-c, -la]) },
  { id: "equirectangular", label: "等距圆柱（矩形）", create: (c, la = 0) => geoEquirectangular().rotate([-c, -la]) },
  { id: "robinson", label: "罗宾逊（均衡）", create: (c, la = 0) => geoRobinson().rotate([-c, -la]) },
  { id: "equal-earth", label: "等积地球（面积真实）", create: (c, la = 0) => geoEqualEarth().rotate([-c, -la]) },
  {
    id: "conic",
    label: "圆锥等距",
    // 圆锥投影：中心纬度作为投影中心，标准纬线取中心纬度 ±20°（夹取到 ±80°）
    create: (c, la = 30) => {
      const lat = clampLat(la);
      return geoConicEquidistant()
        .rotate([-c, 0])
        .center([0, lat])
        .parallels([clampLat(lat - 20), clampLat(lat + 20)]);
    },
  },
  { id: "azimuthal", label: "方位等距", create: (c, la = 35) => geoAzimuthalEquidistant().rotate([-c, -la]) },
  { id: "airy", label: "艾里", create: (c, la = 35) => geoAiry().rotate([-c, -la]) },
];

export function getProjection(id: string): ProjectionDef {
  return PROJECTIONS.find((p) => p.id === id) || PROJECTIONS[0];
}

/** 常用中心经度快捷选项 */
export const CENTER_PRESETS = [
  { label: "本初子午线（0°）", value: 0 },
  { label: "中国居中（105°E）", value: 105 },
  { label: "太平洋居中（150°E）", value: 150 },
  { label: "美洲居中（90°W）", value: -90 },
];
