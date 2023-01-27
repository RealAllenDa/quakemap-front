/* eslint-disable camelcase */
import { _IIntensityAreas } from "@/interfaces/parsing/Intensities";
import { IHypocenter } from "@/interfaces/parsing/QuakeInfo";

interface IEEWAreaIntensity extends _IIntensityAreas {
  area_code: number;
  detail_intensity: number;
  sub_area_code: number;
}

interface IEEWAreaColoring {
  areas: Record<string, _IIntensityAreas>;
  recommended_areas: boolean;
}

export interface IEEW {
  area_coloring: IEEWAreaColoring;
  area_intensity: Record<string, IEEWAreaIntensity>;
  hypocenter: IHypocenter;
  is_cancel: boolean;
  is_final: boolean;
  is_plum: boolean;
  is_test: boolean;
  magnitude: string;
  max_intensity: string;
  p_wave: number | null;
  s_wave: number | null;
  report_flag: string;
  report_id: string;
  report_num: string;
  report_time: string;
  report_timestamp: number;
  occur_timestamp: number;
  status: number;
  type: string;
}
