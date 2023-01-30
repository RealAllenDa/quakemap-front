import * as geojson from "geojson";

export interface IFetchGeoJsonConfig {
  countries?: boolean;
  japan?: boolean;
  japanWithSubAreas?: boolean;
  japanAreaLine?: boolean;
  tsunamiAreas?: boolean;
  tsunamiJapan?: boolean;
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

export interface ITsunamiGeoJsonFeatureProperties {
  code: string;
  name: string;
  namekana: string;
  grade?: string;
  intensity_color?: string;
}

export interface ITsunamiGeoJsonFeatures extends geojson.Feature {
  properties: ITsunamiGeoJsonFeatureProperties;
}

export interface ITsunamiGeoJson extends geojson.FeatureCollection {
  features: ITsunamiGeoJsonFeatures[];
}
