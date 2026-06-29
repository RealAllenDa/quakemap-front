<template>
  <div
    ref="mapContainer"
    :class="{ 'quake-maplibre--scaled': props.scaleElements }"
    aria-label="Earthquake map"
    class="quake-maplibre"
  ></div>
</template>

<script lang="ts" setup>
import type { FeatureCollection, Geometry, Position } from "geojson";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { IHypocenter } from "@/interfaces/parsing/QuakeInfo";
import type {
  AllAreaIntensities,
  AllStationIntensities,
} from "@/interfaces/parsing/Intensities";
import type { IAreaColor, IGeoJsonFeature } from "@/interfaces/parsing/GeoJson";
import hnapi from "@/assets/hnapi";
import { useGeoJsonStore } from "@/stores/geojson";
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from "vue";
import { useIntensityStore } from "@/stores/intensity";
import epicenterSvg from "@/assets/epicenter.svg";

const geoJsonStore = useGeoJsonStore();
const intensityStore = useIntensityStore();
const props = withDefaults(
  defineProps<{
    infoPanelOrientation?: "top" | "right" | "bottom" | "left";
    scaleElements?: boolean;
  }>(),
  {
    infoPanelOrientation: "bottom",
    scaleElements: false,
  }
);

const mapContainer = ref<HTMLDivElement>();
const map = ref<maplibregl.Map>();
const mapLoaded = ref(false);
const pendingActions: Array<() => void> = [];

const areaColoring = ref<IAreaColor>({
  colors: {},
  areas: [],
});

const intensityMarkers: maplibregl.Marker[] = [];
const epicenterMarkers: maplibregl.Marker[] = [];

const areaColorSourceId = "quake-area-coloring";
const areaColorLayerId = "quake-area-coloring-fill";
const sWaveSourceId = "quake-s-wave";
const pWaveSourceId = "quake-p-wave";
const mapElementScale = computed(() => (props.scaleElements ? 1.5 : 1));

onMounted(() => {
  initializeMap();
});

onUnmounted(() => {
  deleteAllLayers();
  map.value?.remove();
  map.value = undefined;
});

watch(mapElementScale, () => {
  runWhenReady(updateScaledPaintProperties);
});

function initializeMap(): void {
  if (mapContainer.value === undefined) {
    return;
  }

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        countries: {
          type: "geojson",
          data: toRaw(geoJsonStore.countries!) as FeatureCollection,
          attribution: "Natural Earth",
        },
        japan: {
          type: "geojson",
          data: toRaw(geoJsonStore.japan!) as FeatureCollection,
          attribution: "JMA",
        },
        "japan-subareas": {
          type: "geojson",
          data: toRaw(geoJsonStore.japanWithSubAreas!) as FeatureCollection,
          attribution: "JMA",
        },
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#182024",
          },
        },
        {
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": "#30383c",
            "fill-opacity": 1,
          },
        },
        {
          id: "countries-lines",
          type: "line",
          source: "countries",
          paint: {
            "line-color": "#48545a",
            "line-opacity": 0.72,
            "line-width": 0.7,
          },
        },
        {
          id: "japan-fill",
          type: "fill",
          source: "japan",
          paint: {
            "fill-color": "#3f4b51",
            "fill-opacity": 1,
          },
        },
        {
          id: "japan-subarea-lines",
          type: "line",
          source: "japan-subareas",
          minzoom: 6,
          paint: {
            "line-color": "#66737a",
            "line-opacity": 0.58,
            "line-width": 0.55,
          },
        },
        {
          id: "japan-prefecture-lines",
          type: "line",
          source: "japan",
          paint: {
            "line-color": "#9aa8ad",
            "line-opacity": 0.8,
            "line-width": 0.75,
          },
        },
      ],
    },
    center: [137, 38.272688535980976],
    zoom: 5,
    minZoom: 2,
    maxZoom: 8,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
  });

  map.value.addControl(
    new maplibregl.NavigationControl({
      showCompass: false,
      visualizePitch: false,
    }),
    "top-right"
  );
  map.value.addControl(
    new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "QuakeMap by AllenDa | Map Data: JMA",
    }),
    "bottom-right"
  );

  map.value.on("load", () => {
    mapLoaded.value = true;
    map.value?.resize();
    runPendingActions();
  });
}

function runWhenReady(action: () => void): void {
  if (mapLoaded.value && map.value !== undefined) {
    action();
    return;
  }
  pendingActions.push(action);
}

function runPendingActions(): void {
  while (pendingActions.length > 0) {
    const action = pendingActions.shift();
    action?.();
  }
}

function deleteAllLayers(): void {
  runWhenReady(() => {
    removeAreaColoring();
    clearMarkers(intensityMarkers);
    clearMarkers(epicenterMarkers);
    removeWaveCircle("s");
    removeWaveCircle("p");
  });
}

function clearMarkers(markers: maplibregl.Marker[]): void {
  markers.splice(0).forEach((marker) => marker.remove());
}

function removeAreaColoring(): void {
  if (map.value?.getLayer(areaColorLayerId) !== undefined) {
    map.value.removeLayer(areaColorLayerId);
  }
  if (map.value?.getSource(areaColorSourceId) !== undefined) {
    map.value.removeSource(areaColorSourceId);
  }
}

function removeWaveCircle(circleType: string): void {
  runWhenReady(() => {
    if (circleType !== "s" && circleType !== "p") {
      hnapi.error("Exhaustive handling of circleType");
      return;
    }
    const sourceId = circleType === "s" ? sWaveSourceId : pWaveSourceId;
    removeWaveLayer(sourceId);
  });
}

function removeWaveLayer(sourceId: string): void {
  const fillLayerId = `${sourceId}-fill`;
  const lineLayerId = `${sourceId}-line`;
  if (map.value?.getLayer(fillLayerId) !== undefined) {
    map.value.removeLayer(fillLayerId);
  }
  if (map.value?.getLayer(lineLayerId) !== undefined) {
    map.value.removeLayer(lineLayerId);
  }
  if (map.value?.getSource(sourceId) !== undefined) {
    map.value.removeSource(sourceId);
  }
}

function addMapIntensities(
  intensity: AllStationIntensities | AllAreaIntensities
): void {
  runWhenReady(() => {
    for (const i in intensity) {
      const content = intensity[i];
      if (content.intensity === null) {
        content.intensity = "0";
      }
      const intensityConverted =
        intensityStore.intensityConversion[content.intensity] ??
        intensityStore.intensityConversion["0"];
      const markerElement = document.createElement("div");
      markerElement.className = content.is_area
        ? `intensity-big intensity-${intensityConverted.class}`
        : `intensity-small intensity-${intensityConverted.class}`;
      markerElement.innerHTML = intensityConverted.html;
      markerElement.style.zIndex = intensityConverted.zIndex.toString();

      if (content.is_area) {
        applyLongPeriodWarning(markerElement, content.lg_intensity);
      }

      const marker = new maplibregl.Marker({
        anchor: "center",
        element: markerElement,
      })
        .setLngLat([content.longitude, content.latitude])
        .addTo(map.value!);
      intensityMarkers.push(marker);
    }
  });
}

function applyLongPeriodWarning(
  element: HTMLElement,
  lgIntensity: string
): void {
  const parsedLgIntensity = Number.parseInt(lgIntensity);
  if (Number.isNaN(parsedLgIntensity)) {
    return;
  }

  if (parsedLgIntensity >= 3) {
    element.classList.add(
      "intensity-lg",
      "intensity-lg-blink",
      `intensity-lg-${parsedLgIntensity}`
    );
    // element.insertAdjacentHTML(
    //   "beforeend",
    //   "<div class='intensity-add'>!</div>"
    // );
    element.style.zIndex = (
      Number.parseInt(element.style.zIndex) + 50
    ).toString();
  } else if (parsedLgIntensity >= 1) {
    element.classList.add("intensity-lg", `intensity-lg-${parsedLgIntensity}`);
    // element.insertAdjacentHTML(
    //   "beforeend",
    //   "<div class='intensity-add special-intensity-add'>~</div>"
    // );
  }
}

function addEpicenter(content: IHypocenter): void {
  runWhenReady(() => {
    if (
      content.depth === "-1km" &&
      content.latitude === -200 &&
      content.longitude === -200
    ) {
      return;
    }

    const epicenterElement = document.createElement("img");
    epicenterElement.src = epicenterSvg;
    epicenterElement.alt = "Epicenter";
    epicenterElement.className = "epicenter-marker";
    // epicenterElement.style.zIndex = "1000000";

    const epicenterMarker = new maplibregl.Marker({
      anchor: "center",
      element: epicenterElement,
    })
      .setLngLat([content.longitude, content.latitude])
      .addTo(map.value!);
    epicenterMarkers.push(epicenterMarker);
  });
}

function addMapColoring(intensity: AllAreaIntensities): void {
  runWhenReady(() => {
    areaIntensityToColor(intensity);
    removeAreaColoring();

    const data = filterFeatureCollection(
      toRaw(geoJsonStore.japanWithSubAreas!) as FeatureCollection,
      areaColoring.value.areas
    );
    map.value!.addSource(areaColorSourceId, {
      type: "geojson",
      data,
    });
    map.value!.addLayer(
      {
        id: areaColorLayerId,
        type: "fill",
        source: areaColorSourceId,
        paint: {
          "fill-color": buildAreaColorExpression(),
          "fill-opacity": 0.9,
          "fill-outline-color": "rgba(10, 14, 16, 0.78)",
        },
      },
      "japan-subarea-lines"
    );
  });
}

function filterFeatureCollection(
  collection: FeatureCollection,
  allowedAreas: string[]
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((feature) =>
      allowedAreas.includes(String(feature.properties?.name))
    ),
  };
}

function buildAreaColorExpression(): ExpressionSpecification {
  const expression: unknown[] = ["match", ["get", "name"]];
  Object.entries(areaColoring.value.colors).forEach(([area, color]) => {
    expression.push(area, color);
  });
  expression.push("#666666");
  return expression as ExpressionSpecification;
}

function setForeignEarthquake(epicenter: IHypocenter): void {
  runWhenReady(() => {
    map.value!.easeTo({
      center: [epicenter.longitude, epicenter.latitude],
      zoom: 2,
      duration: 700,
    });
  });
}

function addWaveCircle(
  epicenter: IHypocenter,
  waveDistance: number,
  type: string
): void {
  runWhenReady(() => {
    if (type !== "s" && type !== "p") {
      throw new Error("Exhaustive wave circle handling");
    }

    const sourceId = type === "s" ? sWaveSourceId : pWaveSourceId;
    const waveData = buildCircleFeature(
      [epicenter.longitude, epicenter.latitude],
      waveDistance
    );
    const source = map.value!.getSource(sourceId) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source !== undefined) {
      source.setData(waveData);
      return;
    }

    map.value!.addSource(sourceId, {
      type: "geojson",
      data: waveData,
    });
    map.value!.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": type === "s" ? "#e65a5a" : "#50a0fa",
        "fill-opacity": type === "s" ? 0.18 : 0.05,
      },
    });
    map.value!.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": type === "s" ? "#ff7676" : "#73b7ff",
        "line-opacity": 0.92,
        "line-width": waveLineWidth(type),
      },
    });
  });
}

function waveLineWidth(type: string): number {
  return (type === "s" ? 2.4 : 2) * mapElementScale.value;
}

function updateScaledPaintProperties(): void {
  setWaveLineWidth(sWaveSourceId, "s");
  setWaveLineWidth(pWaveSourceId, "p");
}

function setWaveLineWidth(sourceId: string, type: string): void {
  const layerId = `${sourceId}-line`;
  if (map.value?.getLayer(layerId) !== undefined) {
    map.value.setPaintProperty(layerId, "line-width", waveLineWidth(type));
  }
}

function buildCircleFeature(
  center: [number, number],
  radiusKm: number
): FeatureCollection {
  const coordinates: Position[] = [];
  const earthRadiusKm = 6371;
  const [centerLng, centerLat] = center;
  const latRad = degreesToRadians(centerLat);
  const lngRad = degreesToRadians(centerLng);
  const angularDistance = radiusKm / earthRadiusKm;

  for (let i = 0; i <= 160; i += 1) {
    const bearing = degreesToRadians((i / 160) * 360);
    const lat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const lng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat)
      );
    coordinates.push([radiansToDegrees(lng), radiansToDegrees(lat)]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function parseColorStyle(feature?: IGeoJsonFeature): Record<string, unknown> {
  if (feature === undefined) {
    hnapi.warn("Feature is none.");
    return {
      stroke: false,
      fill: false,
    };
  }
  return {
    fillColor: areaColoring.value.colors[feature.properties.name],
    fillOpacity: 0.9,
    stroke: true,
    color: "#0a0e10",
    weight: 2,
  };
}

function parseMapScale(isEEW = false): void {
  runWhenReady(() => {
    const bounds = new maplibregl.LngLatBounds();
    extendBoundsWithMarkers(bounds, intensityMarkers);
    extendBoundsWithMarkers(bounds, epicenterMarkers);
    extendBoundsWithFeatureCollection(bounds, getAreaColoringData());

    if (bounds.isEmpty()) {
      map.value!.easeTo({
        center: [137, 38.272688535980976],
        zoom: 5,
        duration: 600,
      });
      return;
    }

    map.value!.fitBounds(bounds, {
      padding: buildFitBoundsPadding(isEEW),
      maxZoom: isEEW ? 7.4 : 7.1,
      duration: 700,
    });
  });
}

type FitBoundsPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function buildFitBoundsPadding(isEEW: boolean): FitBoundsPadding {
  const base = baseFitBoundsPadding(isEEW);
  const container = map.value?.getContainer();
  const width = container?.clientWidth ?? window.innerWidth;
  const height = container?.clientHeight ?? window.innerHeight;
  return constrainFitBoundsPadding(base, width, height);
}

function baseFitBoundsPadding(isEEW: boolean): FitBoundsPadding {
  const panelScale = props.scaleElements ? 1.5 : 1;
  const horizontalSidePadding = isEEW ? 80 : 90;
  const verticalInsetPadding = 110;
  const horizontalPanelPadding = 390 * panelScale;
  const verticalPanelPadding = (isEEW ? 300 : 310) * panelScale;

  switch (props.infoPanelOrientation) {
    case "top":
      return {
        top: verticalPanelPadding,
        right: 0,
        bottom: verticalInsetPadding,
        left: 0,
      };
    case "left":
      return {
        top: 0,
        right: horizontalSidePadding,
        bottom: 0,
        left: horizontalPanelPadding,
      };
    case "right":
      return {
        top: 0,
        right: horizontalPanelPadding,
        bottom: 0,
        left: horizontalSidePadding,
      };
    case "bottom":
    default:
      return {
        top: verticalInsetPadding,
        right: 0,
        bottom: verticalPanelPadding,
        left: 0,
      };
  }
}

function constrainFitBoundsPadding(
  padding: FitBoundsPadding,
  viewportWidth: number,
  viewportHeight: number
): FitBoundsPadding {
  const maxVerticalPadding = Math.max(0, viewportHeight * 0.48);
  const maxHorizontalPadding = Math.max(0, viewportWidth * 0.5);
  const [top, bottom] = scalePaddingPair(
    padding.top,
    padding.bottom,
    maxVerticalPadding
  );
  const [left, right] = scalePaddingPair(
    padding.left,
    padding.right,
    maxHorizontalPadding
  );
  return { top, right, bottom, left };
}

function scalePaddingPair(
  primary: number,
  secondary: number,
  maxTotal: number
): [number, number] {
  const total = primary + secondary;
  if (total <= maxTotal || total === 0) {
    return [Math.round(primary), Math.round(secondary)];
  }
  const scale = maxTotal / total;
  return [Math.round(primary * scale), Math.round(secondary * scale)];
}

function extendBoundsWithMarkers(
  bounds: maplibregl.LngLatBounds,
  markers: maplibregl.Marker[]
): void {
  markers.forEach((marker) => bounds.extend(marker.getLngLat()));
}

function getAreaColoringData(): FeatureCollection | undefined {
  const source = map.value?.getSource(areaColorSourceId) as
    | maplibregl.GeoJSONSource
    | undefined;
  return source !== undefined
    ? filterFeatureCollection(
        toRaw(geoJsonStore.japanWithSubAreas!) as FeatureCollection,
        areaColoring.value.areas
      )
    : undefined;
}

function extendBoundsWithFeatureCollection(
  bounds: maplibregl.LngLatBounds,
  collection?: FeatureCollection
): void {
  collection?.features.forEach((feature) => {
    collectCoordinates(feature.geometry).forEach((coordinate) => {
      bounds.extend([coordinate[0], coordinate[1]]);
    });
  });
}

function collectCoordinates(geometry: Geometry | null): Position[] {
  if (geometry === null) {
    return [];
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((entry) => collectCoordinates(entry));
  }
  return flattenPositions(geometry.coordinates);
}

function flattenPositions(value: unknown): Position[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (typeof value[0] === "number") {
    return [value as Position];
  }
  return value.flatMap((entry) => flattenPositions(entry));
}

function areaIntensityToColor(intensity: AllAreaIntensities): void {
  areaColoring.value = {
    colors: {},
    areas: [],
  };
  for (const i in intensity) {
    const color =
      intensityStore.intensityColors[intensity[i].intensity] ?? "#666666";
    areaColoring.value.colors[i] = color;
    areaColoring.value.areas.push(i);
  }
}

function filterMapColoring(feature: IGeoJsonFeature): boolean {
  return areaColoring.value.areas.indexOf(feature.properties.name) !== -1;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
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
  removeWaveCircle,
  filterMapColoring,
});
</script>

<style lang="scss">
@import "@/assets/generic.scss";

.quake-maplibre {
  --quake-map-element-scale: 1;

  width: 100%;
  height: 100%;
  background: #182024;
}

.quake-maplibre--scaled {
  --quake-map-element-scale: 1.5;
}

.quake-maplibre .maplibregl-ctrl-bottom-right {
  right: 18px;
  bottom: 18px;
}

.quake-maplibre .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(13, 19, 22, 0.76);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.quake-maplibre .maplibregl-ctrl button {
  width: 36px;
  height: 36px;
  background-color: transparent;
}

.quake-maplibre .maplibregl-ctrl-icon {
  filter: invert(1) brightness(1.35);
}

.quake-maplibre .maplibregl-ctrl button + button {
  border-top-color: rgba(255, 255, 255, 0.12);
}

.quake-maplibre .maplibregl-ctrl-attrib {
  border-radius: 6px;
  background: rgba(13, 19, 22, 0.66);
  color: #d8e2ea;
  backdrop-filter: blur(12px);
}

.epicenter-marker {
  width: calc(42px * var(--quake-map-element-scale));
  height: calc(42px * var(--quake-map-element-scale));
  z-index: 100;
  filter: drop-shadow(0 0 10px rgba(255, 238, 90, 0.52))
    drop-shadow(0 10px 20px rgba(0, 0, 0, 0.38));
}

.intensity-add-icon {
  align-self: flex-end;
  font-size: 13px !important;
  position: initial !important;
}

.intensity-big,
.intensity-small {
  display: flex !important;
  justify-content: center;
  box-sizing: border-box;
  border: calc(2px * var(--quake-map-element-scale)) solid
    rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.32);
  font-family: B612, sans-serif;
  font-weight: 900;
}

.intensity-big {
  width: calc(30px * var(--quake-map-element-scale)) !important;
  height: calc(30px * var(--quake-map-element-scale)) !important;
  border-radius: calc(7px * var(--quake-map-element-scale));
  font-size: calc(19px * var(--quake-map-element-scale)) !important;
  align-items: flex-end;

  .intensity-add {
    margin-left: calc(-1px * var(--quake-map-element-scale));
    transform: translate(calc(-1px * var(--quake-map-element-scale)), -0.4em);
  }
}

.quake-maplibre--scaled {
  .intensity-small {
    align-items: center;
  }
}

.intensity-small {
  width: calc(22px * var(--quake-map-element-scale)) !important;
  height: calc(22px * var(--quake-map-element-scale)) !important;
  border-radius: 50%;
  font-size: calc(14px * var(--quake-map-element-scale)) !important;

  .intensity-add {
    margin-left: calc(-1px * var(--quake-map-element-scale));
    transform: translate(calc(-1px * var(--quake-map-element-scale)), -0.1em);
  }
}

.intensity-add {
  align-self: flex-end;
  margin-left: 0;
  font-size: calc(14px * var(--quake-map-element-scale));
  transform: translateY(-1.7em);
}

@keyframes blink {
  50% {
    border-color: rgba(255, 255, 255, 0.24);
    box-shadow: 0 0 18px currentColor;
  }
}

.intensity-lg-blink {
  animation: blink 1s infinite;
}

.intensity-lg-1 {
  border-color: #94bdff;
}

.intensity-lg-2 {
  border-color: #d8d84c;
}

.intensity-lg-3 {
  border-color: #f6829d;
}

.intensity-lg-4 {
  border-color: #e59cff;
}

.intensity-lg {
  border-radius: 100px !important;
}
</style>
