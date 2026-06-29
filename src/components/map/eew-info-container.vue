<template>
  <div class="window eew-display">
    <eew-flag
      :display="store.eewIsDrill"
      class="drill-flag"
      message="Drill - Not Real Situation"
    ></eew-flag>
    <!--    <eew-flag-->
    <!--      :display="store.eewIsExpected"-->
    <!--      class="expected-flag"-->
    <!--      message="Expected Intensity"-->
    <!--    ></eew-flag>-->
    <eew-banner class="sub-window"></eew-banner>
    <eew-info></eew-info>
    <div class="eew-earthquake sub-window">
      <intensity-with-lg-icon
        v-if="eqStore.maximumLgIntensity !== ''"
        :is-eew="true"
      ></intensity-with-lg-icon>
      <intensity-icon v-else :is-eew="true"></intensity-icon>
      <earthquake-information :is-eew="true"></earthquake-information>
    </div>
  </div>
</template>

<script lang="ts" setup>
import EewFlag from "@/components/map/eew-flag.vue";
import EewBanner from "@/components/map/eew-banner.vue";
import EewInfo from "@/components/map/eew-info.vue";
import IntensityIcon from "@/components/map/intensity-icon.vue";
import IntensityWithLgIcon from "@/components/map/intensity-with-lg-icon.vue";
import EarthquakeInformation from "@/components/map/earthquake-information.vue";
import { useEEWInfoStore } from "@/stores/eew-info";
import { useEqInfoStore } from "@/stores/eq-info";

const store = useEEWInfoStore();
const eqStore = useEqInfoStore();
</script>

<style lang="scss" scoped>
@import "@/assets/colors.scss";

.eew-display {
  position: relative;
  overflow: hidden;
  background: rgba(17, 24, 28, 0.82);
  grid-template-rows:
    [eewtype] 45px
    [eewadvice] 40px
    [eewinfo] 200px;
}

.drill-flag {
  z-index: 10000;
  background: $intensity-3;
  color: black;
  left: auto;
  right: 10px;
}

.expected-flag {
  z-index: 9999;
  background: rgb(195, 120, 7);
}

.eew-earthquake {
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  background: rgba(17, 24, 28, 0.82);
}

.eew-earthquake-info {
  width: calc(100% - 275px);
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 28, 0.72);

  div {
    display: flex;
    box-sizing: border-box;
    overflow: hidden;
  }
}
</style>
