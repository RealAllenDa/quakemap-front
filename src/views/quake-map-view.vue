<template>
  <main
    id="main-container"
    :class="{
      'earthquake-map-page--eew': eewStore.showEew,
      'earthquake-map-page--symbol-intensities': symbolIntensityStyleActive,
    }"
    class="earthquake-map-page"
  >
    <quake-map
      v-if="mapReady"
      ref="quakeMapInstance"
      :info-panel-orientation="infoPanelOrientation"
      :scale-elements="scaleInfoPanel"
      class="earthquake-map-canvas"
    ></quake-map>
    <div v-else class="earthquake-map-loading">Loading earthquake map</div>

    <aside
      :class="earthquakeInfoPanelClasses"
      aria-label="Earthquake information"
      class="earthquake-info-panel"
    >
      <eq-info-container v-if="!eewStore.showEew"></eq-info-container>
      <eew-info-container v-else></eew-info-container>
    </aside>
  </main>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import hnapi from "@/assets/hnapi";
import EqInfoContainer from "@/components/map/eq-info-container.vue";
import type {
  IQuakeInfo,
  ITsunamiComments,
} from "@/interfaces/parsing/QuakeInfo";
import type { IInfo, IInfoMocked } from "@/interfaces/api/QuakeInfo";
import { cloneDeep, isEqual } from "lodash";
import QuakeMap from "@/components/map/quake-map.vue";
import EewInfoContainer from "@/components/map/eew-info-container.vue";
import type { IEEW } from "@/interfaces/parsing/EEW";
import { useEqInfoStore } from "@/stores/eq-info";
import { useEEWInfoStore } from "@/stores/eew-info";
import { PSWAVE_TIME } from "@/assets/pswave";
import type { ITimeSync } from "@/interfaces/api/Generic";

const psWaveTime = ref<[number?, number?]>([]);
const psWaveUpdateTimer: Ref<ReturnType<typeof setInterval> | null> = ref(null);
const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = ref(2500);
const calibrateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const calibrateInterval = ref(3600 * 1000);

const lastInfo: Ref<object | null> = ref(null);
const mapReady = ref(false);
const symbolIntensityStyleActive = ref(false);

const eewInEffect = ref(false);

const messagesBeforeEEW: Ref<IQuakeInfo[] | null> = ref(null);
const lastEEWReportNum = ref("-1");
const suspendEEWUntilNumberChange = ref(false);

const activeEews = ref<Record<string, string>>({});
const currentEewId = ref("");
const currentEarthquakeInformation = ref<IInfoMocked>({
  info: [],
});
const infoTypesList: Record<string, number> = {
  ScalePrompt: 2,
  Destination: 3,
  ScaleAndDestination: 1,
  DetailScale: 0,
  Foreign: 0,
};

const syncedServerTime = ref(0);
const startSyncTime = ref(0);

const quakeMapInstance = ref<InstanceType<typeof QuakeMap>>();
const eqStore = useEqInfoStore();
const eewStore = useEEWInfoStore();
const route = useRoute();

const scaleInfoPanel = computed(() => {
  const scale = route.query.scale;
  return Array.isArray(scale) ? scale.includes("true") : scale === "true";
});

type InfoPanelOrientation = "top" | "right" | "bottom" | "left";

function isInfoPanelOrientation(value: unknown): value is InfoPanelOrientation {
  return (
    value === "top" ||
    value === "right" ||
    value === "bottom" ||
    value === "left"
  );
}

const infoPanelOrientation = computed<InfoPanelOrientation>(() => {
  const orientation = route.query.orientation;
  if (Array.isArray(orientation)) {
    return orientation.find(isInfoPanelOrientation) ?? "bottom";
  }
  return isInfoPanelOrientation(orientation) ? orientation : "bottom";
});

function getObjectEntryCount(value: unknown): number {
  if (value === null || typeof value !== "object") {
    return 0;
  }

  return Object.keys(value).length;
}

function hasObjectEntries(value: unknown): value is Record<string, unknown> {
  return getObjectEntryCount(value) > 0;
}

const isVerticalInfoPanel = computed(
  () =>
    infoPanelOrientation.value === "left" ||
    infoPanelOrientation.value === "right"
);

const earthquakeInfoPanelClasses = computed(() => [
  `earthquake-info-panel--${infoPanelOrientation.value}`,
  {
    "earthquake-info-panel--scaled": scaleInfoPanel.value,
    "earthquake-info-panel--vertical": isVerticalInfoPanel.value,
  },
]);

async function calibrateTime() {
  const startTs = Date.now();
  await hnapi
    .makeApiRequest(`/time?ct=${startTs}`, 10000)
    .then((data: ITimeSync) => {
      const endTs = Date.now();
      const serverClientRequestDiff = data.difference;
      const serverTimestamp = data.server_timestamp;

      syncedServerTime.value =
        endTs + (serverClientRequestDiff + (serverTimestamp - endTs)) / 2;
      startSyncTime.value = performance.now();
      hnapi.debug(
        "syncedTime =>",
        syncedServerTime.value,
        "currentTime =>",
        endTs,
        "startSyncTime =>",
        startSyncTime.value
      );
    });
}

function psWaveTimeRefresh(result: IInfo) {
  let depth, timePassed;
  if (result.eew.hypocenter.depth === "Unknown") {
    depth = -999;
  } else {
    depth = parseInt(result.eew.hypocenter.depth.replace("km", ""));
  }
  const serverTime =
    syncedServerTime.value + (performance.now() - startSyncTime.value);
  timePassed = serverTime / 1000 + 3600 - result.eew.occur_timestamp;
  parsePSWaveTime(depth, timePassed);
  // noinspection JSIncompatibleTypesComparison
  if (psWaveTime.value[1] !== undefined) {
    quakeMapInstance.value!.addWaveCircle(
      result.eew.hypocenter,
      psWaveTime.value[1],
      "s"
    );
  } else {
    quakeMapInstance.value!.removeWaveCircle("s");
  }
  // noinspection JSIncompatibleTypesComparison
  if (psWaveTime.value[0] !== undefined) {
    quakeMapInstance.value!.addWaveCircle(
      result.eew.hypocenter,
      psWaveTime.value[0],
      "p"
    );
  } else {
    quakeMapInstance.value!.removeWaveCircle("p");
  }
}

function parsePSWaveTime(depth: number, timePassed: number) {
  psWaveTime.value = [];
  if (depth > 700 || timePassed > 2000) {
    hnapi.warn("PSWave time parsing failure: time too long or too deep");
    return;
  }
  const earthquakeList = PSWAVE_TIME.filter((d) => d[2] === depth);
  if (earthquakeList.length === 0) {
    hnapi.warn("PSWave time parsing failure: no depth corresponding");
    return;
  }

  const sLastList = earthquakeList.filter((s) => s[1] <= timePassed);
  const sFirstList = earthquakeList.filter((s) => s[1] >= timePassed);
  if (sFirstList.length === 0 || sLastList.length === 0) {
    hnapi.warn("SWave time parsing failure: no time corresponding");
    psWaveTime.value[1] = undefined;
  } else {
    const sLast = sLastList.pop();
    const sFirst = sFirstList[0];
    // Linear interpolation
    psWaveTime.value[1] =
      ((timePassed - sLast![1]) / (sFirst[1] - sLast![1])) *
        (sFirst[3] - sLast![3]) +
      sLast![3];
  }

  const pLastList = earthquakeList.filter((s) => s[0] <= timePassed);
  const pFirstList = earthquakeList.filter((s) => s[0] >= timePassed);
  if (pLastList.length === 0 || pFirstList.length === 0) {
    hnapi.warn("PWave time parsing failure: no time corresponding");
    psWaveTime.value[0] = undefined;
  } else {
    const pLast = pLastList.pop();
    const pFirst = pFirstList[0];
    // Linear interpolation
    psWaveTime.value[0] =
      ((timePassed - pLast![0]) / (pFirst[0] - pLast![0])) *
        (pFirst[3] - pLast![3]) +
      pLast![3];
  }
}

function setBannerContent(content: ITsunamiComments) {
  eqStore.$patch({
    tsunamiCommentsDomestic: content.domestic,
    tsunamiCommentsForeign: content.foreign,
  });
}

function displayEarthquakeInformation(content: IQuakeInfo) {
  eqStore.setHypocenter(content.hypocenter);
  eqStore.setMagnitude(content.magnitude);
  eqStore.occurTime = content.occur_time;
  setBannerContent({
    domestic: content.tsunami_comments.domestic,
    foreign: content.tsunami_comments.foreign,
  });
}

function displayEEWInformation(content: IEEW) {
  eqStore.setHypocenter(content.hypocenter);
  eqStore.setMagnitude(content.magnitude);
  eqStore.occurTime = content.report_time;
}

function parseEEWInformation(result: IInfo, mapUpdateOnly = false) {
  if (quakeMapInstance.value === undefined) {
    hnapi.error("Map has not yet been initialized!");
    return;
  }
  symbolIntensityStyleActive.value = false;
  eewStore.showEew = true;
  if (result.eew.is_cancel) {
    eewStore.showEew = false;
    eewStore.$patch({
      eewIsDrill: false,
      eewIsExpected: false,
    });
    quakeMapInstance.value!.deleteAllLayers();
    eqStore.$patch({
      tsunamiCommentsDomestic: "EEWCancelled",
    });
    parseEarthquakeInformation(result);
    return;
  }
  if (!mapUpdateOnly) {
    displayEEWInformation(result.eew);
    eewStore.eewIsPlum = result.eew.is_plum;
    eqStore.maximumIntensity = result.eew.max_intensity;
    eqStore.maximumLgIntensity = result.eew.max_lg_intensity;
    if (result.eew.is_final) {
      eewStore.eewReportNum = `#${result.eew.report_num}-F`;
    } else {
      eewStore.eewReportNum = `#${result.eew.report_num}`;
    }
    if (parseInt(result.eew.report_flag) === 0) {
      eewStore.eewType = "Forecast";
    } else if (parseInt(result.eew.report_flag) === 1) {
      eewStore.eewType = "Warning";
    }
    if (result.eew.max_intensity === "0" || result.eew.is_plum) {
      eewStore.eewAdvice = "Wait";
    } else if (parseInt(result.eew.hypocenter.depth.slice(0, -2)) >= 100) {
      eewStore.eewAdvice = "Deep";
    } else if (parseFloat(result.eew.magnitude) >= 6.0) {
      eewStore.eewAdvice = "StayAway";
    } else {
      eewStore.eewAdvice = "PayAttention";
    }
    eewStore.eewIsDrill = result.eew.is_test;
  }
  quakeMapInstance.value.deleteAllLayers();
  quakeMapInstance.value.addEpicenter(result.eew.hypocenter);
  const coloringAreas = result.eew.area_coloring?.areas;
  const eewAreaIntensity = result.eew.area_intensity;
  if (result.eew.area_coloring?.recommended_areas) {
    if (hasObjectEntries(coloringAreas)) {
      quakeMapInstance.value.addMapIntensities(coloringAreas);
      quakeMapInstance.value.addMapColoring(coloringAreas);
    } else {
      hnapi.warn("Areas equals null. Check server status.");

      if (hasObjectEntries(eewAreaIntensity)) {
        quakeMapInstance.value.addMapIntensities(eewAreaIntensity);
      } else {
        hnapi.warn("No points exist. Check server status.");
      }
    }
  } else {
    if (hasObjectEntries(eewAreaIntensity)) {
      quakeMapInstance.value.addMapIntensities(eewAreaIntensity);
    } else {
      hnapi.warn("No points exist. Check server status.");
    }
  }
  quakeMapInstance.value.parseMapScale(true);

  eewStore.eewIsExpected = true;

  if (psWaveUpdateTimer.value !== null) {
    clearInterval(psWaveUpdateTimer.value);
    psWaveUpdateTimer.value = null;
  }

  // Execute immediately
  psWaveTimeRefresh(result);
  psWaveUpdateTimer.value = setInterval(() => {
    psWaveTimeRefresh(result);
  }, 500);
}

function selectEarthquakeInformation(result: IQuakeInfo[]): IQuakeInfo[] {
  let returnAll = false;
  let occurTime = "";

  let sortedResult = cloneDeep(result);
  sortedResult.sort((a, b) => {
    if (occurTime === "") {
      occurTime = a.occur_time;
    }
    if (occurTime !== a.occur_time || occurTime !== b.occur_time) {
      hnapi.warn("Multiple occur times: Multiple earthquake, returning all");
      returnAll = true;
      return 0;
    }
    const aType = infoTypesList[a.type];
    const bType = infoTypesList[b.type];
    return aType - bType;
  });
  if (returnAll) {
    return result;
  } else if (sortedResult[0].type === "Destination") {
    hnapi.error("Final sorted result is Destination: undefined behavior");
    return result;
  } else {
    return [sortedResult[0]];
  }
}

function parseEarthquakeInformation(result: IInfo | IInfoMocked) {
  if (quakeMapInstance.value === undefined) {
    hnapi.error("Map has not yet been initialized!");
    return;
  }
  if (psWaveUpdateTimer.value !== null) {
    clearInterval(psWaveUpdateTimer.value);
    psWaveUpdateTimer.value = null;
  }
  eewStore.showEew = false;

  let finalInfo,
    firstTime = false;
  if (result.info.length > 1) {
    if (
      result.info[0].id === result.info[1].id &&
      result.info.length === 2 &&
      result.info[0].type === "ScalePrompt" &&
      result.info[1].type === "Destination"
    ) {
      console.log(currentEarthquakeInformation.value.info);
      if (currentEarthquakeInformation.value.info.length === 0) {
        // expected behavior
        finalInfo = result.info;
        firstTime = true;
      } else {
        finalInfo = [result.info[1]];
      }
    } else {
      hnapi.warn("RACE: multiple info available.");
      finalInfo = selectEarthquakeInformation(result.info);
    }
  } else {
    finalInfo = result.info;
  }
  finalInfo.forEach((content: IQuakeInfo) => {
    const stationIntensities = content.area_intensity?.station;
    const useSymbolIntensityStyle =
      content.type === "DetailScale" &&
      getObjectEntryCount(stationIntensities) >= 250;
    symbolIntensityStyleActive.value = useSymbolIntensityStyle;
    eqStore.currentType = content.type;
    if (
      parseInt(content.max_intensity) === 99999 ||
      parseInt(content.max_intensity) === -1
    ) {
      content.max_intensity = "-1";
    }

    if (content.type !== "Destination") {
      currentEarthquakeInformation.value.info = [content];
    }

    if (content.type === "ScalePrompt") {
      eqStore.$patch({
        maximumIntensity: content.max_intensity,
        occurTime: content.occur_time,
      });
      quakeMapInstance.value!.deleteAllLayers();
      nextTick(() => {
        const areaIntensities = content.area_intensity?.areas;
        quakeMapInstance.value!.addMapIntensities(areaIntensities);
        quakeMapInstance.value!.addMapColoring(areaIntensities);
        setBannerContent({
          domestic: content.tsunami_comments.domestic,
          foreign: content.tsunami_comments.foreign,
        });
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "Destination") {
      if (!firstTime) {
        parseEarthquakeInformation(currentEarthquakeInformation.value);
      }
      // Set currentType back to Destination, since the recursive
      // parseEarthquakeInformation() had set currentType to others.
      eqStore.currentType = content.type;
      // nextTick() is REQUIRED here, for the update of banners takes
      // time to complete.
      nextTick(() => {
        displayEarthquakeInformation(content);
        quakeMapInstance.value!.addEpicenter(content.hypocenter);
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "ScaleAndDestination") {
      eqStore.maximumIntensity = content.max_intensity;
      displayEarthquakeInformation(content);
      quakeMapInstance.value!.deleteAllLayers();
      nextTick(() => {
        setBannerContent({
          domestic: content.tsunami_comments.domestic,
          foreign: content.tsunami_comments.foreign,
        });
        quakeMapInstance.value!.addEpicenter(content.hypocenter);
        const areaIntensities = content.area_intensity?.areas;
        quakeMapInstance.value!.addMapIntensities(areaIntensities);
        quakeMapInstance.value!.addMapColoring(areaIntensities);
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "DetailScale") {
      displayEarthquakeInformation(content);
      eqStore.maximumIntensity = content.max_intensity;
      quakeMapInstance.value!.deleteAllLayers();
      nextTick(() => {
        const stations = content.area_intensity?.station;
        quakeMapInstance.value!.addMapIntensities(
          stations,
          useSymbolIntensityStyle
        );
        quakeMapInstance.value!.addEpicenter(content.hypocenter);
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "Foreign") {
      displayEarthquakeInformation(content);
      eqStore.maximumIntensity = content.max_intensity;
      quakeMapInstance.value!.deleteAllLayers();
      nextTick(() => {
        quakeMapInstance.value!.addEpicenter(content.hypocenter);
        quakeMapInstance.value!.setForeignEarthquake(content.hypocenter);
      });
    }
  });
}

function updateInfo() {
  mapReady.value = true;
  hnapi
    .makeApiRequest("/api/earthquake_info", updateInterval.value)
    .then((result: IInfo) => {
      // hnapi.debug(result);

      if (!result.eew || !result.info) {
        hnapi.error("Message format incorrect. Skipping.");
        return;
      } else if (isEqual([], result.info)) {
        hnapi.warn("No earthquake info available.");
      }

      if (isEqual(lastInfo.value, result)) {
        hnapi.debug("Identical information. Skipping.");
        return;
      } else {
        hnapi.debug("Updated information. Parsing.");
        lastInfo.value = result;
      }

      if (result.eew.status === 0) {
        hnapi.debug("EEW Received. Parsing...");
        if (!eewInEffect.value) {
          hnapi.debug("EEW first received.");
          messagesBeforeEEW.value = result.info;
          eewInEffect.value = true;
          lastEEWReportNum.value = "-1";
          currentEewId.value = result.eew.report_id;
          activeEews.value = {};
          activeEews.value[currentEewId.value] = result.eew.report_num;

          parseEEWInformation(result, false);
          return;
        }

        if (!isEqual(result.info, messagesBeforeEEW.value)) {
          hnapi.info(
            "Earthquake info updated. Displaying new earthquake info."
          );
          messagesBeforeEEW.value = result.info;
          suspendEEWUntilNumberChange.value = true;
          parseEarthquakeInformation(result);
          return;
        }

        if (currentEewId.value !== result.eew.report_id) {
          hnapi.info("Different EEW (report_id). Displaying.");
          suspendEEWUntilNumberChange.value = false;
          currentEewId.value = result.eew.report_id;
          activeEews.value[currentEewId.value] = result.eew.report_num;
          parseEEWInformation(result);
        } else if (
          parseInt(result.eew.report_num) >
          parseInt(activeEews.value[currentEewId.value])
        ) {
          hnapi.info("EEW updated (num != last_num). Displaying.");
          activeEews.value[currentEewId.value] = result.eew.report_num;
          suspendEEWUntilNumberChange.value = false;
          parseEEWInformation(result);
        } else if (!suspendEEWUntilNumberChange.value) {
          hnapi.info("Parameters updated. Displaying EEW.");
          parseEEWInformation(result, true);
        }
      } else {
        eewInEffect.value = false;
        activeEews.value = {};
        currentEewId.value = "";
        parseEarthquakeInformation(result);
      }
    });
}

onMounted(async () => {
  await calibrateTime();
  calibrateTimer.value = setInterval(async () => {
    await calibrateTime();
  }, calibrateInterval.value);
  await hnapi
    .initialize({
      japan: true,
      countries: true,
      japanWithSubAreas: true,
    })
    .then(() => {
      updateInfo();
      updateTimer.value = setInterval(updateInfo, updateInterval.value);
    });
});
onUnmounted(() => {
  if (updateTimer.value !== null) {
    clearInterval(updateTimer.value);
  }
  if (psWaveUpdateTimer.value !== null) {
    clearInterval(psWaveUpdateTimer.value);
  }
  if (calibrateTimer.value !== null) {
    clearInterval(calibrateTimer.value);
  }
});
</script>

<style lang="scss">
@import "@/assets/colors.scss";

#main-container {
  width: 100vw;
  height: 100vh;
}

.window {
  width: 100%;
  height: 185px;
  display: grid;
  box-sizing: border-box;
}

.sub-window {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.label {
  display: inline-block;
  font-size: 20px;
  width: 100px;
  margin-left: 10px;
}

.label-content {
  font-size: 23px;
  font-weight: bold;
  margin-left: 23px;
}

.earthquake-map-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #181d20;
}

.earthquake-map-page::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(
      180deg,
      rgba(8, 13, 16, 0.62) 0,
      rgba(8, 13, 16, 0.18) 34%,
      rgba(8, 13, 16, 0) 58%
    ),
    linear-gradient(
      90deg,
      rgba(8, 13, 16, 0.52) 0,
      rgba(8, 13, 16, 0.16) 30%,
      rgba(8, 13, 16, 0) 62%
    );
}

.earthquake-map-page--eew::after {
  background: linear-gradient(
      180deg,
      rgba(60, 11, 18, 0.56) 0,
      rgba(8, 13, 16, 0.16) 42%,
      rgba(8, 13, 16, 0) 64%
    ),
    linear-gradient(
      90deg,
      rgba(60, 11, 18, 0.44) 0,
      rgba(8, 13, 16, 0.16) 36%,
      rgba(8, 13, 16, 0) 64%
    );
}

.earthquake-map-page--symbol-intensities::after {
  background: linear-gradient(
      180deg,
      rgba(8, 13, 16, 0.3) 0,
      rgba(8, 13, 16, 0.05) 34%,
      rgba(8, 13, 16, 0) 58%
    ),
    linear-gradient(
      90deg,
      rgba(8, 13, 16, 0.3) 0,
      rgba(8, 13, 16, 0.05) 30%,
      rgba(8, 13, 16, 0) 62%
    );
}

.earthquake-map-page--eew.earthquake-map-page--symbol-intensities::after {
  background: linear-gradient(
      180deg,
      rgba(60, 11, 18, 0.3) 0,
      rgba(8, 13, 16, 0.05) 42%,
      rgba(8, 13, 16, 0) 64%
    ),
    linear-gradient(
      90deg,
      rgba(60, 11, 18, 0.3) 0,
      rgba(8, 13, 16, 0.05) 36%,
      rgba(8, 13, 16, 0) 64%
    );
}

.earthquake-map-page .earthquake-map-canvas {
  width: 100% !important;
  height: 100% !important;
}

.earthquake-info-panel {
  --earthquake-info-panel-scale: 1;

  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: 999999999;
  width: min(920px, calc(100vw - 44px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: linear-gradient(
      180deg,
      rgba(24, 35, 40, 0.86),
      rgba(11, 16, 19, 0.78)
    ),
    rgba(13, 19, 22, 0.72);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  transform: translateX(-50%) scale(var(--earthquake-info-panel-scale));
  transform-origin: bottom center;
  backdrop-filter: blur(18px);
}

.earthquake-info-panel--scaled {
  --earthquake-info-panel-scale: 1.5;
}

.earthquake-info-panel--top {
  top: 22px;
  bottom: auto;
  transform-origin: top center;
}

.earthquake-info-panel--bottom {
  bottom: 22px;
  transform-origin: bottom center;
}

.earthquake-info-panel--left,
.earthquake-info-panel--right {
  top: 50%;
  bottom: auto;
  width: min(360px, calc(100vw - 44px));
  max-height: calc(100vh - 44px);
  transform: translateY(-50%) scale(var(--earthquake-info-panel-scale));
}

.earthquake-info-panel--left {
  left: 22px;
  right: auto;
  transform-origin: left center;
}

.earthquake-info-panel--right {
  left: auto;
  right: 22px;
  transform-origin: right center;
}

.earthquake-info-panel::before {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  height: 1px;
  content: "";
  background: linear-gradient(
    90deg,
    rgba(129, 230, 217, 0),
    rgba(129, 230, 217, 0.72),
    rgba(255, 102, 102, 0.62),
    rgba(129, 230, 217, 0)
  );
}

.earthquake-info-panel > * {
  position: relative;
  z-index: 2;
}

.earthquake-info-panel .window {
  width: 100%;
  height: auto;
}

.earthquake-info-panel .intensity-display {
  grid-template-rows:
    [eqinfo] 200px
    [infobanner] 45px;
}

.earthquake-info-panel .intensity-display--foreign {
  grid-template-rows:
    [eqinfo] 200px
    [infobanner] 45px
    [foreignbanner] 45px;
}

.earthquake-info-panel .eew-display {
  height: 285px;
  grid-template-rows:
    [eewtype] 45px
    [eewadvice] 40px
    [eewinfo] 200px;
}

.earthquake-info-panel .earthquake-info,
.earthquake-info-panel .eew-earthquake-info {
  width: calc(100% - 275px);
}

.earthquake-info-panel .banner-foreign {
  width: 100% !important;
}

.earthquake-info-panel .flags {
  top: 10px;
  left: 10px;
  border-radius: 6px;
}

.earthquake-info-panel .drill-flag {
  left: auto;
  right: 10px;
}

.earthquake-info-panel .eew-intensity-add {
  position: static;
  transform: translateY(-0.4em);
}

.earthquake-info-panel--vertical .intensity-display {
  grid-template-rows:
    [eqinfo] auto
    [infobanner] 45px;
}

.earthquake-info-panel--vertical .intensity-display--foreign {
  grid-template-rows:
    [eqinfo] auto
    [infobanner] 45px
    [foreignbanner] 45px;
}

.earthquake-info-panel.earthquake-info-panel--vertical .earthquake-description,
.earthquake-info-panel.earthquake-info-panel--vertical .eew-earthquake {
  display: flex !important;
  flex-direction: column !important;
  height: auto !important;
}

.earthquake-info-panel.earthquake-info-panel--vertical .intensity-icon {
  width: 100% !important;
  height: 170px !important;
  border-right: 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.earthquake-info-panel.earthquake-info-panel--vertical .intensity-wrapper {
  width: 100% !important;
  height: 230px !important;
  border-right: 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.earthquake-info-panel.earthquake-info-panel--vertical
  .intensity-wrapper
  .intensity-icon {
  height: 50% !important;
}

.earthquake-info-panel.earthquake-info-panel--vertical .earthquake-info,
.earthquake-info-panel.earthquake-info-panel--vertical .eew-earthquake-info {
  width: 100% !important;
  min-height: 220px;
  border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-left: 0 !important;
}

.earthquake-info-panel.earthquake-info-panel--vertical
  .earthquake-primary
  .earthquake-description-row {
  height: 100%;
  padding: 7px 10px;
}

.earthquake-info-panel.earthquake-info-panel--vertical
  .earthquake-primary
  .earthquake-description-value {
  font-size: 33px;
  line-height: 1.05;
}

.earthquake-info-panel.earthquake-info-panel--vertical .intensity-add {
  transform: translateY(-1em);
}

.earthquake-info-panel.earthquake-info-panel--vertical .earthquake-metrics {
  height: 100%;
}

.earthquake-info-panel.earthquake-info-panel--vertical
  .earthquake-metrics
  .earthquake-description-row {
  min-height: 0;
  height: 100%;
  padding: 10px 12px;
}

.earthquake-info-panel.earthquake-info-panel--vertical
  .earthquake-metrics
  .earthquake-description-value {
  font-size: 31px;
}

.earthquake-info-panel--vertical .eew-display {
  height: auto;
  grid-template-rows:
    [eewtype] 45px
    [eewadvice] 40px
    [eewinfo] auto;
}

.earthquake-info-panel--vertical .eew-information {
  min-height: 40px;
}

.earthquake-map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #d8e2ea;
  font-size: 15px;
  background: #181d20;
}

.earthquake-map-page .maplibregl-ctrl-top-right {
  top: 22px;
  right: 22px;
  z-index: 380;
}

.earthquake-map-page .maplibregl-ctrl-bottom-right {
  right: 18px;
  bottom: 18px;
  z-index: 380;
}

.earthquake-map-page .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(13, 19, 22, 0.76);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.earthquake-map-page .maplibregl-ctrl button {
  width: 36px;
  height: 36px;
  background-color: transparent;
}

.earthquake-map-page .maplibregl-ctrl-icon {
  filter: invert(1) brightness(1.35);
}

.earthquake-map-page .maplibregl-ctrl button + button {
  border-top-color: rgba(255, 255, 255, 0.12);
}

.earthquake-map-page .maplibregl-ctrl-attrib {
  border-radius: 6px;
  background: rgba(13, 19, 22, 0.66);
  color: #d8e2ea;
  backdrop-filter: blur(12px);
}

@media (max-width: 820px) {
  .earthquake-info-panel:not(.earthquake-info-panel--vertical) {
    left: 50%;
    bottom: 12px;
    width: 920px;
    max-width: none;
    transform: translateX(-50%)
      scale(calc(((100vw - 24px) / 920) * var(--earthquake-info-panel-scale)));
    transform-origin: bottom center;
  }

  .earthquake-info-panel--top:not(.earthquake-info-panel--vertical) {
    top: 12px;
    bottom: auto;
    transform-origin: top center;
  }

  .earthquake-info-panel--vertical {
    top: 12px;
    bottom: auto;
    width: min(360px, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    transform: scale(var(--earthquake-info-panel-scale));
  }

  .earthquake-info-panel--left {
    left: 12px;
    right: auto;
    transform-origin: top left;
  }

  .earthquake-info-panel--right {
    left: auto;
    right: 12px;
    transform-origin: top right;
  }

  .earthquake-map-page .maplibregl-ctrl-top-right {
    top: 12px;
    right: 12px;
  }
}
</style>
