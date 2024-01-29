<template>
  <div class="intensity-wrapper">
    <div
      v-if="computedIntensity !== '--'"
      :class="'intensity-' + computedClass"
      class="intensity-icon"
    >
      <span class="intensity-label">Maximum Int.</span>
      <div class="intensity">
        <span v-if="addThings !== ''" style="margin-left: 30px">
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
    <div :class="'intensity-' + computedLgClass" class="intensity-icon">
      <span class="lg-intensity-label">
        Maximum <br />
        Long-Period Int.
      </span>
      <div class="intensity">
        <span style="margin-left: 20px">{{ eqStore.maximumLgIntensity }}</span>
      </div>
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
const computedLgClass = computed(() => {
  switch (eqStore.maximumLgIntensity) {
    case "1":
      return "2";
    case "2":
      return "4";
    case "3":
      return "7";
    case "4":
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

.intensity-wrapper {
  width: 275px;
  display: flex;
  flex-direction: column;
}

.intensity-icon {
  width: 100%;
  height: 50%;
  box-sizing: border-box;
  border: 4px solid $border-color;
  background: $intensity-0;
}

.intensity {
  display: inline-block;

  span {
    display: inline-block;
    font-size: 55px;
    font-weight: bolder;
    font-style: italic;
  }
}

.explanation-foreign {
  font-size: 25px !important;
  margin-left: 95px;
}

.explanation-eruption {
  font-size: 25px !important;
  margin-left: 85px;
}

.explanation-deep {
  font-size: 25px !important;
  margin-left: 95px;
}

.explanation-plum {
  font-size: 25px !important;
  margin-left: 95px;
}

.explanation-virtual {
  font-size: 22px !important;
  margin-left: 10px;
}

.explanation-unknown {
  font-size: 22px !important;
  margin-left: 10px;
  margin-top: 5px;
}

.intensity-label {
  font-size: 20px;
  font-weight: bold;
  display: inline-block;
  padding-left: 15px;
}

.lg-intensity-label {
  font-size: 20px;
  font-weight: bold;
  display: inline-block;
  padding-left: 15px;
}

.intensity-unknown {
  .intensity-label {
    padding-left: 10px !important;
    padding-top: 5px !important;
  }
}

.intensity-add {
  font-size: 35px !important;
  position: relative;
  bottom: 20px;
}

.eew-intensity-add {
  font-size: 45px !important;
  position: relative;
  bottom: 20px;
}

.margin-add {
  margin-left: 45px;
}
</style>
