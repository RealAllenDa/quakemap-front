<template>
  <div id="map" class="map sub-window"></div>
</template>

<script lang="ts" setup>
import type { PathOptions } from "leaflet";
import L, { FeatureGroup, GeoJSON, Icon, Layer, Map } from "leaflet";
import "leaflet.vectorgrid";
import type { IHypocenter } from "@/interfaces/parsing/QuakeInfo";
import type {
  AllAreaIntensities,
  AllStationIntensities,
} from "@/interfaces/parsing/Intensities";
import type { IAreaColor, IGeoJsonFeature } from "@/interfaces/parsing/GeoJson";
import hnapi from "@/assets/hnapi";
import { useGeoJsonStore } from "@/stores/geojson";
import { useMapStore } from "@/stores/map";
import { onMounted, ref, toRaw } from "vue";
import { useIntensityStore } from "@/stores/intensity";

const mapCenter = ref<[number, number]>([38.272688535980976, 137]);
const mapZoom = ref(5);

const geoJsonStore = useGeoJsonStore();
const mapConfigStore = useMapStore();
const intensityStore = useIntensityStore();

const map = ref<Map>();

const subAreaBorderLayer = ref<Layer>();
const prefBorderLayer = ref<Layer>();

const sWaveCircle = ref<Layer>();
const pWaveCircle = ref<Layer>();

const colorMapLayer = ref<GeoJSON>();
const epicenterGroup = ref<FeatureGroup>(L.featureGroup());
const iconGroup = ref<FeatureGroup>(L.featureGroup());
const epicenterGroupAdded = ref(false);
const iconGroupAdded = ref(false);
const colorMapAdded = ref(false);

epicenterGroup.value.on("layeradd", () => {
  epicenterGroupAdded.value = true;
});
epicenterGroup.value.on("layerremove", () => {
  epicenterGroupAdded.value = false;
});
iconGroup.value.on("layeradd", () => {
  iconGroupAdded.value = true;
});
iconGroup.value.on("layerremove", () => {
  iconGroupAdded.value = false;
});

const areaColoring = ref<IAreaColor>();

const epicenterIcon = new Icon({
  iconUrl: "/epicenter.svg",
  iconSize: [40, 40],
});

onMounted(() => {
  initializeMap();
});

function initializeMap(): void {
  map.value = L.map("map", {
    center: mapCenter.value,
    zoom: mapZoom.value,
    ...mapConfigStore.mapOptions,
  });
  map.value?.attributionControl.setPrefix("QuakeMap by AllenDa");
  map.value?.attributionControl.addAttribution(
    "Map: Natural Earth | " + "Map Data: JMA"
  );
  // Background
  L.vectorGrid
    .slicer(toRaw(geoJsonStore.countries!), {
      vectorTileLayerStyles: {
        sliced: mapConfigStore.countriesBgStyle,
      },
    })
    .addTo(map.value!);
  L.vectorGrid
    .slicer(toRaw(geoJsonStore.japan!), {
      vectorTileLayerStyles: {
        sliced: mapConfigStore.japanBgStyle,
      },
    })
    .addTo(map.value!);

  // Borders
  subAreaBorderLayer.value = L.vectorGrid
    .slicer(toRaw(geoJsonStore.japanWithSubAreas!), {
      vectorTileLayerStyles: {
        sliced: mapConfigStore.japanAreaBorderStyle,
      },
    })
    .addTo(map.value!);
  prefBorderLayer.value = L.vectorGrid
    .slicer(toRaw(geoJsonStore.japan!), {
      vectorTileLayerStyles: {
        sliced: mapConfigStore.japanBorderStyle,
      },
    })
    .addTo(map.value!);

  map.value!.on("zoomend", () => {
    if (map.value!.getZoom() < 6) {
      if (map.value!.hasLayer(subAreaBorderLayer.value!)) {
        map.value!.removeLayer(subAreaBorderLayer.value!);
      }
    } else {
      if (!map.value!.hasLayer(subAreaBorderLayer.value!)) {
        map.value!.addLayer(subAreaBorderLayer.value!);
      }
    }
  });
}

function deleteAllLayers(): void {
  try {
    if (colorMapLayer.value !== undefined && colorMapAdded.value) {
      colorMapLayer.value!.removeFrom(map.value!);
      colorMapAdded.value = false;
    }
    iconGroup.value!.clearLayers();
    epicenterGroup.value!.clearLayers();
    if (sWaveCircle.value !== undefined) {
      map.value!.removeLayer(sWaveCircle.value);
    }
    if (pWaveCircle.value !== undefined) {
      map.value!.removeLayer(pWaveCircle.value);
    }
  } catch (e) {
    hnapi.error("Failed to remove layers:", e);
  }
}

function addMapIntensities(
  intensity: AllStationIntensities | AllAreaIntensities
): void {
  for (const i in intensity) {
    const content = intensity[i];
    if (content.intensity === null) {
      content.intensity = "0";
    }
    const intensityConverted =
      intensityStore.intensityConversion[content.intensity];
    if (content.is_area) {
      const layer = L.marker([content.latitude, content.longitude], {
        zIndexOffset: intensityConverted.zIndex,
        icon: L.divIcon({
          className: `intensity-big intensity-${intensityConverted.class}`,
          html: intensityConverted.html,
        }),
      });
      iconGroup.value!.addLayer(layer);
    } else {
      const layer = L.marker([content.latitude, content.longitude], {
        zIndexOffset: intensityConverted.zIndex,
        icon: L.divIcon({
          className: `intensity-small intensity-${intensityConverted.class}`,
          html: intensityConverted.html,
        }),
      });
      iconGroup.value!.addLayer(layer);
    }
  }
  iconGroup.value!.addTo(map.value!);
}

function addEpicenter(content: IHypocenter): void {
  const epicenterMarker = L.marker([content.latitude, content.longitude], {
    icon: epicenterIcon,
  });
  epicenterMarker.setZIndexOffset(5000000);
  epicenterGroup.value!.addLayer(epicenterMarker);
  epicenterGroup.value!.removeFrom(map.value!);
  epicenterGroup.value!.addTo(map.value!);
}

function addMapColoring(intensity: AllAreaIntensities): void {
  areaIntensityToColor(intensity);
  colorMapLayer.value = L.geoJson(toRaw(geoJsonStore.japanWithSubAreas), {
    style: parseColorStyle,
    filter: filterMapColoring,
    pane: "tilePane",
  });
  colorMapLayer.value!.addTo(map.value!);
  colorMapAdded.value = true;
}

function setForeignEarthquake(epicenter: IHypocenter): void {
  mapZoom.value = 2;
  mapCenter.value = [epicenter.latitude, epicenter.latitude];
}

function addWaveCircle(
  epicenter: IHypocenter,
  waveDistance: number,
  type: string
): void {
  if (type === "s") {
    if (sWaveCircle.value !== undefined) {
      map.value!.removeLayer(sWaveCircle.value);
    }
    sWaveCircle.value = L.circle(
      [epicenter.latitude, epicenter.longitude],
      waveDistance * 1000,
      toRaw(mapConfigStore.sWaveCircleStyle)
    );
    sWaveCircle.value!.addTo(map.value!);
  } else if (type === "p") {
    if (pWaveCircle.value !== undefined) {
      map.value!.removeLayer(pWaveCircle.value);
    }
    pWaveCircle.value = L.circle(
      [epicenter.latitude, epicenter.longitude],
      waveDistance * 1000,
      toRaw(mapConfigStore.pWaveCircleStyle)
    );
    pWaveCircle.value!.addTo(map.value!);
  } else {
    throw new Error("Exhaustive wave circle handling");
  }
}

function parseColorStyle(feature?: IGeoJsonFeature): PathOptions {
  if (feature === undefined) {
    hnapi.warn("Feature is none.");
    return {
      stroke: false,
      fill: false,
    };
  }
  return {
    fillColor: areaColoring.value!.colors[feature.properties!.name],
    fillOpacity: 1.0,
    stroke: true,
    color: "#000000",
    weight: 2,
  };
}

function parseMapScale(isEEW = false): void {
  let currentBounds = L.latLngBounds([]);
  try {
    if (iconGroupAdded.value) {
      currentBounds.extend(iconGroup.value!.getBounds());
    }
  } catch (e) {
    hnapi.error("Failed to parse iconGroup bounds:", e);
  }
  try {
    if (colorMapAdded.value) {
      currentBounds.extend(colorMapLayer.value!.getBounds());
    }
  } catch (e) {
    hnapi.error("Failed to parse colorMap bounds:", e);
  }
  try {
    if (epicenterGroupAdded.value) {
      currentBounds.extend(epicenterGroup.value!.getBounds());
    }
  } catch (e) {
    hnapi.error("Failed to parse epicenterGroup bounds:", e);
  }
  hnapi.info("Parsed bounds =>", currentBounds);
  try {
    if (isEEW) {
      currentBounds = currentBounds.pad(-0.85);
    }
  } catch (e) {
    hnapi.error("Failed to pad bounds:", e);
  }
  hnapi.debug("Final bounds =>", currentBounds);
  map.value!.fitBounds(currentBounds, {
    padding: [0, 30],
  });
}

function areaIntensityToColor(intensity: AllAreaIntensities) {
  areaColoring.value = {
    colors: {},
    areas: [],
  };
  for (const i in intensity) {
    areaColoring.value.colors[i] =
      intensityStore.intensityColors[intensity[i].intensity];
    areaColoring.value.areas.push(i);
  }
}

function filterMapColoring(feature: IGeoJsonFeature): boolean {
  return areaColoring.value!.areas.indexOf(feature.properties.name) !== -1;
}

defineExpose({
  deleteAllLayers,
  addMapIntensities,
  addEpicenter,
  addMapColoring,
  setForeignEarthquake,
  addWaveCircle,
  parseColorStyle,
  parseMapScale,
});
</script>

<style lang="scss">
@import "leaflet/dist/leaflet.css";

$map-background-color: #1d1d1d;

.map {
  width: 100% !important;
  height: 450px !important;
  background: $map-background-color;
}

.intensity-add-icon {
  align-self: flex-end;
  font-size: 13px !important;
  position: initial !important;
}

.intensity-big {
  width: 25px !important;
  height: 25px !important;
  display: flex !important;
  box-sizing: border-box;
  font-weight: bold;
  font-size: 19px !important;
  font-family: "B612", sans-serif;
  justify-content: center;
  line-height: 29px;
}

.intensity-small {
  width: 20px !important;
  height: 20px !important;
  display: flex !important;
  box-sizing: border-box;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px !important;
  font-family: "B612", sans-serif;
  justify-content: center;
  line-height: 24px;
}

.intensity-add {
  align-self: flex-end;
  font-size: 13px;
}

.special-intensity-add {
  font-size: 12px;
}
</style>
