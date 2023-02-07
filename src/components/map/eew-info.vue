<template>
  <div class="eew-information sub-window">
    <span class="report-number">{{ store.eewReportNum }}</span>
    <span :class="store.getEewAdvice.className" class="eew-advice">{{
      store.getEewAdvice.text
    }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useEEWInfoStore } from "@/stores/eew-info";

const store = useEEWInfoStore();
</script>

<style lang="scss">
@import "@/assets/colors.scss";

.eew-information {
  border: 4px solid $border-color;
  overflow: hidden;
  line-height: 36px;
  display: flex;
}

.report-number {
  width: 80px;
  height: 100%;
  background: $intensity-1;
  border-right: 4px solid $border-color;
  text-align: center;
  font-weight: bolder;
  font-size: 23px;
}

.eew-advice {
  width: 675px;
  height: 100%;
  background: $info-background-color;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}

.deep-earthquake {
  background: rgb(195, 120, 7);
}
</style>
