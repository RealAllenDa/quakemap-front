import { defineStore } from "pinia";
import type { GeoJSON } from "geojson";

interface State {
  countries?: GeoJSON;
  japan?: GeoJSON;
  japanWithSubAreas?: GeoJSON;
  japanAreaLine?: GeoJSON;
  tsunamiAreas?: GeoJSON;
  tsunamiJapan?: GeoJSON;
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
    setJapanAreaLineGeoJson(geojson: GeoJSON) {
      this.japanAreaLine = geojson;
      Object.freeze(this.japanAreaLine);
    },
    setTsunamiAreasGeoJson(geojson: GeoJSON) {
      this.tsunamiAreas = geojson;
      Object.freeze(this.tsunamiAreas);
    },
    setTsunamiJapanGeoJson(geojson: GeoJSON) {
      this.tsunamiJapan = geojson;
      Object.freeze(this.tsunamiJapan);
    },
  },
});
