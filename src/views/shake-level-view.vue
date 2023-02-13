<template>
  <div id="main-container">
    <span>Shake Level</span>
    <shake-level-show :shake-level="shakeLevel"></shake-level-show>
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
</template>

<script lang="ts" setup>
import hnapi from "@/assets/hnapi";
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";
import type { IShakeLevel } from "@/interfaces/api/ShakeLevel";
import DetailPoints from "@/components/shakeLevel/detail-points.vue";
import ShakeLevelShow from "@/components/shakeLevel/shake-level-show.vue";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 2500;
const shakeLevel = ref("0");
const greenPoints = ref("0");
const yellowPoints = ref("0");
const redPoints = ref("0");

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
  hnapi
    .makeApiRequest("/api/shake_level", updateInterval)
    .then((result: IShakeLevel) => {
      if (result.status === -1) {
        hnapi.error("Shake level not available.");
        return;
      }
      shakeLevel.value = result.shake_level.toString();
      greenPoints.value = result.green.toString();
      yellowPoints.value = result.yellow.toString();
      redPoints.value = result.red.toString();
    });
}
</script>

<style lang="scss">
@import "@/assets/colors.scss";

.detail-points-wrapper {
  border-top: 3px solid $border-color;

  div {
    width: 100%;
    height: 40px;
    display: flex;

    span {
      width: 50%;
      height: 40px;
    }
  }
}

#main-container {
  width: 200px;
  height: 215px;
  border: 6px solid $border-color;
  background: $info-background-color;
  box-sizing: border-box;
  font-size: 25px;

  span {
    display: inline-block;
    width: 100%;
    height: 40px;
    line-height: 40px;
    text-align: center;
    box-sizing: border-box;
  }
}

.shake-50 {
  background: $shake-50;
  color: white;
}

.shake-100 {
  background: $shake-100;
  color: black;
}

.shake-500 {
  background: $shake-500;
  color: white;
}

.shake-1000 {
  background: $shake-1000;
  color: white;
}

.shake-2000 {
  background: $shake-2000;
  color: white;
}

.shake-3000 {
  background: $shake-3000;
  color: white;
}

.shake-3000-above {
  background: black;
  color: yellow;
}

.shake-default {
  background: $info-background-color;
  color: white;
}

* {
  --info-background-color: #{$info-background-color};
  --green-warn: #{$green-warn};
  --green-warn-label: #{$green-warn-label};
  --yellow-warn: #{$yellow-warn};
  --yellow-warn-label: #{$yellow-warn-label};
  --red-warn: #{$red-warn};
  --red-warn-label: #{$red-warn-label};
}
</style>
