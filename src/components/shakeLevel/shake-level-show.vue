<template>
  <span class="bold">Lv. {{ props.shakeLevel }}</span>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    shakeLevel: string;
  }>(),
  {
    shakeLevel: "",
  }
);
</script>
