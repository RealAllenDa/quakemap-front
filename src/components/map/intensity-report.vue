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
.intensity-report {
  display: grid;
  align-content: center;
  gap: 10px;
  min-width: 0;
  padding: 16px 18px;
  overflow: hidden;
  text-align: center;
}

.intensity-report-label {
  overflow: hidden;
  color: #f7fafc;
  font-size: 36px;
  font-weight: bold;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intensity-report {
  .occur-label {
    display: block;
    overflow: hidden;
    color: #9fb0bd;
    font-size: 20px;
    line-height: 1.2;
    text-overflow: ellipsis;
  }
}
</style>
