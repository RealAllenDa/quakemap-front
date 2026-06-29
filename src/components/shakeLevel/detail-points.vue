<template>
  <div
    :class="[
      'detail-point',
      pointConfig.className,
      { 'detail-point--active': isActive },
    ]"
  >
    <div class="detail-point__meta">
      <span class="detail-point__label">{{ props.description }}</span>
      <span class="detail-point__threshold">{{ pointConfig.threshold }}+</span>
    </div>
    <strong class="detail-point__count">{{ props.pointsCount }}</strong>
    <span class="detail-point__bar" aria-hidden="true">
      <span :style="{ width: fillPercent }"></span>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type PointDescription = "Green" | "Yellow" | "Red";

const pointConfigs: Record<
  PointDescription,
  {
    className: string;
    threshold: number;
  }
> = {
  Green: {
    className: "detail-point--green",
    threshold: 350,
  },
  Yellow: {
    className: "detail-point--yellow",
    threshold: 30,
  },
  Red: {
    className: "detail-point--red",
    threshold: 5,
  },
};

const props = withDefaults(
  defineProps<{
    description: PointDescription;
    pointsCount: string;
  }>(),
  {
    description: "Green",
    pointsCount: "",
  }
);

const pointConfig = computed(() => {
  return pointConfigs[props.description];
});

const pointCount = computed(() => {
  return parseInt(props.pointsCount) || 0;
});

const isActive = computed(() => {
  return pointCount.value >= pointConfig.value.threshold;
});

const fillPercent = computed(() => {
  const percent = (pointCount.value / pointConfig.value.threshold) * 100;
  return `${Math.min(Math.max(percent, 0), 100)}%`;
});
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

.detail-point {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-content: center;
  gap: 7px 12px;
  height: 100%;
  min-height: 0;
  padding: 8px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
  box-sizing: border-box;
}

.detail-point--active {
  border-color: rgba(255, 255, 255, 0.22);
  color: #101416;
}

.detail-point__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-point__label {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-point__threshold {
  color: rgba(247, 251, 255, 0.48);
  font-size: 11px;
  line-height: 1;
}

.detail-point--active .detail-point__threshold {
  color: rgba(16, 20, 22, 0.62);
}

.detail-point__count {
  align-self: start;
  min-width: 58px;
  max-width: 92px;
  overflow: hidden;
  font-family: Geometos, B612, sans-serif;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0;
  text-align: right;
  text-overflow: ellipsis;
}

.detail-point__bar {
  grid-column: 1 / -1;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.detail-point__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.54);
}

.detail-point--green.detail-point--active {
  background: linear-gradient(135deg, $green-warn, $green-warn-label);
}

.detail-point--yellow.detail-point--active {
  background: linear-gradient(135deg, $yellow-warn, $yellow-warn-label);
}

.detail-point--red.detail-point--active {
  background: linear-gradient(135deg, $red-warn, $red-warn-label);
}

.detail-point--green .detail-point__bar span {
  background: $green-warn;
}

.detail-point--yellow .detail-point__bar span {
  background: $yellow-warn;
}

.detail-point--red .detail-point__bar span {
  background: $red-warn;
}

.detail-point--active .detail-point__bar {
  background: rgba(16, 20, 22, 0.16);
}

.detail-point--active .detail-point__bar span {
  background: rgba(16, 20, 22, 0.54);
}
</style>
