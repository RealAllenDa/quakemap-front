<template>
  <div v-if="props.display" class="flags">
    <span>{{ props.message }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    display: boolean;
    message: string;
  }>(),
  {
    display: false,
    message: "",
  }
);
</script>

<style lang="scss">
@import "@/assets/colors.scss";

.flags {
  padding: 6px 10px;
  font-weight: bolder;
  font-size: 13px;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 6px;
  position: absolute;
  top: 10px;
  left: 10px;
  text-align: center;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
}
</style>
