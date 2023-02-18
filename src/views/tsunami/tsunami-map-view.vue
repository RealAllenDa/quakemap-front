<template>
  <div id="main-container">
    <tsunami-map v-if="mapReady" :id="'main'" ref="mapMain"></tsunami-map>
    <div v-if="enableOgasawara" id="map-ogasawara-overlay">
      <tsunami-map
        v-if="mapReady"
        :id="'ogasawara'"
        ref="mapOgasawara"
      ></tsunami-map>
      <div id="description-ogasawara" class="description-areas">Ogasawara</div>
    </div>
    <div v-if="enableOkinawa" id="map-okinawa-overlay">
      <tsunami-map
        v-if="mapReady"
        :id="'okinawa'"
        ref="mapOkinawa"
      ></tsunami-map>
      <span id="description-okinawa" class="description-areas">Okinawa</span>
    </div>
    <tsunami-map-legends :current-grades="currentGrades"></tsunami-map-legends>
    <div id="receive-title">Received at {{ receiveTime }}</div>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref, toRaw } from "vue";
import hnapi from "@/assets/hnapi";
import type { IMapLegend, ITsunamiInfo } from "@/interfaces/api/TsunamiInfo";
import TsunamiMap from "@/components/tsunami-map/tsunami-map.vue";
import TsunamiMapLegends from "@/components/tsunami-map/tsunami-map-legends.vue";
import { isEqual } from "lodash";
import type { PathOptions } from "leaflet";
import L, { GeoJSON, LatLngBounds, Layer } from "leaflet";
import type { ITsunamiGeoJsonFeatures } from "@/interfaces/parsing/GeoJson";
import { useRoute } from "vue-router";
import { useGeoJsonStore } from "@/stores/geojson";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 3500;
const flashTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const flashOutInterval = 3000;
const flashInInterval = 3500;
const fetchType = ref("");

const mapMain = ref<InstanceType<typeof TsunamiMap>>();
const mapOkinawa = ref<InstanceType<typeof TsunamiMap>>();
const mapOgasawara = ref<InstanceType<typeof TsunamiMap>>();
const layerMain = ref<GeoJSON>();
const layerOkinawa = ref<GeoJSON>();
const layerOgasawara = ref<GeoJSON>();

const mapReady = ref(false);
const firstTime = ref(true);
const enableOkinawa = ref(true);
const enableOgasawara = ref(true);

const lastMessage = ref<ITsunamiInfo>();
const receiveTime = ref("XXXX-XX-XX XX:XX");

const japanMapLatLngBounds = L.latLngBounds([
  [30.01895937888477, 120.75209544783516],
  [45.95879780704559, 156.09067453695047],
]);
const ogasawaraLatLngBounds = L.latLngBounds([
  [20.81525687520561, 139.56552841954462],
  [31.90715387478476, 155.35768301846318],
]);

const currentGrades = ref<IMapLegend>({
  Advisory: false,
  Warning: false,
  MajorWarning: false,
  Forecast: false,
});

const tsunamiForecastAreas = ref<string[]>([]);
const boundJapan = ref<LatLngBounds>();
const displayOkinawa = ref(false);
const displayOgasawara = ref(false);

onMounted(async () => {
  const route = useRoute();
  if (route.query.type === "forecast") {
    fetchType.value = "forecast";
    currentGrades.value.Forecast = true;
  } else {
    fetchType.value = "information";
  }
  hnapi.info(`Fetching with type ${fetchType.value}`);
  await hnapi
    .initialize({
      japanAreaLine: true,
      tsunamiJapan: true,
      tsunamiAreas: true,
    })
    .then(() => {
      mapReady.value = true;
      updateInfo();
      updateTimer.value = setInterval(updateInfo, updateInterval);
    });
});
onUnmounted(() => {
  if (updateTimer.value !== null) {
    clearInterval(updateTimer.value);
  }
  if (flashTimer.value !== null) {
    clearInterval(flashTimer.value);
  }
});

function setMapFlash() {
  flashTimer.value = setInterval(() => {
    // NOTE: Another (not so) hacky way of flashing paths.
    const paths = document.querySelectorAll<HTMLElement>(".leaflet-tile-pane");
    paths.forEach((path) => {
      path.style.display = "block";
    });
    setTimeout(() => {
      paths.forEach((path) => {
        path.style.display = "none";
      });
    }, flashOutInterval);
  }, flashInInterval);
}

function deleteAllStrokes() {
  if (layerMain.value !== undefined) {
    mapMain.value!.map!.removeLayer(layerMain.value);
  }
  if (layerOkinawa.value !== undefined) {
    mapOkinawa.value!.map!.removeLayer(layerOkinawa.value);
  }
  if (layerOgasawara.value !== undefined) {
    mapOgasawara.value!.map!.removeLayer(layerOgasawara.value);
  }
}

function parseMapStyle(feature?: ITsunamiGeoJsonFeatures): PathOptions {
  if (feature === undefined) {
    return {
      stroke: false,
    };
  }
  let weight = 7;
  if (feature.properties.grade === "MajorWarning") {
    weight = 10;
  }
  return {
    stroke: true,
    color: feature.properties.intensity_color,
    weight: weight,
  };
}

function parseForecastMapStyle(feature?: ITsunamiGeoJsonFeatures): PathOptions {
  if (feature === undefined) {
    return {
      stroke: false,
    };
  }
  let color = "";
  if (tsunamiForecastAreas.value!.indexOf(feature.properties.name) > 0) {
    color = "#00aaff";
  }
  return {
    stroke: true,
    color: color,
    weight: 5,
  };
}

function onEachFeature(feature: ITsunamiGeoJsonFeatures, layer: Layer) {
  // NOTE: This is a terrible way of parsing bounds!
  // It is extremely hacky, uses several undocumented properties in layer,
  // and it is not guaranteed to work in the next version.
  // These ignore are intentional,
  // since it would freak out typescript linter.
  if (feature.properties.name === "奄美群島・トカラ列島") {
    // @ts-ignore
    layer.options.stroke = false;
  }
  const currentGrade = feature.properties.grade;
  if (currentGrade === "Watch") {
    currentGrades.value.Advisory = true;
  }
  if (currentGrade === "Warning") {
    currentGrades.value.Warning = true;
  }
  if (currentGrade === "MajorWarning") {
    currentGrades.value.MajorWarning = true;
  }
  if (
    japanMapLatLngBounds.contains([
      // @ts-ignore
      layer._bounds._northEast,
      // @ts-ignore
      layer._bounds._southWest,
    ])
  ) {
    if (boundJapan.value === undefined) {
      boundJapan.value = L.latLngBounds([
        // @ts-ignore
        layer._bounds._northEast,
        // @ts-ignore
        layer._bounds._southWest,
      ]);
    } else {
      boundJapan.value.extend([
        // @ts-ignore
        layer._bounds._northEast,
        // @ts-ignore
        layer._bounds._southWest,
      ]);
    }
  }
  if (
    mapOkinawa
      .value!.map!.getBounds()
      // @ts-ignore
      .contains([layer._bounds._northEast, layer._bounds._southWest])
  ) {
    displayOkinawa.value = true;
  }
  if (
    ogasawaraLatLngBounds.contains([
      // @ts-ignore
      layer._bounds._northEast,
      // @ts-ignore
      layer._bounds._southWest,
    ])
  ) {
    displayOgasawara.value = true;
  }
}

function forecastOnEachFeature(feature: ITsunamiGeoJsonFeatures, layer: Layer) {
  if (
    feature.properties.name === "奄美群島・トカラ列島" ||
    tsunamiForecastAreas.value.indexOf(feature.properties.name) < 0
  ) {
    // @ts-ignore
    layer.options.stroke = false;
    return;
  }
  if (
    japanMapLatLngBounds.contains([
      // @ts-ignore
      layer._bounds._northEast,
      // @ts-ignore
      layer._bounds._southWest,
    ])
  ) {
    if (boundJapan.value === undefined) {
      boundJapan.value = L.latLngBounds([
        // @ts-ignore
        layer._bounds._northEast,
        // @ts-ignore
        layer._bounds._southWest,
      ]);
    } else {
      boundJapan.value.extend([
        // @ts-ignore
        layer._bounds._northEast,
        // @ts-ignore
        layer._bounds._southWest,
      ]);
    }
  }
  if (
    mapOkinawa
      .value!.map!.getBounds()
      // @ts-ignore
      .contains([layer._bounds._northEast, layer._bounds._southWest])
  ) {
    displayOkinawa.value = true;
  }
  if (
    ogasawaraLatLngBounds.contains([
      // @ts-ignore
      layer._bounds._northEast,
      // @ts-ignore
      layer._bounds._southWest,
    ])
  ) {
    displayOgasawara.value = true;
  }
}

function setMapInfo(result: ITsunamiInfo) {
  if (flashTimer.value !== null) {
    clearInterval(flashTimer.value);
  }
  enableOgasawara.value = true;
  enableOkinawa.value = true;
  deleteAllStrokes();

  if (fetchType.value === "forecast") {
    if (
      result.map === null ||
      result.info.forecast_areas === null ||
      parseInt(result.status_forecast) !== 1
    ) {
      hnapi.warn("Info does not contain forecast info/Info not available");
      receiveTime.value = "XXXX-XX-XX XX:XX";
      return;
    }
  } else {
    if (
      result.map === null ||
      result.map.areas === null ||
      parseInt(result.status) !== 1
    ) {
      hnapi.warn("Info does not contain map info/Info not available");
      receiveTime.value = "XXXX-XX-XX XX:XX";
      return;
    }
  }

  if (fetchType.value === "forecast") {
    result.info.forecast_areas!.forEach((content) => {
      tsunamiForecastAreas.value!.push(content.name);
    });
  }

  const addGeoJson =
    fetchType.value === "information"
      ? result.map!.areas!
      : toRaw(useGeoJsonStore().tsunamiAreas);
  const mapStyleParser =
    fetchType.value === "information" ? parseMapStyle : parseForecastMapStyle;
  const mapOnEachFeature =
    fetchType.value === "information" ? onEachFeature : forecastOnEachFeature;

  receiveTime.value = result.map.time!;

  layerMain.value = L.geoJson(addGeoJson, {
    style: mapStyleParser,
    pane: "tilePane",
    onEachFeature: mapOnEachFeature,
  });
  if (displayOkinawa.value) {
    layerOkinawa.value = L.geoJson(addGeoJson, {
      pane: "tilePane",
      style: mapStyleParser,
    });
    enableOkinawa.value = true;
    layerOkinawa.value!.addTo(mapOkinawa.value!.map!);
  } else {
    enableOkinawa.value = false;
  }
  if (displayOgasawara.value) {
    layerOgasawara.value = L.geoJson(addGeoJson, {
      pane: "tilePane",
      style: mapStyleParser,
    });
    enableOgasawara.value = true;
    layerOgasawara.value!.addTo(mapOgasawara.value!.map!);
  } else {
    enableOgasawara.value = false;
  }

  layerMain.value!.addTo(mapMain.value!.map!);

  if (
    boundJapan.value !== undefined &&
    !enableOgasawara.value &&
    !enableOkinawa.value
  ) {
    mapMain.value!.map!.fitBounds(boundJapan.value!, { padding: [0, 20] });
  } else {
    mapMain.value!.map!.fitBounds(japanMapLatLngBounds);
  }

  setMapFlash();
}

function updateInfo() {
  hnapi
    .makeApiRequest("/api/tsunami_info", updateInterval)
    .then((result: ITsunamiInfo) => {
      // hnapi.debug(result);
      if (firstTime.value) {
        setMapInfo(result);
        firstTime.value = false;
        lastMessage.value = result;
        return;
      }
      if (isEqual(lastMessage.value, result)) {
        hnapi.debug("Identical information. No need to update.");
        return;
      }
      // N.B. This map operates on a different refreshing mechanism!
      // Instead of parsing the data again upon updating,
      // it would just refresh the page in order to reparse the data.
      window.location.reload();
    });
}
</script>

<style lang="scss">
@import "leaflet/dist/leaflet.css";
@import "@/assets/colors.scss";

#main-container {
  width: 850px;
  height: 490px;
}

#map-main {
  width: 100%;
  height: 100%;
  background: rgba(40, 43, 52, 1);
}

#map-okinawa-overlay {
  width: 300px;
  height: 175px;
  border-right: 2px solid white;
  border-bottom: 2px solid white;
  position: absolute;
  top: 25px;
  left: 50px;
  z-index: 999;
}

#map-okinawa {
  width: 300px;
  height: 140px;
  background: rgba(40, 43, 52, 0.75);
}

.description-areas {
  display: block;
  width: 100%;
  height: 30px;
  line-height: 30px;
  text-align: center;
  font-size: 20px;
}

#map-ogasawara-overlay {
  width: 140px;
  height: 140px;
  border: 2px solid white;
  z-index: 999;
  position: absolute;
  top: 150px;
  left: 650px;
}

#map-ogasawara {
  width: 100%;
  height: 110px;
  background: rgba(40, 43, 52, 0.75);
}

#receive-title {
  position: absolute;
  top: 465px;
  left: 525px;
  z-index: 9999;
}
</style>
