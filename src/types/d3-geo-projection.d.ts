declare module "d3-geo-projection" {
  import type { GeoProjection } from "d3-geo";
  export function geoRobinson(): GeoProjection;
  export function geoAiry(): GeoProjection;
  export function geoConicEquidistant(): GeoConicProjection;
  export function geoInterruptedHomolosine(): GeoProjection;
}
