<template>
  <div>
    <span class="label">{{ props.label }}</span>
    <span class="label-content">{{ props.value }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  label: string;
  value: string;
}>();
</script>

<style scoped>
div {
  align-items: center;
  display: flex;
  margin-top: 5px;
  box-sizing: border-box;
  overflow: hidden;
}
</style>
