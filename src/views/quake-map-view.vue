<template>
  <div id="main-container">
    <eq-info-container v-if="!eewStore.showEew"></eq-info-container>
    <quake-map v-if="mapReady" ref="quakeMapInstance"></quake-map>
    <eew-info-container v-if="eewStore.showEew"></eew-info-container>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { nextTick, onMounted, onUnmounted, ref } from "vue";
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
  if (result.eew.area_coloring.recommended_areas) {
    if (!isEqual({}, result.eew.area_coloring.areas)) {
      quakeMapInstance.value.addMapIntensities(result.eew.area_coloring.areas);
      quakeMapInstance.value.addMapColoring(result.eew.area_coloring.areas);
    } else {
      hnapi.warn("Areas equals null. Check server status.");

      if (!isEqual(result.eew.area_intensity, {})) {
        quakeMapInstance.value.addMapIntensities(result.eew.area_intensity);
      } else {
        hnapi.warn("No points exist. Check server status.");
      }
    }
  } else {
    if (!isEqual(result.eew.area_intensity, {})) {
      quakeMapInstance.value.addMapIntensities(result.eew.area_intensity);
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

  let finalInfo;
  if (result.info.length > 1) {
    if (
      result.info[0].id === result.info[1].id &&
      result.info.length === 2 &&
      ((result.info[0].type === "ScalePrompt" &&
        result.info[1].type === "Destination") ||
        (result.info[0].type === "Destination" &&
          result.info[1].type === "ScalePrompt"))
    ) {
      // expected behavior
      finalInfo = result.info;
    } else {
      hnapi.warn("RACE: multiple info available.");
      finalInfo = selectEarthquakeInformation(result.info);
    }
  } else {
    finalInfo = result.info;
  }
  finalInfo.forEach((content: IQuakeInfo) => {
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
        quakeMapInstance.value!.addMapIntensities(content.area_intensity.areas);
        quakeMapInstance.value!.addMapColoring(content.area_intensity.areas);
        setBannerContent({
          domestic: content.tsunami_comments.domestic,
          foreign: content.tsunami_comments.foreign,
        });
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "Destination") {
      parseEarthquakeInformation(currentEarthquakeInformation.value);
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
        quakeMapInstance.value!.addMapIntensities(content.area_intensity.areas);
        quakeMapInstance.value!.addMapColoring(content.area_intensity.areas);
        quakeMapInstance.value!.parseMapScale();
      });
    } else if (content.type === "DetailScale") {
      displayEarthquakeInformation(content);
      eqStore.maximumIntensity = content.max_intensity;
      quakeMapInstance.value!.deleteAllLayers();
      nextTick(() => {
        quakeMapInstance.value!.addMapIntensities(
          content.area_intensity.station
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
#main-container {
  width: 750px;
  height: 675px;
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
</style>
