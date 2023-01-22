import * as geojson from "geojson";
import { GeoJSON } from "geojson";

export interface IGeoJsonData {
  countries?: GeoJSON;
  japan?: GeoJSON;
  japanWithSubAreas?: GeoJSON;
}

export interface IFetchGeoJsonConfig {
  countries?: boolean;
  japan?: boolean;
  japanWithSubAreas?: boolean;
}

export interface IAreaColor {
  colors: Record<string, string>;
  areas: string[];
}

export interface IGeoJsonFeature extends geojson.Feature {
  type: string;
  properties: Record<string, string>;
  geometry: any;
}
