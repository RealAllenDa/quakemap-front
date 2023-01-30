<template>
  <div
    id="warning-indicator"
    :class="warningIsActive ? 'indicator-active' : ''"
    class="shake-indicator"
  >
    WARNING
  </div>
  <div
    id="caution-indicator"
    :class="cautionIsActive ? 'indicator-active' : ''"
    class="shake-indicator"
  >
    CAUTION
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";
import hnapi from "@/assets/hnapi";
import type { IShakeLevel } from "@/interfaces/api/ShakeLevel";

const updateTimer: Ref<null | ReturnType<typeof setInterval>> = ref(null);
const updateInterval = 2500;
const warningIsActive = ref(false);
const cautionIsActive = ref(false);

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
      warningIsActive.value = result.red >= 5;
      cautionIsActive.value = result.yellow >= 30 && !warningIsActive.value;
    });
}
</script>

<style lang="scss">
@import "@/assets/colors.scss";

body {
  background: black;
}

.shake-indicator {
  border: 2px solid;
  width: 80px;
  padding: 3px;
  filter: brightness(20%);
  text-align: center;
  font-family: "Geometos", sans-serif;
}

#caution-indicator {
  margin-top: 5px;
  border-color: yellow;
  color: yellow;
}

#warning-indicator {
  border-color: $shake-1000;
  color: $shake-1000;
}

.indicator-active {
  filter: none;
}
</style>
