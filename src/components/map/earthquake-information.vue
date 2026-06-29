<template>
  <div :class="computedClass" class="earthquake-report sub-window">
    <time-container
      :time="eqStore.occurTime"
      :type="receiveOrOccur"
    ></time-container>
    <div class="earthquake-primary">
      <earthquake-description
        :label="'Epicenter'"
        :value="eqStore.hypocenterInfo.name"
      />
    </div>
    <div
      v-if="!(isEew && (eewStore.eewIsPlum || isAssumedHypocenter))"
      class="earthquake-metrics"
    >
      <earthquake-description
        v-if="showDepth"
        :label="'Depth'"
        :value="eqStore.hypocenterInfo.depth"
      />
      <earthquake-description
        v-if="showMagnitude"
        :label="'Magnitude'"
        :value="eqStore.magnitude"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import TimeContainer from "@/components/map/time-container.vue";
import EarthquakeDescription from "@/components/map/earthquake-description.vue";
import { useEqInfoStore } from "@/stores/eq-info";
import { computed } from "vue";
import { useEEWInfoStore } from "@/stores/eew-info";

const props = withDefaults(
  defineProps<{
    isEew: boolean;
  }>(),
  { isEew: false }
);
const eqStore = useEqInfoStore();
const eewStore = useEEWInfoStore();

const isAssumedHypocenter = computed(() => {
  return (
    parseInt(eqStore.hypocenterInfo.depth.slice(0, -2)) === 10 &&
    parseInt(eqStore.magnitude) === 1.0
  );
});

const receiveOrOccur = computed(() => {
  return props.isEew ? "Received" : "Occurred";
});

const showDepth = computed(() => {
  return (
    eqStore.hypocenterInfo.depth !== "Unknown" &&
    eqStore.hypocenterInfo.depth !== "-1km"
  );
});

const showMagnitude = computed(() => {
  return eqStore.magnitude !== "Unknown";
});

const computedClass = computed(() => {
  return props.isEew
    ? "eew-earthquake-info sub-window"
    : "earthquake-report sub-window";
});
</script>

<style lang="scss" scoped>
.earthquake-report {
  display: grid;
  grid-template-rows: min-content minmax(76px, 1fr) min-content;
  gap: 8px;
  min-width: 0;
  padding: 12px 14px;
  overflow: hidden;
}

.earthquake-primary {
  min-width: 0;
  min-height: 0;
}

.earthquake-primary :deep(.earthquake-description-row) {
  height: 100%;
  padding: 10px 12px;
}

.earthquake-primary :deep(.earthquake-description-value) {
  display: block;
  overflow: visible;
  font-size: 26px;
  text-overflow: clip;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.earthquake-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  min-width: 0;
}

.earthquake-metrics :deep(.earthquake-description-row) {
  min-height: 48px;
  padding: 3px 10px;
}

.earthquake-metrics :deep(.earthquake-description-value) {
  font-size: 28px;
}
</style>
