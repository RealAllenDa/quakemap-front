/* eslint-disable camelcase */
import type { ITsunamiGeoJson } from "@/interfaces/parsing/GeoJson";
import type { Nullable } from "@/interfaces/types";

interface ITsunamiMap {
  time: Nullable<string>;
  areas: Nullable<ITsunamiGeoJson>;
}

interface ITsunamiTime {
  type: "time";
  time: string;
  timestamp: number;
}

interface ITsunamiSpecialTime {
  type: "no_time";
  time: string;
  status: number;
}

interface ITsunamiExpectationAreas {
  name: string;
  grade: string;
  height: string;
  time: ITsunamiTime | ITsunamiSpecialTime;
}

interface ITsunamiExpectation {
  receive_time: Nullable<string>;
  areas: Nullable<ITsunamiExpectationAreas[]>;
  forecast_areas: Nullable<ITsunamiExpectationAreas[]>;
  origin: Nullable<string>;
}

interface ITsunamiObservationAreas {
  name: string;
  height: string;
  time: string;
  condition: string;
  height_condition: string;
  height_is_max: boolean;
}

interface ITsunamiObservation {
  areas: Nullable<ITsunamiObservationAreas[]>;
  receive_time: Nullable<string>;
}

export interface ITsunamiInfo {
  status: string;
  status_forecast: string;
  map: Nullable<ITsunamiMap>;
  info: ITsunamiExpectation;
  watch: ITsunamiObservation;
}

export interface ITsunamiSortedResult {
  areas: ITsunamiExpectationAreas[];
  origin: string;
  receive_time: string;
}

export interface IMapLegend {
  Advisory: boolean;
  Warning: boolean;
  MajorWarning: boolean;
  Forecast: boolean;
}
