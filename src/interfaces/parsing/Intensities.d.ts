/* eslint-disable camelcase */
import { IEEWAreaIntensity } from "@/interfaces/parsing/EEW";

interface _IIntensityAreas {
  name: string;
  intensity: string;
  latitude: number;
  longitude: number;
  is_area: boolean;
  intensity_code?: number;
}

interface _IIntensityStations extends _IIntensityAreas {
  region_code: number;
  region_name: string;
}

export interface IIntensities {
  areas: Record<string, _IIntensityAreas>;
  station: Record<string, _IIntensityStations>;
}

export interface IIconConfig {
  class: string;
  html: string;
  zIndex: number;
  specialIntensity?: boolean;
}

export type AllStationIntensities = Record<string, _IIntensityStations>;

export type AllAreaIntensities =
  | Record<string, _IIntensityAreas>
  | Record<string, IEEWAreaIntensity>;
