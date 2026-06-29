<template>
  <main id="main-container" class="shake-level-view">
    <section :class="severityClass" class="shake-level-panel">
      <div aria-label="Shake indicators" class="shake-indicator-stack">
        <div
          id="warning-indicator"
          :class="{ 'indicator-active': warningIsActive }"
          class="shake-indicator shake-indicator--warning"
        >
          <span class="shake-indicator__signal"></span>
          <span class="shake-indicator__label">Warning</span>
        </div>
        <div
          id="caution-indicator"
          :class="{ 'indicator-active': cautionIsActive }"
          class="shake-indicator shake-indicator--caution"
        >
          <span class="shake-indicator__signal"></span>
          <span class="shake-indicator__label">Caution</span>
        </div>
      </div>

      <div class="shake-level-content">
        <shake-level-show
          :maximum-shake-level="maximumShakeLevel"
          :shake-level="shakeLevel"
        ></shake-level-show>

        <div class="detail-points-wrapper">
          <detail-points
            :points-count="greenPoints"
            description="Green"
          ></detail-points>
          <detail-points
            :points-count="yellowPoints"
            description="Yellow"
          ></detail-points>
          <detail-points
            :points-count="redPoints"
            description="Red"
          ></detail-points>
        </div>
      </div>
    </section>
  </main>
</template>

<script lang="ts" setup>
import hnapi from "@/assets/hnapi";
import type { Ref } from "vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { IShakeLevel } from "@/interfaces/api/ShakeLevel";
import DetailPoints from "@/components/shakeLevel/detail-points.vue";
import ShakeLevelShow from "@/components/shakeLevel/shake-level-show.vue";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 2500;
const shakeLevel = ref("0");
const greenPoints = ref("0");
const yellowPoints = ref("0");
const redPoints = ref("0");
const maximumShakeLevelWindowMs = 15 * 1000;
const shakeLevelRecords = ref<Array<{ recordedAt: number; value: number }>>([]);

const yellowPointCount = computed(() => {
  return parseInt(yellowPoints.value) || 0;
});

const redPointCount = computed(() => {
  return parseInt(redPoints.value) || 0;
});

const warningIsActive = computed(() => {
  return redPointCount.value >= 5;
});

const cautionIsActive = computed(() => {
  return yellowPointCount.value >= 30 && !warningIsActive.value;
});

const numericShakeLevel = computed(() => {
  return parseInt(shakeLevel.value) || 0;
});

const maximumShakeLevel = computed(() => {
  if (shakeLevelRecords.value.length === 0) {
    return "0";
  }
  return Math.max(
    ...shakeLevelRecords.value.map((record) => record.value)
  ).toString();
});

const severityClass = computed(() => {
  if (numericShakeLevel.value >= 1000) {
    return "shake-level-panel--warning";
  }
  if (numericShakeLevel.value >= 100) {
    return "shake-level-panel--caution";
  }
  if (numericShakeLevel.value >= 50) {
    return "shake-level-panel--notice";
  }
  return "shake-level-panel--normal";
});

onMounted(async () => {
  await hnapi.initialize({}).then(() => {
    updateInfo();
    updateTimer.value = setInterval(updateInfo, updateInterval);
  });
});
onUnmounted(() => {
  if (updateTimer.value !== null) {
    clearInterval(updateTimer.value);
  }
});

function updateInfo() {
  pruneShakeLevelRecords();
  hnapi
    .makeApiRequest("/api/shake_level", updateInterval)
    .then((result: IShakeLevel) => {
      if (result.status === -1) {
        hnapi.error("Shake level not available.");
        return;
      }
      shakeLevel.value = result.shake_level.toString();
      recordShakeLevel(result.shake_level);
      greenPoints.value = result.green.toString();
      yellowPoints.value = result.yellow.toString();
      redPoints.value = result.red.toString();
    });
}

function recordShakeLevel(value: number) {
  const now = Date.now();
  pruneShakeLevelRecords(now);
  shakeLevelRecords.value = [
    ...shakeLevelRecords.value,
    {
      recordedAt: now,
      value,
    },
  ];
}

function pruneShakeLevelRecords(now = Date.now()) {
  const cutoff = now - maximumShakeLevelWindowMs;
  shakeLevelRecords.value = shakeLevelRecords.value.filter((record) => {
    return record.recordedAt >= cutoff;
  });
}
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

#main-container {
  width: 700px;
  height: 320px;
  padding: 12px;
  overflow: hidden;
  color: #f7fbff;
  background: radial-gradient(
      circle at 16% 10%,
      rgba(60, 204, 153, 0.24),
      transparent 30%
    ),
    linear-gradient(145deg, #111719 0%, #1f2a2d 54%, #121618 100%);
  box-sizing: border-box;
}

.shake-level-panel {
  position: relative;
  display: grid;
  grid-template-rows: 58px minmax(0, 1fr);
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(10, 14, 16, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 18px 44px rgba(0, 0, 0, 0.34);
  box-sizing: border-box;
  backdrop-filter: blur(16px);
}

.shake-level-panel::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  content: "";
  background: linear-gradient(90deg, $green-warn, $yellow-warn, $red-warn);
}

.shake-level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
}

.shake-level-title {
  min-width: 0;
}

.shake-level-title span {
  display: block;
  overflow: hidden;
  color: rgba(247, 251, 255, 0.56);
  font-size: 10px;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.shake-level-title h1 {
  margin: 5px 0 0;
  overflow: hidden;
  color: #f7fbff;
  font-size: 20px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shake-level-status {
  flex: 0 0 auto;
  min-width: 78px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(247, 251, 255, 0.86);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.shake-level-panel--notice .shake-level-status {
  background: rgba($shake-50, 0.22);
  color: #b9d7ff;
}

.shake-level-panel--caution .shake-level-status {
  background: rgba($yellow-warn, 0.24);
  color: #fff9b0;
}

.shake-level-panel--warning .shake-level-status {
  background: rgba($red-warn, 0.24);
  color: #ffd0d0;
}

.shake-indicator-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-height: 0;
}

.shake-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 0;
  padding: 10px 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  color: rgba(247, 251, 255, 0.42);
  box-sizing: border-box;
  font-family: "Geometos", sans-serif;
}

.shake-indicator__signal {
  position: relative;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(247, 251, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.shake-indicator__signal::after {
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  content: "";
  opacity: 0;
  pointer-events: none;
  transform: scale(0.68);
}

.shake-indicator__label {
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.indicator-active {
  border-color: rgba(255, 255, 255, 0.18);
  color: #f7fbff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

.indicator-active .shake-indicator__signal {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42), 0 0 14px currentColor;
}

.shake-indicator--warning.indicator-active {
  border-color: rgba($red-warn, 0.78);
  background: linear-gradient(
    135deg,
    rgba($red-warn, 0.44),
    rgba(72, 0, 0, 0.66)
  );
  color: #fff1f1;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 0 0 1px rgba($red-warn, 0.18), 0 0 24px rgba($red-warn, 0.34);
}

.shake-indicator--warning.indicator-active .shake-indicator__signal {
  background: $red-warn;
  color: $red-warn;
  animation: shake-warning-light 1.6s ease-in-out infinite;
}

.shake-indicator--warning.indicator-active .shake-indicator__signal::after {
  background: rgba($red-warn, 0.5);
  animation: shake-light-aura 1.6s ease-in-out infinite;
}

.shake-indicator--caution.indicator-active {
  border-color: rgba($yellow-warn, 0.82);
  background: linear-gradient(
    135deg,
    rgba($yellow-warn, 0.46),
    rgba(96, 62, 0, 0.68)
  );
  color: #fff9ce;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 0 0 1px rgba($yellow-warn, 0.2), 0 0 24px rgba($yellow-warn, 0.34);
}

.shake-indicator--caution.indicator-active .shake-indicator__signal {
  background: $yellow-warn;
  color: $yellow-warn;
  animation: shake-caution-light 1.6s ease-in-out infinite;
}

.shake-indicator--caution.indicator-active .shake-indicator__signal::after {
  background: rgba($yellow-warn, 0.5);
  animation: shake-light-aura 1.6s ease-in-out infinite;
}

@keyframes shake-warning-light {
  0%,
  100% {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42),
      0 0 10px rgba($red-warn, 0.72);
  }

  50% {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62),
      0 0 26px rgba($red-warn, 0.98);
  }
}

@keyframes shake-caution-light {
  0%,
  100% {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42),
      0 0 10px rgba($yellow-warn, 0.7);
  }

  50% {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62),
      0 0 26px rgba($yellow-warn, 0.96);
  }
}

@keyframes shake-light-aura {
  0%,
  100% {
    opacity: 0.16;
    transform: scale(0.76);
  }

  50% {
    opacity: 0.54;
    transform: scale(0.86);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shake-indicator--warning.indicator-active .shake-indicator__signal,
  .shake-indicator--warning.indicator-active .shake-indicator__signal::after,
  .shake-indicator--caution.indicator-active .shake-indicator__signal,
  .shake-indicator--caution.indicator-active .shake-indicator__signal::after {
    animation: none;
  }
}

.shake-level-content {
  display: grid;
  grid-template-columns: minmax(0, 410px) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  min-width: 0;
  min-height: 0;
}

.shake-level-content :deep(.shake-level-show) {
  height: 100%;
}

.detail-points-wrapper {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
  min-height: 0;
}
</style>
