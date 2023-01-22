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
  background: $info-background-color;
  border: 4px solid $border-color;
  font-size: 20px;
  text-align: center;
  overflow: hidden;
  line-height: 40px;
  font-weight: bolder;
}

.deep-earthquake {
  background: #c37807;
}
</style>
