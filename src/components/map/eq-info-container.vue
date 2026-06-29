<template>
  <div
    :class="{ 'intensity-display--foreign': showForeignTsunamiBanner }"
    class="intensity-display window"
  >
    <earthquake-description-container></earthquake-description-container>
    <tsunami-banner type="domestic"></tsunami-banner>
    <tsunami-banner
      v-if="showForeignTsunamiBanner"
      type="foreign"
    ></tsunami-banner>
  </div>
</template>

<script lang="ts" setup>
import EarthquakeDescriptionContainer from "@/components/map/earthquake-description-container.vue";
import TsunamiBanner from "@/components/map/tsunami-banner.vue";
import { useEqInfoStore } from "@/stores/eq-info";
import { computed } from "vue";

const eqStore = useEqInfoStore();
const showForeignTsunamiBanner = computed(
  () => eqStore.tsunamiCommentsForeign !== "None"
);
</script>

<style lang="scss" scoped>
.intensity-display {
  overflow: hidden;
  grid-template-rows:
    [eqinfo] 200px
    [infobanner] 45px;
  background: rgba(17, 24, 28, 0.82);
}

.intensity-display--foreign {
  grid-template-rows:
    [eqinfo] 200px
    [infobanner] 45px
    [foreignbanner] 45px;
}
</style>
