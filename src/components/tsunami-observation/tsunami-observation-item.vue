<template>
  <div>{{ props.name }}</div>
  <div>{{ props.condition !== "Observing" ? props.time : "" }}</div>
  <div :class="heightClass" v-html="height"></div>
  <div v-if="heightCondition === 'Rising'" class="rising-alert">
    <img :src="risingSvg" alt="RISING" class="rising-icon" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import risingSvg from "@/assets/rising.svg";

const props = defineProps<{
  name: string;
  time: string;
  condition: string;
  height: string;
  heightIsMax: boolean;
  heightCondition: string;
}>();

const height = computed(() => {
  let height = "";
  if (props.condition === "None") {
    if (props.heightIsMax) {
      height += "Over ";
    }
    const heightInM = Math.floor(parseFloat(props.height));
    const heightInCM = Math.round(
      (parseFloat(parseFloat(props.height).toFixed(2)) - heightInM) * 100
    );
    if (heightInM !== 0) {
      height += heightInM + "<span class='indicator'>m</span> ";
    }
    if (heightInCM !== 0) {
      height += heightInCM + "<span class='indicator'>cm</span>";
    }
    return height;
  } else {
    return props.condition;
  }
});

const heightClass = computed(() => {
  let classes = "";
  if (props.condition === "None") {
    classes += "big-height";
  }
  if (parseFloat(props.height) >= 3) {
    classes += " major-warning";
  } else if (parseFloat(props.height) >= 1) {
    classes += " warning";
  } else if (parseFloat(props.height) >= 0.5) {
    classes += " advisory";
  }
  return classes;
});
</script>
