<template>
  <div :id="'map-' + props.id"></div>
</template>

<script lang="ts" setup>
import { onMounted, ref, toRaw } from "vue";
import L, { Map } from "leaflet";
import { useMapStore } from "@/stores/map";
import hnapi from "@/assets/hnapi";
import { useGeoJsonStore } from "@/stores/geojson";
import "leaflet.vectorgrid";

const props = defineProps<{
  id: string;
}>();
const map = ref<Map>();

const mapStore = useMapStore();
const geoJsonStore = useGeoJsonStore();

onMounted(() => {
  if (props.id === "main") {
    map.value = L.map("map-main", mapStore.tsunamiMapJapanStyle);
  } else if (props.id === "okinawa") {
    map.value = L.map("map-okinawa", mapStore.tsunamiMapOkinawaStyle);
  } else if (props.id === "ogasawara") {
    map.value = L.map("map-ogasawara", mapStore.tsunamiMapOgasawaraStyle);
  } else {
    hnapi.error("mapId unknown");
    return;
  }
  addGeoJson();
  disableInteractive();
});

function addGeoJson() {
  // Although not specified in types, option pane does exist.
  L.vectorGrid
    .slicer(toRaw(geoJsonStore.tsunamiJapan!), {
      vectorTileLayerStyles: {
        sliced: mapStore.tsunamiJapanGeoJsonStyle,
      },
      // @ts-ignore
      pane: "overlayPane",
    })
    .addTo(map.value!);
  if (props.id === "main") {
    L.vectorGrid
      .slicer(toRaw(geoJsonStore.japanAreaLine!), {
        vectorTileLayerStyles: {
          sliced: mapStore.japanAreaLineGeoJsonStyle,
        },
        // @ts-ignore
        pane: "overlayPane",
      })
      .addTo(map.value!);
  }
}

function disableInteractive() {
  map.value!.scrollWheelZoom.disable();
  map.value!.dragging.disable();
  map.value!.doubleClickZoom.disable();
}

defineExpose({
  map,
});
</script>
