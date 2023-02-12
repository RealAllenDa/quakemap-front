<template>
  <div
    v-if="computedIntensity !== '--'"
    :class="'intensity-' + computedClass"
    class="intensity-icon"
  >
    <span class="intensity-label">Maximum Int.</span>
    <div class="intensity">
      <span v-if="addThings !== ''" style="margin-left: 5px">
        {{ computedIntensity }}
      </span>
      <span v-else class="margin-add">{{ computedIntensity }}</span>
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
      return ["Assumed Epicenter", "explanation-virtual"];
    }
  }
  return ["Unknown", "explanation-unknown"];
});
const intensityAddClass = computed(() => {
  return props.isEew ? "eew-intensity-add" : "intensity-add";
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

.explanation-foreign {
  font-size: 66px !important;
  margin-left: 10px;
  margin-top: 5px;
}

.explanation-eruption {
  font-size: 60px !important;
  margin-left: 10px;
  margin-top: 5px;
}

.explanation-deep {
  font-size: 70px !important;
  margin-left: 50px;
}

.explanation-plum {
  font-size: 70px !important;
  margin-left: 30px;
  margin-top: 5px;
}

.explanation-virtual {
  font-size: 66px !important;
  margin-left: 10px;
  margin-top: 5px;
}

.explanation-unknown {
  font-size: 56px !important;
  margin-left: 10px;
  margin-top: 5px;
}

.intensity-label {
  font-size: 20px;
  font-weight: bold;
  display: inline-block;
  padding-left: 15px;
  padding-top: 85px;
}

.intensity-unknown {
  .intensity-label {
    padding-left: 10px !important;
    padding-top: 5px !important;
  }
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
