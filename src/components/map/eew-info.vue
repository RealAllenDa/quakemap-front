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
  display: flex;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 28, 0.78);
}

.report-number {
  width: 80px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 80px;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(70, 100, 110, 0.88);
  text-align: center;
  font-size: 23px;
  font-weight: bolder;
}

.eew-advice {
  width: auto;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  padding: 0 16px;
  overflow: hidden;
  background: rgba(17, 24, 28, 0.72);
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deep-earthquake {
  background: rgb(195, 120, 7);
}
</style>
