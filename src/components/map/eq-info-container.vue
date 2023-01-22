<template>
  <div class="intensity-display window">
    <earthquake-description-container></earthquake-description-container>
    <tsunami-banner type="domestic"></tsunami-banner>
    <tsunami-banner type="foreign"></tsunami-banner>
  </div>
</template>

<script lang="ts" setup>
import EarthquakeDescriptionContainer from "@/components/map/earthquake-description-container.vue";
import TsunamiBanner from "@/components/map/tsunami-banner.vue";
</script>

<style lang="scss" scoped>
.intensity-display {
  grid-template-rows:
    [eqinfo] 140px
    [infobanner] 45px;
}
</style>
