<template>
  <div
    v-if="fetchType === 'forecast'"
    id="tsunami-description"
    class="tsunami-item forecast"
  >
    <div id="grade-indicator">Grade</div>
    <div id="region-indicator">Tsunami Forecast Region</div>
    <div id="height-indicator">Height</div>
  </div>
  <div
    v-else-if="fetchType === 'information'"
    id="tsunami-description"
    class="tsunami-item information"
  >
    <div id="grade-indicator">Grade</div>
    <div id="region-indicator">Tsunami Forecast Region</div>
    <div id="arr-time-indicator">Initial Tsunami Arrival Time</div>
    <div id="height-indicator">Height</div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  fetchType: string;
}>();
</script>
