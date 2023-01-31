<template>
  <div id="main-container">
    <div id="tsunami-show">
      <span id="tsunami-title">Tsunami Observation Information</span>
      <span id="receive-title"
        >#{{ pageNow === -999 ? "--" : pageNow + 1 }}/{{ totalPages }} Received
        at {{ receiveTime }}</span
      >
    </div>
    <div id="tsunami-information">
      <div id="tsunami-description" class="tsunami-item">
        <div>Observation Area</div>
        <div>Forecast Time</div>
        <div>Height</div>
      </div>
      <div v-for="(i, key) in tsunamiItems" :key="key" class="tsunami-item">
        <tsunami-observation-item
          :condition="i.condition"
          :height="i.height"
          :height-condition="i.height_condition"
          :height-is-max="i.height_is_max"
          :name="i.name"
          :time="i.time"
        >
        </tsunami-observation-item>
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
  ITsunamiInfo,
  ITsunamiObservation,
  ITsunamiObservationAreas,
} from "@/interfaces/api/TsunamiInfo";
import { chunk, cloneDeep, isEqual } from "lodash";
import TsunamiObservationItem from "@/components/tsunami-observation/tsunami-observation-item.vue";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 3500;
const lastMessage = ref<ITsunamiInfo>();
const showTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const showInterval = 10000;

const splitArray = ref<ITsunamiObservationAreas[][]>();
const displayOverlay = ref(true);
const overlayText = ref("Waiting For Messages...");
const pageNow = ref(-999);
const totalPages = ref("--");
const receiveTime = ref("XXXX/XX/XX XX:XX");
const tsunamiItems = ref<ITsunamiObservationAreas[]>([]);

onMounted(async () => {
  await hnapi.initialize({}).then(() => {
    updateInfo();
    updateTimer.value = setInterval(updateInfo, updateInterval);
  });
});
onUnmounted(() => {
  if (updateTimer.value !== null) {
    clearInterval(updateTimer.value);
  }
});

function resetTsunami() {
  if (showTimer.value !== null) {
    clearTimeout(showTimer.value);
    showTimer.value = null;
  }
  displayOverlay.value = true;
  clearTsunamiInfo();
  pageNow.value = -999;
  totalPages.value = "--";
  receiveTime.value = "XXXX/XX/XX XX:XX";
}

function setWatchInfo(result: ITsunamiObservation) {
  if (showTimer.value !== null) {
    clearTimeout(showTimer.value);
    showTimer.value = null;
    clearTsunamiInfo();
  }
  displayOverlay.value = false;
  receiveTime.value = result.receive_time!;

  // Sort array
  let copiedResult = cloneDeep(result.areas!);
  let areaEntries: [string, any][][] = [];
  Object.entries(copiedResult).forEach((content) => {
    // noinspection JSCheckFunctionSignatures
    areaEntries.push(Object.entries(content[1]));
  });
  areaEntries.sort((f1, f2) => {
    var a = parseFloat(f1[1][1]);
    var b = parseFloat(f2[1][1]);
    if (isNaN(a) && isNaN(b)) {
      if (f1[3][1] === "Observing") {
        if (f2[3][1] === "Observing") {
          return 0;
        } else if (f2[3][1] === "Weak") {
          return -99;
        } else {
          hnapi.error(
            `Unexpected comparison between ${f1[3][1]} and ${f2[3][1]}`
          );
          return 0;
        }
      } else if (f1[3][1] === "Weak") {
        if (f2[3][1] === "Observing") {
          return 99;
        } else if (f2[3][1] === "Weak") {
          return 0;
        } else {
          hnapi.error(
            `Unexpected comparison between ${f1[3][1]} and ${f2[3][1]}`
          );
          return 0;
        }
      } else {
        hnapi.error(
          `Unexpected comparison between ${f1[3][1]} and ${f2[3][1]}`
        );
        return 0;
      }
    } else if (isNaN(a) && !isNaN(b)) {
      return -99;
    } else if (!isNaN(a) && isNaN(b)) {
      return 99;
    } else {
      return a - b;
    }
  });
  areaEntries = areaEntries.reverse();
  let areaSorted: ITsunamiObservationAreas[] = [];
  areaEntries.forEach((content) => {
    areaSorted.push(Object.fromEntries(content) as ITsunamiObservationAreas);
  });
  setTsunamiInfo(areaSorted);
}

function clearTsunamiInfo() {
  tsunamiItems.value = [];
}

function showTsunamiInfo() {
  clearTsunamiInfo();
  pageNow.value++;
  if (pageNow.value > parseInt(totalPages.value) - 1) {
    pageNow.value = 0;
  }
  tsunamiItems.value = splitArray.value![pageNow.value];
}

function setTsunamiInfo(result: ITsunamiObservationAreas[]) {
  splitArray.value = chunk(result, 7);
  totalPages.value = splitArray.value.length.toString();
  pageNow.value = -1;

  showTsunamiInfo();
  showTimer.value = setInterval(showTsunamiInfo, showInterval);
}

function updateInfo() {
  hnapi
    .makeApiRequest("/api/tsunami_info", updateInterval)
    .then((result: ITsunamiInfo) => {
      if (isEqual(lastMessage.value, result)) {
        return;
      } else {
        lastMessage.value = result;
      }
      if (result.watch.receive_time === null) {
        hnapi.warn("null receive time - probably no message");
        resetTsunami();
      } else {
        setWatchInfo(result.watch);
      }
    });
}
</script>

<style lang="scss">
@import "@/assets/colors.scss";

#main-container {
  width: 850px;
  height: 420px;
  border: 3px solid $border-color;
  box-sizing: border-box;
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

#tsunami-information {
  display: grid;
  grid-template-rows: repeat(8, 45px);
  width: 100%;
  height: 360px;
  background: $info-background-color;
}

.tsunami-item {
  display: grid;
  grid-template-columns:
    [tsunami-region] 310px
    [tsunami-time] 224px
    [tsunami-height] 255px
    [status] 55px;
  box-sizing: border-box;
  height: 45px;
  font-size: 22px;
  line-height: 45px;
  border-bottom: 3px solid $border-color;
  text-align: center;
  overflow: hidden;
}

#tsunami-description {
  font-weight: bold;
  background: dimgray;
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

.rising-icon {
  width: 37px;
  height: 43px;
}

.rising-alert {
  font-weight: bolder;
  background: orange;
  color: black;
}

.major-warning {
  font-weight: bolder;
  background: black;
  color: yellow;
}

.warning {
  font-weight: bolder;
  background: $map-tsunami-warn;
}

.advisory {
  font-weight: bold;
  color: black;
  background: $map-tsunami-advisory;
}

.big-height {
  font-size: 25px;
}

.indicator {
  font-size: 18px;
}
</style>
