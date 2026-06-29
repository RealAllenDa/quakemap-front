<template>
  <div :class="store.getEewType.className" class="eew-banner">
    <span>{{ store.getEewType.text }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useEEWInfoStore } from "@/stores/eew-info";

const store = useEEWInfoStore();
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

.eew-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 28, 0.82);
  font-size: 18px;
  text-align: center;
  overflow: hidden;
  font-weight: bolder;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.deep-earthquake {
  background: #c37807;
}
</style>
