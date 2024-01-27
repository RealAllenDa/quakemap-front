import { defineStore } from "pinia";
import type { IIconConfig } from "@/interfaces/parsing/Intensities";

interface State {
  intensityConversion: Record<string, IIconConfig>;
  intensityColors: Record<string, string>;
}

export const useIntensityStore = defineStore("intensity", {
  state: (): State => ({
    intensityConversion: {
      "0": {
        class: "unknown",
        html: "?",
        zIndex: 0,
      },
      "1": {
        class: "1",
        html: "1",
        zIndex: 100,
      },
      "2": {
        class: "2",
        html: "2",
        zIndex: 200,
      },
      "3": {
        class: "3",
        html: "3",
        zIndex: 300,
      },
      "4": {
        class: "4",
        html: "4",
        zIndex: 400,
      },
      "5-": {
        class: "5",
        html: "5<div class='intensity-add'>-</div>",
        zIndex: 500,
      },
      "5+": {
        class: "6",
        html: "5<div class='intensity-add'>+</div>",
        zIndex: 600,
      },
      "6-": {
        class: "7",
        html: "6<div class='intensity-add'>-</div>",
        zIndex: 700,
      },
      "6+": {
        class: "8",
        html: "6<div class='intensity-add'>+</div>",
        zIndex: 800,
      },
      "7": {
        class: "9",
        html: "7",
        zIndex: 900,
      },
      "5?": {
        class: "5_and_up",
        html: "5<div class='intensity-add'>↑</div>",
        zIndex: 450,
        specialIntensity: true,
      },
    },
    intensityColors: {
      "0": "#666666",
      "1": "#46646E",
      "2": "#1E6EE6",
      "3": "#00C8C8",
      "4": "#FAFA64",
      "5-": "#FFB400",
      "5+": "#FF7800",
      "5?": "#FFFF00",
      "6-": "#E60000",
      "6+": "#A00000",
      "7": "#960096",
    },
  }),
});
