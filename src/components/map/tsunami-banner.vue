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
const store = useEqInfoStore();
const show = computed(() => {
  return props.type === "foreign"
    ? store.tsunamiCommentsForeign !== "None"
    : true;
});

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
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 28, 0.72);
  font-size: 17px;
  text-align: center;
  overflow: hidden;
  font-weight: bolder;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.banner-foreign {
  width: 100% !important;
  height: 45px !important;
  z-index: 999999;
}

.no-tsunami {
  //color: white !important;
  //background: #6685cc !important;
}

.risk-evaluating {
  color: white !important;
  background: $intensity-6 !important;
}
</style>
