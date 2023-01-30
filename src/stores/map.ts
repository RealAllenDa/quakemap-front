import { defineStore } from "pinia";

interface State {
  mapOptions: object;
  countriesBgStyle: object;
  japanBgStyle: object;
  japanAreaBorderStyle: object;
  japanBorderStyle: object;
  sWaveCircleStyle: object;
  pWaveCircleStyle: object;
  tsunamiMapJapanStyle: object;
  tsunamiMapOkinawaStyle: object;
  tsunamiMapOgasawaraStyle: object;
  tsunamiJapanGeoJsonStyle: object;
  japanAreaLineGeoJsonStyle: object;
}

export const useMapStore = defineStore("map", {
  state: (): State => ({
    mapOptions: {
      zoomControl: false,
      zoomSnap: 0.01,
      zoomDelta: 0.5,
      maxZoom: 8,
      minZoom: 2,
    },

    countriesBgStyle: {
      stroke: true,
      fill: true,
      fillColor: "#3a3a3a",
      fillOpacity: 1,
      weight: 1,
      color: "#3a3a3a",
    },

    japanBgStyle: {
      stroke: false,
      fill: true,
      fillColor: "#3a3a3a",
      fillOpacity: 1,
    },

    japanAreaBorderStyle: {
      stroke: true,
      fill: false,
      color: "#565656",
      weight: 0.5,
    },

    japanBorderStyle: {
      stroke: true,
      fill: false,
      color: "#838383",
      weight: 0.5,
    },

    sWaveCircleStyle: {
      color: "#E65A5A",
      weight: 2,
      opacity: 1,
      fillColor: "#E65A5A",
      fillOpacity: 0.2,
      pane: "popupPane",
    },

    pWaveCircleStyle: {
      color: "#50A0FA",
      weight: 2,
      opacity: 1,
      fill: false,
      pane: "popupPane",
    },

    tsunamiMapJapanStyle: {
      zoomControl: false,
      center: {
        lat: 38.426610210705135,
        lng: 138.42138499239283,
      },
      attributionControl: false,
      maxZoom: 8,
      minZoom: 2,
      zoomSnap: 0.01,
      zoomDelta: 0.01,
      zoom: 5.1,
    },

    tsunamiMapOkinawaStyle: {
      zoomControl: false,
      center: {
        lat: 26.674949874061767,
        lng: 127.24804714322093,
      },
      zoom: 5,
      attributionControl: false,
      maxZoom: 8,
      minZoom: 2,
      zoomSnap: 0.01,
      zoomDelta: 0.5,
    },

    tsunamiMapOgasawaraStyle: {
      zoomControl: false,
      center: [26.91439669619432, 142.14703272013634],
      zoom: 7.57,
      attributionControl: false,
      maxZoom: 8,
      minZoom: 2,
      zoomSnap: 0.01,
      zoomDelta: 0.5,
    },

    tsunamiJapanGeoJsonStyle: {
      weight: 0,
      stroke: false,
      fillColor: "#5e5e5e",
      fillOpacity: 1,
      fill: true,
    },

    japanAreaLineGeoJsonStyle: {
      stroke: true,
      fill: false,
      color: "#000000",
      weight: 0.5,
    },
  }),
});
