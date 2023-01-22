/* eslint-disable camelcase */
import { IIntensities } from "@/interfaces/parsing/Intensities";

export interface IHypocenter {
  depth: string;
  latitude: number;
  longitude: number;
  name: string;
}

interface ITsunamiComments {
  domestic: string;
  foreign: string;
}

export interface IQuakeInfo {
  area_intensity: IIntensities;
  hypocenter: IHypocenter;
  magnitude: string;
  max_intensity: string;
  occur_time: string;
  receive_time: string;
  tsunami_comments: ITsunamiComments;
  type: string;
}
