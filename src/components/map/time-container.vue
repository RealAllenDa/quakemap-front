<template>
  <span class="occur-label">{{ props.type }} at {{ props.time }}</span>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    type?: string;
    time: string;
  }>(),
  {
    type: "Occurred",
    time: "",
  }
);
</script>

<style lang="scss" scoped>
.occur-label {
  width: fit-content;
  font-size: 16px;
  position: relative;
  left: 175px;
  top: 5px;
}
</style>
