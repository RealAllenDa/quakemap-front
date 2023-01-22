<template>
  <div :class="'intensity-' + computedClass" class="intensity-icon">
    <span class="intensity-label">Maximum Int.</span>
    <div class="intensity">
      <span
        v-if="addThings !== '' || eqStore.maximumIntensity === '--'"
        style="margin-left: 5px"
      >
        {{ computedIntensity }}
      </span>
      <span v-else class="margin-add">{{ computedIntensity }}</span>
      <span v-if="addThings !== ''" :class="intensityAddClass">{{
        addThings
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useEqInfoStore } from "@/stores/eq-info";
import { computed } from "vue";

const eqStore = useEqInfoStore();
const props = withDefaults(
  defineProps<{
    isEew?: boolean;
  }>(),
  { isEew: false }
);

const intensityAddClass = computed(() => {
  return props.isEew ? "eew-intensity-add" : "intensity-add";
});
const computedIntensity = computed(() => {
  switch (eqStore.maximumIntensity) {
    case "5-":
    case "5+":
      return "5";
    case "6-":
    case "6+":
      return "6";
    default:
      return eqStore.maximumIntensity;
  }
});
const computedClass = computed(() => {
  switch (eqStore.maximumIntensity) {
    case "1":
    case "2":
    case "3":
    case "4":
      return eqStore.maximumIntensity;
    case "5-":
      return "5";
    case "5+":
      return "6";
    case "6-":
      return "7";
    case "6+":
      return "8";
    case "7":
      return "9";
    default:
      return "unknown";
  }
});
const addThings = computed(() => {
  if (eqStore.maximumIntensity.indexOf("+") === 1) {
    return "+";
  } else if (eqStore.maximumIntensity.indexOf("-") === 1) {
    return "-";
  } else {
    return "";
  }
});
</script>

<style lang="scss" scoped>
@import "@/assets/generic.scss";

.intensity-icon {
  width: 275px;
  height: 100%;
  box-sizing: border-box;
  border: 4px solid $border-color;
  background: $intensity-0;
}

.intensity {
  display: inline-block;

  span {
    display: inline-block;
    font-size: 95px;
    font-weight: bolder;
    font-style: italic;
  }
}

.intensity-label {
  font-size: 20px;
  font-weight: bold;
  display: inline-block;
  padding-left: 15px;
  padding-top: 85px;
}

.intensity-add {
  font-size: 75px !important;
  position: absolute;
  top: 10px;
  left: 217px;
}

.eew-intensity-add {
  font-size: 75px !important;
  position: absolute;
  top: 540px;
  left: 217px;
}

.margin-add {
  margin-left: 15px;
}
</style>
