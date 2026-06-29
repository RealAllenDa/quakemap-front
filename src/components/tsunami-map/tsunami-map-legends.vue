<template>
  <div class="tsunami-grade-legend">
    <div
      v-if="props.currentGrades.MajorWarning"
      class="tsunami-grade-item tsunami-grade-item-major"
    >
      <span class="tsunami-grade-swatch"></span>
      <span>Major Warning</span>
    </div>
    <div
      v-if="props.currentGrades.Warning"
      class="tsunami-grade-item tsunami-grade-item-warning"
    >
      <span class="tsunami-grade-swatch"></span>
      <span>Warning</span>
    </div>
    <div
      v-if="props.currentGrades.Advisory"
      class="tsunami-grade-item tsunami-grade-item-advisory"
    >
      <span class="tsunami-grade-swatch"></span>
      <span>Advisory</span>
    </div>
    <div
      v-if="props.currentGrades.Forecast"
      class="tsunami-grade-item tsunami-grade-item-forecast"
    >
      <span class="tsunami-grade-swatch"></span>
      <span>Forecast</span>
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

.tsunami-grade-legend {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.tsunami-grade-item {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  min-height: 42px;
  padding: 0 11px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  color: #f7fafc;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;

  span:last-child {
    white-space: normal;
  }
}

.tsunami-grade-swatch {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.tsunami-grade-item-major .tsunami-grade-swatch {
  background: $map-major-tsunami-warn;
}

.tsunami-grade-item-warning .tsunami-grade-swatch {
  background: $map-tsunami-warn;
}

.tsunami-grade-item-advisory .tsunami-grade-swatch {
  background: $map-tsunami-advisory;
}

.tsunami-grade-item-forecast .tsunami-grade-swatch {
  background: $map-tsunami-forecast;
}

@media (max-width: 680px) {
  .tsunami-grade-item {
    min-height: 34px;
    font-size: 13px;
  }
}
</style>
