<template>
  <div id="main-container">
    <div id="tsunami-banner">
      <div id="tsunami-show">
        <span id="tsunami-title">{{ title }}</span>
        <span id="receive-title">
          {{ reportOrigin }}
          #{{ pagesNow === -999 ? "--" : pagesNow + 1 }}/{{
            totalPages
          }}
          Received at {{ receiveTime }}</span
        >
      </div>
    </div>
    <div id="tsunami-information">
      <tsunami-table-title :fetch-type="fetchType"></tsunami-table-title>
      <div
        v-for="(i, key) in tsunamiItems"
        :key="key"
        :class="fetchType"
        class="tsunami-item"
      >
        <tsunami-item
          :fetch-type="fetchType"
          :grade="i.grade"
          :height="i.height"
          :name="i.name"
          :time="i.time"
        ></tsunami-item>
      </div>
    </div>
    <div v-if="displayOverlay" id="information-overlay">{{ overlayText }}</div>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";
import hnapi from "@/assets/hnapi";
import type {
  ITsunamiExpectationAreas,
  ITsunamiInfo,
  ITsunamiSortedResult,
} from "@/interfaces/api/TsunamiInfo";
import { chunk, cloneDeep, isEqual, sortBy } from "lodash";
import { useRoute } from "vue-router";
import TsunamiItem from "@/components/tsunami-expectation/tsunami-item.vue";
import TsunamiTableTitle from "@/components/tsunami-expectation/tsunami-table-title.vue";

const fetchType = ref("");
const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 3500;
const showTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const showInterval = 10000;
const lastMessage = ref<ITsunamiInfo>();
const splitArray = ref<ITsunamiExpectationAreas[][]>();

const overlayText = ref("Waiting for messages...");
const title = ref("Tsunami Information");
const reportOrigin = ref("--");
const displayOverlay = ref(true);
const receiveTime = ref("XXXX/XX/XX XX:XX");
const totalPages = ref("--");
const pagesNow = ref(-999);
const tsunamiItems = ref<ITsunamiExpectationAreas[]>([]);

onMounted(async () => {
  const route = useRoute();
  if (route.query.type === "forecast") {
    fetchType.value = "forecast";
  } else {
    fetchType.value = "information";
  }
  hnapi.info(`Fetching with type ${fetchType.value}`);
  await hnapi.initialize({}).then(() => {
    updateInfo();
    updateTimer.value = setInterval(updateInfo, updateInterval);
  });
});
onUnmounted(() => {
  if (updateTimer.value !== null) {
    clearInterval(updateTimer.value);
  }
  if (showTimer.value !== null) {
    clearInterval(showTimer.value);
  }
});

function resetTsunami() {
  if (fetchType.value === "forecast") {
    overlayText.value = "No tsunami forecast in effect.";
  } else if (fetchType.value === "information") {
    overlayText.value = "No tsunami warning in effect.";
  }
  displayOverlay.value = true;
  clearTsunamiInfo();
  if (showTimer.value !== null) {
    clearInterval(showTimer.value);
  }
  pagesNow.value = -999;
  totalPages.value = "--";
  receiveTime.value = "XXXX/XX/XX XX:XX";
  if (fetchType.value === "forecast") {
    title.value = "TSUNAMI FORECAST";
  } else if (fetchType.value === "information") {
    title.value = "TSUNAMI INFORMATION";
  }
  reportOrigin.value = "--";
}

function sortByArrivalTime(
  areas: ITsunamiExpectationAreas[] | null | undefined
): ITsunamiExpectationAreas[] {
  if (!Array.isArray(areas)) {
    return [];
  }

  // Final areaEntries:
  // [ ["name", ...], ["", ...], ["", ...], ["", ...] ]
  let areaEntries: [string, any][][] = [];
  areas.forEach((content) => {
    areaEntries.push(Object.entries(content));
  });

  areaEntries.sort((f1, f2) => {
    var time_f1 = f1[3][1];
    var time_f2 = f2[3][1];
    if (time_f1["type"] == "no_time" && time_f2["type"] == "time") {
      return 99;
    } else if (time_f1["type"] == "time" && time_f2["type"] == "no_time") {
      return -99;
    } else if (time_f1["type"] == "no_time" && time_f2["type"] == "no_time") {
      return time_f1["status"] - time_f2["status"];
    } else {
      return -(time_f1["timestamp"] - time_f2["timestamp"]);
    }
  });

  areaEntries = areaEntries.reverse();
  let areaSorted: ITsunamiExpectationAreas[] = [];
  areaEntries.forEach((content) => {
    areaSorted.push(Object.fromEntries(content) as ITsunamiExpectationAreas);
  });
  return areaSorted;
}

function clearTsunamiInfo() {
  tsunamiItems.value = [];
}

function showTsunamiInfo() {
  clearTsunamiInfo();
  pagesNow.value++;
  if (pagesNow.value > parseInt(totalPages.value) - 1) {
    pagesNow.value = 0;
  }
  tsunamiItems.value = splitArray.value![pagesNow.value];
}

function setTsunamiInfo(result: ITsunamiSortedResult) {
  if (showTimer.value !== null) {
    clearInterval(showTimer.value);
    clearTsunamiInfo();
  }
  displayOverlay.value = false;
  receiveTime.value = result.receive_time;

  splitArray.value = chunk(result.areas, 7);
  totalPages.value = splitArray.value.length.toString();
  pagesNow.value = -1;

  showTsunamiInfo();
  showTimer.value = setInterval(showTsunamiInfo, showInterval);
}

function parseTsunamiInfo(result: ITsunamiInfo) {
  if (parseInt(result.status) !== 0 && result.info.areas !== null) {
    hnapi.info("Parsing detailed tsunami info.");
    if (isEqual([], result.info.areas)) {
      resetTsunami();
      return;
    }
    title.value = "TSUNAMI INFORMATION (DETAILED)";
    reportOrigin.value = result.info.origin!;

    let resultForSort = cloneDeep(result.info);

    // Sort tsunami information
    // First, sort by grade:
    // MajorWarning => Warning => Watch
    // Next, sort by arrival time:
    // Arrived => Arrival Expected => Arriving Now => Time (Latest first)
    let tsunamiGradeSorted: Record<string, ITsunamiExpectationAreas[]> = {
      MajorWarning: [],
      Warning: [],
      Watch: [],
    };
    resultForSort.areas!.forEach((content) => {
      tsunamiGradeSorted[content.grade].push(content);
    });
    const finalSortedAreas = sortByArrivalTime(tsunamiGradeSorted.MajorWarning);
    Array.prototype.push.apply(
      finalSortedAreas,
      sortByArrivalTime(tsunamiGradeSorted.Warning)
    );
    Array.prototype.push.apply(
      finalSortedAreas,
      sortByArrivalTime(tsunamiGradeSorted.Watch)
    );

    const sortedResult: ITsunamiSortedResult = {
      areas: finalSortedAreas,
      origin: resultForSort.origin!,
      receive_time: resultForSort.receive_time!,
    };
    // hnapi.info(sortedResult);
    setTsunamiInfo(sortedResult);
  } else if (parseInt(result.status) !== 0 && result.map!.areas !== null) {
    hnapi.info("Parsing preliminary tsunami info.");
    title.value = "TSUNAMI INFORMATION (PRELIMINARY)";
    reportOrigin.value = "P2P";

    const areaGeoJson = result.map!.areas?.features;
    let resultAreas: ITsunamiExpectationAreas[] = [];
    areaGeoJson?.forEach((content) => {
      if (
        content.properties.name !== "帰属未定1" &&
        content.properties.name !== "帰属未定2" &&
        content.properties.name !== "帰属未定3" &&
        content.properties.name !== "帰属未定4"
      ) {
        resultAreas.push({
          name: content.properties.name,
          grade: content.properties.grade!,
          height: "Unknown",
          time: {
            type: "no_time",
            time: "",
            status: -1,
          },
        });
      }
    });

    const finalResult: ITsunamiSortedResult = {
      areas: sortBy(resultAreas, (f) => {
        if (f.grade === "MajorWarning") {
          return 1;
        } else if (f.grade === "Warning") {
          return 2;
        } else if (f.grade === "Watch") {
          return 3;
        } else {
          // Should never reach here!
          hnapi.error("Incorrect tsunami grade", f.grade);
          return 999;
        }
      }),
      receive_time: result.map!.time!,
      origin: "P2P",
    };
    // hnapi.info(finalResult);
    setTsunamiInfo(finalResult);
  } else {
    hnapi.info("No tsunami messages.");
    resetTsunami();
  }
}

function parseTsunamiForecastInfo(result: ITsunamiInfo) {
  if (parseInt(result.status_forecast) !== 0 && result.info.areas !== null) {
    hnapi.info("Parsing detailed tsunami forecast info.");
    if (
      isEqual([], result.info.forecast_areas) ||
      result.info.forecast_areas === null
    ) {
      hnapi.warn("Forecast status is 1, but no areas available.");
      resetTsunami();
      return;
    }
    reportOrigin.value = result.info.origin!;
    const finalResult: ITsunamiSortedResult = {
      areas: result.info.forecast_areas,
      origin: result.info.origin!,
      receive_time: result.info.receive_time!,
    };
    setTsunamiInfo(finalResult);
  } else {
    hnapi.info("No tsunami forecast messages.");
    resetTsunami();
  }
}

function updateInfo() {
  hnapi
    .makeApiRequest("/api/tsunami_info", updateInterval)
    .then((result: ITsunamiInfo) => {
      // hnapi.debug(result);
      if (isEqual(lastMessage.value, result)) {
        return;
      } else {
        lastMessage.value = result;
        hnapi.debug("Updated information. Parsing.");
        if (fetchType.value === "forecast") {
          title.value = "Tsunami Forecast";
          parseTsunamiForecastInfo(result);
        } else if (fetchType.value === "information") {
          title.value = "Tsunami Information";
          parseTsunamiInfo(result);
        } else {
          hnapi.error("fetchType unknown");
        }
      }
    });
}
</script>

<style lang="scss">
@import "@/assets/colors.scss";

#main-container {
  width: 850px;
  height: 425px;
  border: 3px solid $border-color;
  box-sizing: border-box;
}

#tsunami-banner {
  height: 55px;
  display: flex;
  border-bottom: 5px solid $border-color;
}

#tsunami-show {
  box-sizing: border-box;
  width: 100%;
  height: 55px;
  background: $info-background-color;
}

#tsunami-title {
  font-family: Geometos, sans-serif;
  font-size: 28px;
  display: block;
  text-align: center;
}

#receive-title {
  font-size: 19px;
  text-align: end;
  display: block;
  margin-right: 10px;
}

#evacuate-sign {
  width: 250px;
  background: black;
  color: yellow;
  font-size: 35px;
  font-family: Geometos, sans-serif;
  line-height: 55px;
  text-align: center;
}

#tsunami-information {
  display: grid;
  grid-template-rows: repeat(8, 45px);
  width: 100%;
  height: 360px;
  background: $info-background-color;
}

.tsunami-item.information {
  display: grid;
  grid-template-columns:
    [tsunami-grade] 75px
    [tsunami-region] 310px
    [tsunami-time] 318px
    [tsunami-height] 140px;
  box-sizing: border-box;
  height: 45px;
  font-size: 18px;
  line-height: 45px;
  border-bottom: 3px solid $border-color;
  text-align: center;
  overflow: hidden;
}

.tsunami-item.forecast {
  display: grid;
  grid-template-columns:
    [tsunami-grade] 75px
    [tsunami-region] 620px
    [tsunami-height] 148px;
  box-sizing: border-box;
  height: 45px;
  font-size: 18px;
  line-height: 45px;
  border-bottom: 3px solid $border-color;
  text-align: center;
  overflow: hidden;
}

#tsunami-description {
  font-weight: bold;
  background: dimgray;
}

.tsunami-warn {
  font-weight: bolder;
  background: $tsunami-warn;
}

.major-tsunami-warn {
  font-weight: bolder;
  background: $major-tsunami-warn;
}

.tsunami-advisory {
  font-weight: bold;
  background: $map-tsunami-advisory;
  color: black;
}

.tsunami-forecast {
  font-weight: bolder;
  background: rgb(0, 170, 255);
  color: white;
}

.tsunami-unknown {
  background: $info-background-color;
  color: white;
}

#information-overlay {
  width: 840px;
  height: 45px;
  position: absolute;
  top: 200px;
  border: 3px solid black;
  background: orange;
  color: black;
  font-size: 30px;
  text-align: center;
  line-height: 45px;
}

.tsunami-time {
  font-weight: bold;
}

.tsunami-height {
  font-size: 22px;
}

.indicator {
  font-size: 18px;
}
</style>
