<template>
  <div v-if="show" :class="className" class="sub-window banner-description">
    <span>{{ tsunamiComments.text }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useEqInfoStore } from "@/stores/eq-info";
import { computed } from "vue";

const props = defineProps<{
  type: string;
}>();
const show = true;
const store = useEqInfoStore();

const tsunamiComments = computed(() => {
  return props.type === "foreign"
    ? store.foreignLookupTable[store.tsunamiCommentsForeign]
    : store.domesticLookupTable[store.tsunamiCommentsDomestic];
});
const className = computed(() => {
  return props.type === "foreign"
    ? `banner-foreign ${tsunamiComments.value.className}`
    : `${tsunamiComments.value.className}`;
});
</script>

<style lang="scss">
@import "@/assets/colors.scss";

.banner-description {
  background: $info-background-color;
  border: 4px solid $border-color;
  font-size: 20px;
  text-align: center;
  overflow: hidden;
  line-height: 40px;
  font-weight: bolder;
}

.banner-foreign {
  width: 750px !important;
  height: 40px !important;
  z-index: 999999;
  border-top: 0 !important;
}

.no-tsunami {
  color: white !important;
  background: #6cc !important;
}

.risk-evaluating {
  color: white !important;
  background: $intensity-6 !important;
}
</style>
