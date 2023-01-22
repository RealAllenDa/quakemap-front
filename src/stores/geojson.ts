import { defineStore } from "pinia";
import type { IGeoJsonData } from "@/interfaces/parsing/GeoJson";
import type { GeoJSON } from "geojson";

interface State {
  geojson: IGeoJsonData;
}

export const useGeoJsonStore = defineStore("geojson", {
  state: (): State => ({
    geojson: {},
  }),
  actions: {
    setCountriesGeoJson(geojson: GeoJSON) {
      this.geojson.countries = geojson;
      Object.freeze(this.geojson.countries);
    },
    setJapanGeoJson(geojson: GeoJSON) {
      this.geojson.japan = geojson;
      Object.freeze(this.geojson.japan);
    },
    setJapanSubAreasGeoJson(geojson: GeoJSON) {
      this.geojson.japanWithSubAreas = geojson;
      Object.freeze(this.geojson.japanWithSubAreas);
    },
  },
});
