<template>
  <div>
    <span>{{ props.description }}</span>
    <span>{{ props.pointsCount }}</span>
  </div>
</template>

<script lang="ts" setup>
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
</script>
