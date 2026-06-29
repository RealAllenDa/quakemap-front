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
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: max-content;
  max-width: 100%;
  margin-left: auto;
  padding: 5px 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  color: #b7c6cf;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-align: right;
  text-overflow: ellipsis;
}
</style>
