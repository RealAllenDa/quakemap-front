import { defineStore } from "pinia";
import type {
  IHypocenter,
  ITsunamiComments,
} from "@/interfaces/parsing/QuakeInfo";
import type { IBannerType } from "@/interfaces/parsing/Banner";

interface State {
  hypocenterInfo: IHypocenter;
  maximumIntensity: string;
  maximumLgIntensity: string;
  occurTime: string;
  magnitude: string;
  currentType: string;
  tsunamiCommentsDomestic: string;
  tsunamiCommentsForeign: string;
  domesticLookupTable: Record<string, IBannerType>;
  foreignLookupTable: Record<string, IBannerType>;
}

export const useEqInfoStore = defineStore("eqInfo", {
  state: (): State => ({
    hypocenterInfo: {
      name: "---",
      depth: "---",
      latitude: -999,
      longitude: -999,
    },
    maximumIntensity: "--",
    maximumLgIntensity: "",
    occurTime: "XXXX/XX/XX XX:XX",
    magnitude: "---",
    currentType: "Unknown",
    tsunamiCommentsDomestic: "Fetching",
    tsunamiCommentsForeign: "Fetching",
    domesticLookupTable: {
      Fetching: {
        text: "Fetching information...",
        className: "info-background",
      },
      Warning: {
        text: "Tsunami Warnings In Effect",
        className: "intensity-7",
      },
      None: {
        text: "No Tsunami Expected",
        className: "no-tsunami",
      },
      EEWCancelled: {
        text: "Previous Earthquake Early Warning had been cancelled",
        className: "no-tsunami",
      },
      NonEffective: {
        text: "Slight Sea-Level Changes Expected",
        className: "intensity-4",
      },
      Checking: {
        text: "Tsunami Risk Evaluating",
        className: "risk-evaluating",
      },
    },

    foreignLookupTable: {
      Fetching: {
        text: "Fetching information...",
        className: "info-background",
      },
      None: {
        text: "Foreign: No Tsunami Expected",
        className: "no-tsunami",
      },
      Checking: {
        text: "Foreign: Tsunami Risk Evaluating",
        className: "risk-evaluating",
      },
      NonEffectiveNearby: {
        text: "Foreign: Small non-effective tsunami possible near the source",
        className: "intensity-4",
      },
      WarningNearby: {
        text: "Foreign: Tsunami possible near the source",
        className: "intensity-7",
      },
      WarningPacific: {
        text: "Foreign: Tsunami possible in the Pacific Ocean",
        className: "intensity-8",
      },
      WarningNorthwestPacific: {
        text: "Foreign: Tsunami possible in the northwest Pacific Ocean",
        className: "intensity-8",
      },
      WarningPacificWide: {
        text: "Foreign: Tsunami possible in wide area of Pacific Ocean",
        className: "intensity-9",
      },
      WarningIndian: {
        text: "Foreign: Tsunami possible in the Indian Ocean",
        className: "intensity-8",
      },
      WarningIndianWide: {
        text: "Foreign: Tsunami possible in wide area of Indian Ocean",
        className: "intensity-9",
      },
      Potential: {
        text: "Foreign: In general, tsunami is possible on this scale",
        className: "intensity-7",
      },
    },
  }),
  getters: {
    tsunamiComments(state): ITsunamiComments {
      return {
        domestic: state.tsunamiCommentsDomestic,
        foreign: state.tsunamiCommentsForeign,
      };
    },
  },
  actions: {
    setHypocenter(hypocenter: IHypocenter) {
      this.hypocenterInfo = hypocenter;
      if (this.hypocenterInfo.name.search("、") > -1) {
        this.hypocenterInfo.name = this.hypocenterInfo.name.split("、")[0];
      }
    },
    setMagnitude(magnitude: string) {
      if (this.magnitude == "Over 8") {
        this.magnitude = magnitude;
      }
      if (parseFloat(magnitude) < 0 || isNaN(parseFloat(magnitude))) {
        this.magnitude = "Unknown";
      } else {
        this.magnitude = parseFloat(magnitude).toFixed(1).toString();
      }
    },
  },
});
