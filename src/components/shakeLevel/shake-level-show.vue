<template>
  <div :class="shakeLevelClass" class="shake-level-show">
    <span class="shake-level-show__label">Current Shake Level</span>
    <div class="shake-level-show__current">
      <strong class="shake-level-show__value">{{ props.shakeLevel }}</strong>
      <span class="shake-level-show__unit">Lv.</span>
    </div>
    <div class="shake-level-show__maximum">
      <span>15s Max</span>
      <strong>{{ props.maximumShakeLevel }}</strong>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    maximumShakeLevel: string;
    shakeLevel: string;
  }>(),
  {
    maximumShakeLevel: "0",
    shakeLevel: "",
  }
);

const shakeLevelClass = computed(() => {
  const parsedShakeLevel = parseInt(props.shakeLevel);

  if (parsedShakeLevel >= 50 && parsedShakeLevel < 100) {
    return "shake-50";
  } else if (parsedShakeLevel >= 100 && parsedShakeLevel < 500) {
    return "shake-100";
  } else if (parsedShakeLevel >= 500 && parsedShakeLevel < 1000) {
    return "shake-500";
  } else if (parsedShakeLevel >= 1000 && parsedShakeLevel < 2000) {
    return "shake-1000";
  } else if (parsedShakeLevel >= 2000 && parsedShakeLevel < 3000) {
    return "shake-2000";
  } else if (parsedShakeLevel >= 3000 && parsedShakeLevel < 4000) {
    return "shake-3000";
  } else if (parsedShakeLevel >= 4000) {
    return "shake-3000-above";
  } else {
    return "shake-default";
  }
});
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

.shake-level-show {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  height: 100%;
  min-height: 0;
  padding: 14px 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: linear-gradient(
    145deg,
    rgba(62, 75, 79, 0.92),
    rgba(25, 31, 34, 0.94)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
  color: #f7fbff;
}

.shake-level-show::before {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.18),
      transparent 38%
    ),
    radial-gradient(
      circle at 84% 20%,
      rgba(255, 255, 255, 0.22),
      transparent 26%
    );
  pointer-events: none;
}

.shake-level-show__label,
.shake-level-show__current,
.shake-level-show__maximum,
.shake-level-show__value {
  position: relative;
  z-index: 1;
}

.shake-level-show__label {
  color: rgba(247, 251, 255, 0.78);
  font-size: 12px;
  line-height: 1;
  text-transform: uppercase;
}

.shake-level-show__current {
  display: flex;
  align-items: baseline;
  align-self: center;
  min-width: 0;
}

.shake-level-show__value {
  min-width: 0;
  overflow: hidden;
  font-family: Geometos, B612, sans-serif;
  font-size: 84px;
  line-height: 1;
  letter-spacing: 0;
  text-overflow: ellipsis;
}

.shake-level-show__unit {
  flex: 0 0 auto;
  margin-left: 12px;
  color: rgba(247, 251, 255, 0.72);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.shake-level-show__maximum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  padding: 7px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.16);
  color: rgba(247, 251, 255, 0.74);
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
}

.shake-level-show__maximum span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shake-level-show__maximum strong {
  flex: 0 0 auto;
  color: #f7fbff;
  font-family: Geometos, B612, sans-serif;
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0;
}

.shake-50 {
  background: linear-gradient(
    145deg,
    rgba($shake-50, 0.96),
    rgba(15, 38, 70, 0.96)
  );
  color: white;
}

.shake-100 {
  background: linear-gradient(
    145deg,
    rgba($shake-100, 0.98),
    rgba(105, 72, 0, 0.98)
  );
  color: #12100a;
}

.shake-100 .shake-level-show__label,
.shake-100 .shake-level-show__current,
.shake-100 .shake-level-show__maximum,
.shake-100 .shake-level-show__unit {
  color: rgba(18, 16, 10, 0.72);
}

.shake-100 .shake-level-show__maximum {
  border-color: rgba(18, 16, 10, 0.16);
  background: rgba(18, 16, 10, 0.1);
}

.shake-100 .shake-level-show__maximum strong {
  color: #12100a;
}

.shake-500 {
  background: linear-gradient(
    145deg,
    rgba($shake-500, 0.98),
    rgba(104, 42, 0, 0.98)
  );
  color: white;
}

.shake-1000 {
  background: linear-gradient(
    145deg,
    rgba($shake-1000, 0.98),
    rgba(82, 0, 0, 0.98)
  );
  color: white;
}

.shake-2000 {
  background: linear-gradient(
    145deg,
    rgba($shake-2000, 0.98),
    rgba(54, 0, 0, 0.98)
  );
  color: white;
}

.shake-3000 {
  background: linear-gradient(
    145deg,
    rgba($shake-3000, 0.98),
    rgba(52, 0, 52, 0.98)
  );
  color: white;
}

.shake-3000-above {
  background: linear-gradient(145deg, #0a0a0a, #390039);
  color: #fff36c;
}

.shake-default {
  background: linear-gradient(
    145deg,
    rgba($info-background-color, 0.94),
    rgba(20, 27, 30, 0.96)
  );
  color: white;
}
</style>
