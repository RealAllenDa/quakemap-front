<template>
  <div class="earthquake-description">
    <intensity-icon></intensity-icon>
    <div class="earthquake-info sub-window">
      <intensity-report
        v-if="eqStore.currentType === 'ScalePrompt'"
      ></intensity-report>
      <earthquake-information v-else :is-eew="false"></earthquake-information>
    </div>
  </div>
</template>

<script lang="ts" setup>
import IntensityIcon from "@/components/map/intensity-icon.vue";
import IntensityReport from "@/components/map/intensity-report.vue";
import EarthquakeInformation from "@/components/map/earthquake-information.vue";
import { useEqInfoStore } from "@/stores/eq-info";

const eqStore = useEqInfoStore();
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

.earthquake-description {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
  background: rgba(17, 24, 28, 0.82);
}

.earthquake-info {
  width: calc(100% - 275px);
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 28, 0.72);
}
</style>
