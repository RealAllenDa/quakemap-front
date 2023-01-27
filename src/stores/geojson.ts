import { defineStore } from "pinia";
import type { GeoJSON } from "geojson";

interface State {
  countries?: GeoJSON;
  japan?: GeoJSON;
  japanWithSubAreas?: GeoJSON;
}

export const useGeoJsonStore = defineStore("geojson", {
  state: (): State => ({}),
  actions: {
    setCountriesGeoJson(geojson: GeoJSON) {
      this.countries = geojson;
      Object.freeze(this.countries);
    },
    setJapanGeoJson(geojson: GeoJSON) {
      this.japan = geojson;
      Object.freeze(this.japan);
    },
    setJapanSubAreasGeoJson(geojson: GeoJSON) {
      this.japanWithSubAreas = geojson;
      Object.freeze(this.japanWithSubAreas);
    },
  },
});
