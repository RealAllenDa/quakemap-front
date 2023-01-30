<template>
  <div id="legends">
    <div v-if="props.currentGrades.MajorWarning">
      <span id="major-demo" class="legend-color">PURPLE</span>
      <span class="legend-description">Major Tsunami Warning</span>
    </div>
    <div v-if="props.currentGrades.Warning">
      <span id="warn-demo" class="legend-color">RED</span>
      <span class="legend-description">Tsunami Warning</span>
    </div>
    <div v-if="props.currentGrades.Advisory">
      <span id="adv-demo" class="legend-color">YELLOW</span>
      <span class="legend-description">Tsunami Advisory</span>
    </div>
    <div v-if="props.currentGrades.Forecast">
      <span id="fc-demo" class="legend-color">BLUE</span>
      <span class="legend-description">Tsunami Forecast</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { IMapLegend } from "@/interfaces/api/TsunamiInfo";

const props = defineProps<{
  currentGrades: IMapLegend;
}>();
</script>

<style lang="scss">
@import "@/assets/colors.scss";

#legends {
  width: 275px;
  height: fit-content;
  position: absolute;
  top: 350px;
  left: 565px;
  z-index: 9999;
  background: rgba(29, 32, 37, 0.5);
}

.legend-color {
  width: 80px;
  height: 30px;
  margin: 3px;
  font-weight: bolder;
  text-align: center;
  line-height: 30px;
}

#major-demo {
  background: $map-major-tsunami-warn;
}

#warn-demo {
  background: $map-tsunami-warn;
}

#adv-demo {
  background: $map-tsunami-advisory;
  color: black;
}

#fc-demo {
  background: $map-tsunami-forecast;
  color: black;
}

#legends div {
  display: flex;
}

.legend-description {
  line-height: 36px;
  text-align: center;
  width: 195px;
}
</style>
