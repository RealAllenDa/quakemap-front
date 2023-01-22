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
  padding: 5px;
  font-weight: bolder;
  font-size: 20px;
  border: 2px solid $intensity-1;
  position: absolute;
  top: 20px;
  left: 10px;
  text-align: center;
}
</style>
