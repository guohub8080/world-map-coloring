import { geoArea } from "d3-geo";
import rewind from "@turf/rewind";
import worldData from "../assets/world_cn.json";
import dashData from "../assets/dashline.json";

/**
 * 底图数据说明（详见 src/assets/README.md）：
 *
 * world_cn.json 不是单一来源数据，而是两份公开数据拼合 + 几何处理的产物：
 *
 * 1. 中国部分（唯一权威基准）：
 *    阿里 DataV · GeoAtlas 100000_full（中国全图）GeoJSON，
 *    带自然资源部审图号 GS京(2022)1061 号（审定标准画法），GCJ-02 已转 WGS84。
 *    1 个中国 feature（MultiPolygon，252 个子多边形），含台湾、藏南、
 *    钓鱼岛/赤尾屿、南海诸岛、黑瞎子岛等。
 *
 * 2. 其他国家/地区：Natural Earth（公有领域），仅负责"中国以外的世界"，
 *    其原始画法不符合中国立场之处（藏南归印度、科索沃独立等）已被修正。
 *
 * 3. 构建期几何处理（关键）：
 *    以中国多边形为基准，其他所有国家均执行 difference（该国 − 中国），
 *    中国审定边界内的区域已从别国挖除；科索沃并入塞尔维亚、索马里兰并入
 *    索马里、北塞浦路斯并入塞浦路斯。处理后各 feature 两两无重叠，
 *    中国∩印度、中国∩不丹交集面积为 0，主权归属在数据层固定。
 *
 * 4. dashline.json：南海十段线，来源同中国部分，独立渲染。
 */

export interface CountryFeature {
  type: "Feature";
  properties: {
    name: string;
    full_name?: string;
    iso_a3?: string;
  };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

function ringArea(coords: number[][][]): number {
  return geoArea({
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: coords },
  } as GeoJSON.Feature);
}
function flipWinding(f: CountryFeature) {
  const flipRing = (ring: number[][]) => ring.reverse();
  if (f.geometry.type === "Polygon") {
    (f.geometry.coordinates as number[][][]).forEach(flipRing);
  } else {
    (f.geometry.coordinates as number[][][][]).forEach((poly) => poly.forEach(flipRing));
  }
}
function prepare(fc: GeoJSON.FeatureCollection): CountryFeature[] {
  // d3-geo 采用球面多边形约定（外环顺时针），先按 RFC 7946 修正环绕方向
  const rewound = rewind(fc, { reverse: true }) as unknown as { features: CountryFeature[] };
  for (const f of rewound.features) {
    // 剔除覆盖整个球面的退化子多边形
    if (f.geometry.type === "MultiPolygon") {
      f.geometry.coordinates = (f.geometry.coordinates as number[][][][]).filter(
        (poly) => ringArea(poly) <= 2 * Math.PI
      ) as never;
    }
    // 球面反向的要素二次校正
    if (geoArea(f as unknown as GeoJSON.Feature) > 2 * Math.PI) flipWinding(f);
  }
  return rewound.features;
}

export const worldFeatures = prepare(worldData as unknown as GeoJSON.FeatureCollection);
export const dashFeatures = prepare(dashData as unknown as GeoJSON.FeatureCollection);

export const worldFeatureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: worldFeatures as unknown as GeoJSON.Feature[],
};
