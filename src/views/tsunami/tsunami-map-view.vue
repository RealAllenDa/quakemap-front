<template>
  <main
    :class="{ 'tsunami-map-page--tour': toursEnabled }"
    class="tsunami-map-page"
  >
    <tsunami-map
      v-if="mapReady"
      id="main"
      :fetch-type="fetchType"
      :tours-enabled="toursEnabled"
      :tsunami-info="lastMessage"
      @grades-change="setCurrentGrades"
    ></tsunami-map>
    <div v-else class="tsunami-map-loading">Loading tsunami map</div>

    <section aria-label="Map data layers" class="tsunami-data-panel">
      <div class="tsunami-legend-columns">
        <div class="tsunami-legend-column">
          <span class="tsunami-map-received">Received {{ receiveTime }}</span>
          <div class="tsunami-data-row">
            <span class="legend-label">
              <span>3m</span>
            </span>
            <div>
              <span class="tsunami-data-label">Expected Height</span>
              <span class="tsunami-data-value">Coastline labels</span>
            </div>
          </div>
          <div class="tsunami-data-row">
            <span class="legend-point"></span>
            <div>
              <span class="tsunami-data-label">Observed Height</span>
              <span class="tsunami-data-value">Coastline points</span>
            </div>
          </div>
        </div>
        <div class="tsunami-legend-column">
          <tsunami-map-legends
            :current-grades="currentGrades"
          ></tsunami-map-legends>
        </div>
      </div>
    </section>
  </main>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import hnapi from "@/assets/hnapi";
import type { IMapLegend, ITsunamiInfo } from "@/interfaces/api/TsunamiInfo";
import TsunamiMap from "@/components/tsunami-map/tsunami-map.vue";
import TsunamiMapLegends from "@/components/tsunami-map/tsunami-map-legends.vue";
import { isEqual } from "lodash";
import { useRoute } from "vue-router";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 3500;
const fetchType = ref("");
const mapReady = ref(false);
const firstTime = ref(true);
const lastMessage = ref<ITsunamiInfo>();
const receiveTime = ref("XXXX-XX-XX XX:XX");
const route = useRoute();
const toursEnabled = computed(() => queryFlagEnabled(route.query.tour));

const currentGrades = ref<IMapLegend>({
  Advisory: false,
  Warning: false,
  MajorWarning: false,
  Forecast: false,
});

onMounted(async () => {
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
});

function setCurrentGrades(grades: IMapLegend) {
  currentGrades.value = grades;
}

function setMapInfo(result: ITsunamiInfo) {
  if (fetchType.value === "forecast") {
    if (
      result.info.forecast_areas === null &&
      parseInt(result.status_forecast) !== 1
    ) {
      hnapi.warn("Info does not contain forecast info/Info not available");
      receiveTime.value = "XXXX-XX-XX XX:XX";
      lastMessage.value = undefined;
      return;
    }
    receiveTime.value = result.info.receive_time ?? "XXXX-XX-XX XX:XX";
    lastMessage.value = result;
    return;
  }

  if (
    result.info.areas === null &&
    result.map === null &&
    parseInt(result.status) !== 1
  ) {
    hnapi.warn("Info does not contain map info/Info not available");
    receiveTime.value = "XXXX-XX-XX XX:XX";
    lastMessage.value = undefined;
    return;
  }

  receiveTime.value =
    result.info.receive_time ?? result.map?.time ?? "XXXX-XX-XX XX:XX";
  lastMessage.value = result;
}

function updateInfo() {
  hnapi
    .makeApiRequest("/api/tsunami_info", updateInterval)
    .then((result: ITsunamiInfo) => {
      if (firstTime.value) {
        setMapInfo(result);
        firstTime.value = false;
        return;
      }
      if (isEqual(lastMessage.value, result)) {
        hnapi.debug("Identical information. No need to update.");
        return;
      }
      setMapInfo(result);
    });
}

function queryFlagEnabled(value: unknown) {
  if (value === undefined) {
    return false;
  }
  const firstValue = Array.isArray(value) ? value[0] : value;
  if (firstValue === null) {
    return true;
  }
  if (typeof firstValue !== "string") {
    return false;
  }
  return ["", "1", "true", "yes", "on"].includes(firstValue.toLowerCase());
}
</script>

<style lang="scss">
@import "@/assets/colors.scss";

.tsunami-map-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #202632;
}

.tsunami-map-page::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(
      180deg,
      rgba(7, 11, 17, 0.54) 0,
      rgba(7, 11, 17, 0.12) 30%,
      rgba(7, 11, 17, 0) 52%
    ),
    radial-gradient(
      circle at 24% 100%,
      rgba(51, 196, 165, 0.16),
      rgba(51, 196, 165, 0) 34%
    );
}

.tsunami-map-received {
  display: block;
  min-width: 0;
  padding: 2px 5px 4px;
  color: #d8e2ea;
  font-size: 12px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsunami-data-panel {
  position: absolute;
  left: 22px;
  bottom: 22px;
  z-index: 3;
  width: min(425px, calc(100vw - 44px));
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(13, 19, 26, 0.72);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
}

.tsunami-legend-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 1fr);
  gap: 10px;
  align-items: start;
}

.tsunami-legend-column {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.tsunami-data-row {
  display: grid;
  grid-template-columns: 42px 1fr;
  align-items: center;
  min-height: 42px;
  padding: 3px 5px;
}

.tsunami-data-label,
.tsunami-data-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsunami-data-label {
  color: #f7fafc;
  font-size: 13px;
  line-height: 1.2;
}

.tsunami-data-value {
  margin-top: 3px;
  color: #9fb0bd;
  font-size: 12px;
  line-height: 1.2;
}

.legend-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-left: 3px solid $map-tsunami-warn;
  border-radius: 6px;
  background: rgba(12, 18, 25, 0.84);
  box-shadow: 0 10px 22px rgba(222, 51, 41, 0.3);
  color: $map-tsunami-warn;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.legend-point {
  width: 16px;
  height: 16px;
  margin-left: 10px;
  display: block;
  border-radius: 50%;
  background: #33c4a5;
  border: 2px solid #ffffff;
  box-shadow: 0 10px 22px rgba(51, 196, 165, 0.38);
}

.tsunami-map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #d8e2ea;
  font-size: 15px;
  background: #202632;
}

.tsunami-map-page .maplibregl-ctrl-bottom-right {
  right: 18px;
  bottom: 18px;
  z-index: 4;
}

.tsunami-map-page .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(13, 19, 26, 0.76);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.tsunami-map-page .maplibregl-ctrl button {
  width: 36px;
  height: 36px;
  background-color: transparent;
}

.tsunami-map-page .maplibregl-ctrl-icon {
  filter: invert(1) brightness(1.35);
}

.tsunami-map-page .maplibregl-ctrl button + button {
  border-top-color: rgba(255, 255, 255, 0.12);
}

@media (max-width: 760px) {
  .tsunami-data-panel {
    left: 12px;
    bottom: 58px;
    width: min(300px, calc(100vw - 24px));
  }

  .tsunami-legend-columns {
    grid-template-columns: 1fr;
  }
}
</style>
