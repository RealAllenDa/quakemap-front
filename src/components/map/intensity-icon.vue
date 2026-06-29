<template>
  <div
    v-if="computedIntensity !== '--'"
    :class="'intensity-' + computedClass"
    class="intensity-icon"
  >
    <span class="intensity-label">Maximum Intensity</span>
    <div aria-label="Maximum intensity" class="intensity">
      <span class="intensity-number">{{ computedIntensity }}</span>
      <span v-if="addThings !== ''" :class="intensityAddClass">{{
        addThings
      }}</span>
    </div>
  </div>
  <div v-else class="intensity-unknown intensity-icon">
    <span class="intensity-label">Intensity Unknown</span>
    <div class="intensity">
      <span :class="intensityExplanation[1]" class="intensity-explanation">{{
        intensityExplanation[0]
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useEqInfoStore } from "@/stores/eq-info";
import { computed } from "vue";
import { useEEWInfoStore } from "@/stores/eew-info";

const eqStore = useEqInfoStore();
const eewStore = useEEWInfoStore();
const props = withDefaults(
  defineProps<{
    isEew?: boolean;
  }>(),
  { isEew: false }
);

const intensityExplanation = computed(() => {
  if (eqStore.currentType === "Unknown" && eqStore.maximumIntensity === "--") {
    // Uninitialized
    return ["", ""];
  }
  if (eqStore.currentType === "Foreign") {
    if (
      eqStore.hypocenterInfo.depth === "Unknown" &&
      eqStore.magnitude === "Unknown"
    ) {
      return ["Eruption", "explanation-eruption"];
    } else {
      return ["Foreign", "explanation-foreign"];
    }
  }
  if (parseInt(eqStore.hypocenterInfo.depth.slice(0, -2)) >= 100) {
    return ["Deep", "explanation-deep"];
  }
  if (eewStore.showEew) {
    // EEW in effect
    if (eewStore.eewIsPlum) {
      return ["PLUM", "explanation-plum"];
    } else if (
      parseInt(eqStore.hypocenterInfo.depth.slice(0, -2)) === 10 &&
      parseInt(eqStore.magnitude) === 1.0
    ) {
      // Probably virtual epicenter
      return ["Hypothetical Epicenter", "explanation-virtual"];
    }
  }
  return ["Hypothetical Epicenter", "explanation-virtual"];
});
const computedIntensity = computed(() => {
  switch (eqStore.maximumIntensity) {
    case "0":
      return "--";
    case "-1":
      return "--";
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
const intensityAddClass = computed(() => [
  props.isEew ? "eew-intensity-add" : "intensity-add",
  addThings.value === "+" ? "intensity-add-up" : "intensity-add-down",
]);
</script>

<style lang="scss" scoped>
@import "@/assets/generic.scss";

.intensity-icon {
  position: relative;
  isolation: isolate;
  width: 275px;
  height: 100%;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 12px 16px;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  background: $intensity-0;
  box-shadow: inset -1px 0 rgba(0, 0, 0, 0.18);
}

.intensity-icon::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
  background: radial-gradient(
      circle at 50% 35%,
      rgba(255, 255, 255, 0.28),
      transparent 48%
    ),
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.2));
}

.intensity-label,
.intensity {
  position: relative;
  z-index: 1;
}

.intensity {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  transform: translateY(10px);

  span {
    display: inline-block;
    font-weight: bolder;
    font-style: italic;
    line-height: 1.2;
  }
}

.intensity-number {
  font-size: 112px;
  letter-spacing: 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.24);
}

.explanation-foreign {
  font-size: 58px !important;
}

.explanation-eruption {
  font-size: 54px !important;
}

.explanation-deep {
  font-size: 68px !important;
}

.explanation-plum {
  font-size: 70px !important;
}

.explanation-virtual {
  font-size: 32px !important;
  text-align: center;
}

.explanation-unknown {
  font-size: 56px !important;
}

.intensity-label {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: inline-block;
  width: max-content;
  max-width: 100%;
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(7, 12, 15, 0.34);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  text-transform: uppercase;
}

.intensity-unknown {
  .intensity-label {
    padding: 5px 8px !important;
  }
}

.intensity-add {
  font-size: 52px !important;
  position: static;
  margin-left: 4px;
}

.eew-intensity-add {
  font-size: 52px !important;
  position: static;
  margin-left: 4px;
}
</style>
