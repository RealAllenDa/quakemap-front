<template>
  <span :class="shakeLevelClass" class="bold">Lv. {{ props.shakeLevel }}</span>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    shakeLevel: string;
  }>(),
  {
    shakeLevel: "",
  }
);

const shakeLevelClass = computed(() => {
  if (parseInt(props.shakeLevel) >= 50 && parseInt(props.shakeLevel) < 100) {
    return "shake-50";
  } else if (
    parseInt(props.shakeLevel) >= 100 &&
    parseInt(props.shakeLevel) < 500
  ) {
    return "shake-100";
  } else if (
    parseInt(props.shakeLevel) >= 500 &&
    parseInt(props.shakeLevel) < 1000
  ) {
    return "shake-500";
  } else if (
    parseInt(props.shakeLevel) >= 1000 &&
    parseInt(props.shakeLevel) < 2000
  ) {
    return "shake-1000";
  } else if (
    parseInt(props.shakeLevel) >= 2000 &&
    parseInt(props.shakeLevel) < 3000
  ) {
    return "shake-2000";
  } else if (
    parseInt(props.shakeLevel) >= 3000 &&
    parseInt(props.shakeLevel) < 4000
  ) {
    return "shake-3000";
  } else if (parseInt(props.shakeLevel) >= 4000) {
    return "shake-3000-above";
  } else {
    return "shake-default";
  }
});
</script>
