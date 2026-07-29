<template>
  <div :class="metricClass" class="earthquake-description-row">
    <span class="earthquake-description-label">{{ props.label }}</span>
    <span class="earthquake-description-value">
      <template v-if="formattedValue.unit !== ''">
        <span class="earthquake-description-number">
          {{ formattedValue.number }}
        </span>
        <span class="earthquake-description-unit">{{
          formattedValue.unit
        }}</span>
      </template>
      <template v-else>{{ props.value }}</template>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: string;
}>();

const formattedValue = computed(() => {
  if (props.label === "Depth" && props.value.endsWith("km")) {
    return {
      number: props.value.slice(0, -2),
      unit: "km",
    };
  }
  if (props.label === "Magnitude") {
    return {
      number: props.value,
      unit: "M",
    };
  }
  return {
    number: props.value,
    unit: "",
  };
});

const metricClass = computed(() => ({
  "earthquake-description-row--metric": formattedValue.value.unit !== "",
  "earthquake-description-row--magnitude": props.label === "Magnitude",
}));
</script>

<style scoped>
.earthquake-description-row {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: min-content minmax(0, 1fr);
  gap: 5px;
  min-height: 0;
  overflow: hidden;
  padding: 9px 11px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
  align-items: center;
  justify-items: center;
}

.earthquake-description-label {
  color: #9fb0bd;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.earthquake-description-value {
  min-width: 0;
  overflow: hidden;
  color: #f7fafc;
  font-size: 21px;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.earthquake-description-row--metric .earthquake-description-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.earthquake-description-row--magnitude .earthquake-description-value {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.earthquake-description-number {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.earthquake-description-unit {
  color: #c9d4da;
  font-size: 0.62em;
  font-weight: 900;
  text-transform: uppercase;
}
</style>
