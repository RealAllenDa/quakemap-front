import { IQuakeInfo } from "@/interfaces/parsing/QuakeInfo";
import { IEEW } from "@/interfaces/parsing/EEW";

export interface IInfo {
  eew: IEEW;
  info: IQuakeInfo[];
}

export interface IInfoMocked extends IInfo {
  eew?: IEEW;
}
