<template>
  <div
    :style="{
      color: pointClass[2],
    }"
  >
    <span
      :style="{
        background: pointClass[1],
      }"
      >{{ props.description }}</span
    >
    <span
      :style="{
        background: pointClass[0],
      }"
      >{{ props.pointsCount }}</span
    >
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import hnapi from "@/assets/hnapi";

const props = withDefaults(
  defineProps<{
    description: string;
    pointsCount: string;
  }>(),
  {
    description: "",
    pointsCount: "",
  }
);

const pointClass = computed(() => {
  if (props.description === "Green") {
    if (parseInt(props.pointsCount) >= 350) {
      return ["var(--green-warn)", "var(--green-warn-label)", "black"];
    } else {
      return [
        "var(--info-background-color)",
        "var(--info-background-color)",
        "white",
      ];
    }
  } else if (props.description === "Yellow") {
    if (parseInt(props.pointsCount) >= 30) {
      return ["var(--yellow-warn)", "var(--yellow-warn-label)", "black"];
    } else {
      return [
        "var(--info-background-color)",
        "var(--info-background-color)",
        "white",
      ];
    }
  } else if (props.description === "Red") {
    if (parseInt(props.pointsCount) >= 5) {
      return ["var(--red-warn)", "var(--red-warn-label)", "black"];
    } else {
      return [
        "var(--info-background-color)",
        "var(--info-background-color)",
        "white",
      ];
    }
  } else {
    hnapi.error("Exhaustive handling of pointClass");
    return [
      "var(--info-background-color)",
      "var(--info-background-color)",
      "white",
    ];
  }
});
</script>
