<template>
  <div class="sub-window intensity-report">
    <span class="intensity-report-label">Intensity Report</span>
    <span class="occur-label">Occurred at {{ store.occurTime }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useEqInfoStore } from "@/stores/eq-info";

const store = useEqInfoStore();
</script>

<style lang="scss">
.intensity-report-label {
  font-size: 42px;
  font-weight: bold;
  position: relative;
  top: 25px;
  left: 75px;
}

.intensity-report {
  .occur-label {
    font-size: 20px;
    display: inline-block;
    left: 110px;
    top: 33px;
    position: relative;
  }
}
</style>
