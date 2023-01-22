import { defineStore } from "pinia";
import type { IBannerType } from "@/interfaces/parsing/Banner";

interface State {
  eewReportNum: string;
  eewIsDrill: boolean;
  eewIsExpected: boolean;
  eewIsPlum: boolean;
  eewType: string;
  eewAdvice: string;
  eewTypesBanner: Record<string, IBannerType>;
  eewAdviceBanner: Record<string, IBannerType>;
}

export const useEEWInfoStore = defineStore("eewInfo", {
  state: (): State => ({
    eewReportNum: "",
    eewIsDrill: false,
    eewIsExpected: false,
    eewIsPlum: false,
    eewType: "Fetching",
    eewAdvice: "Fetching",
    eewTypesBanner: {
      PLUM: {
        text:
          "PLUM determined epicenter - " + "No detailed information available",
        className: "info-background",
      },
      Forecast: {
        text: "Earthquake Early Warning (Forecast)",
        className: "info-background",
      },
      Warning: {
        text: "Earthquake Early Warning (Warning) - Strong Shaking Expected",
        className: "intensity-8",
      },
      Fetching: {
        text: "Fetching information...",
        className: "info-background",
      },
    },
    eewAdviceBanner: {
      StayAway: {
        text: "Stay away from coastal areas",
        className: "intensity-7",
      },
      PayAttention: {
        text: "Pay attention to coastal areas",
        className: "intensity-2",
      },
      Deep: {
        text: "Deep earthquake - Information may not be accurate",
        className: "deep-earthquake",
      },
      Wait: {
        text: "Wait for further information",
        className: "info-background",
      },
      Fetching: {
        text: "Fetching information...",
        className: "info-background",
      },
    },
  }),
  getters: {
    getEewType(state): IBannerType {
      return state.eewTypesBanner[state.eewType];
    },
    getEewAdvice(state): IBannerType {
      return state.eewAdviceBanner[state.eewAdvice];
    },
  },
});
