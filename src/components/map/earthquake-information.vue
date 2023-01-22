<template>
  <div :class="computedClass" class="earthquake-report sub-window">
    <time-container
      :time="eqStore.occurTime"
      :type="receiveOrOccur"
    ></time-container>
    <earthquake-description
      :label="'Epicenter'"
      :value="eqStore.hypocenterInfo.name"
    />
    <template v-if="!(isEew && eewStore.eewIsPlum)">
      <earthquake-description
        v-if="eqStore.hypocenterInfo.depth !== 'Unknown'"
        :label="'Depth'"
        :value="eqStore.hypocenterInfo.depth"
      />
      <earthquake-description
        v-if="eqStore.magnitude !== 'Unknown'"
        :label="'M'"
        :value="eqStore.magnitude"
      />
    </template>
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

const receiveOrOccur = computed(() => {
  return props.isEew ? "Received" : "Occurred";
});

const computedClass = computed(() => {
  return props.isEew
    ? "eew-earthquake-info sub-window"
    : "earthquake-report sub-window";
});
</script>

<style lang="scss" scoped>
.earthquake-report {
  display: flex;
  flex-direction: column;
}
</style>
