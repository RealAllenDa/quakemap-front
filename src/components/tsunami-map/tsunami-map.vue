<template>
  <div class="tsunami-maplibre-frame">
    <div :id="mapContainerId" class="tsunami-maplibre"></div>
    <section
      v-if="currentTourStop !== undefined"
      :style="{ '--tsunami-tour-grade-color': currentTourStop.color }"
      aria-label="Current tsunami tour area"
      class="tsunami-tour-panel"
    >
      <div class="tsunami-tour-panel__top">
        <div class="tsunami-tour-panel__summary">
          <span class="tsunami-tour-panel__grade">
            {{ currentTourStop.gradeLabel }}
          </span>
          <div class="tsunami-tour-panel__region">
            <small>Region</small>
            <strong>{{ currentTourStop.name }}</strong>
          </div>
        </div>

        <div class="tsunami-tour-panel__facts">
          <span
            v-if="currentTourStop.expectedHeight.trim() !== ''"
            class="tsunami-tour-panel__fact tsunami-tour-panel__fact--height"
          >
            <small>Expected Height</small>
            <strong>{{ currentTourStop.expectedHeight }}</strong>
          </span>
          <span class="tsunami-tour-panel__fact">
            <small>First Arrival</small>
            <strong>{{ currentTourStop.arrival }}</strong>
          </span>
        </div>
      </div>

      <div
        v-if="currentTourStop.observations.length > 0"
        class="tsunami-tour-panel__observations"
      >
        <small>Observed Stations</small>
        <table class="tsunami-tour-panel__station-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Observe Time</th>
              <th>Height</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="observation in currentTourStop.observations"
              :key="observation.name"
            >
              <td>{{ observation.name }}</td>
              <td>{{ observation.observedTime }}</td>
              <td>
                <span class="tsunami-tour-panel__height-wrap">
                  <strong :style="{ color: observation.color }">
                    {{ observation.observedHeight }}
                  </strong>
                  <span
                    v-if="observation.isRising"
                    class="tsunami-tour-panel__rising"
                  >
                    Rising
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div ref="areaNameOverlay" class="tsunami-area-name-overlay"></div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toRaw,
  watch,
} from "vue";
import maplibregl from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import type {
  IMapLegend,
  ITsunamiExpectationAreas,
  ITsunamiInfo,
  ITsunamiObservationAreas,
  ITsunamiTime,
} from "@/interfaces/api/TsunamiInfo";
import type { ITsunamiGeoJsonFeatures } from "@/interfaces/parsing/GeoJson";
import { useGeoJsonStore } from "@/stores/geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { tsunamiStationPoints } from "@/assets/tsunami-points";

type LngLat = [number, number];

interface TourStop {
  name: string;
  grade: string;
  gradeLabel: string;
  color: string;
  arrival: string;
  expectedHeight: string;
  geometry: Polygon;
  center: LngLat;
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  observations: TourObservation[];
}

interface TourObservation {
  name: string;
  observedHeight: string;
  observedTime: string;
  color: string;
  heightCondition: string;
  isRising: boolean;
}

interface ExpectedLabelProperties {
  name: string;
  grade: string;
  color: string;
  arrival: string;
  expectedHeight: string;

  [name: string]: string | number | boolean | null | undefined;
}

interface ObservationPointProperties {
  name: string;
  color: string;
  heightMeters: number;
  observedHeight: string;
  observedTime: string;
  condition: string;
  heightCondition: string;
  isRising: boolean;
  rising: string;

  [name: string]: string | number | boolean | null | undefined;
}

interface CoastlineWarningProperties {
  name: string;
  grade: string;
  color: string;
  width: number;

  [name: string]: string | number | boolean | null | undefined;
}

interface AreaNameMarkerDatum {
  name: string;
  color: string;
  expectedHeight: string;
  arrival: string;
  center: LngLat;
  elevation: number;
  element: HTMLDivElement;
}

interface ProjectableMercatorTransform {
  width: number;
  height: number;
  coordinatePoint?: (
    coordinate: maplibregl.MercatorCoordinate,
    elevation?: number
  ) => { x: number; y: number };
}

const props = defineProps<{
  id: string;
  fetchType: string;
  tsunamiInfo?: ITsunamiInfo;
  toursEnabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "grades-change", value: IMapLegend): void;
}>();

const geoJsonStore = useGeoJsonStore();
const map = ref<maplibregl.Map>();
const areaNameOverlay = ref<HTMLDivElement>();
const observedPointPopup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: 12,
});
const mapLoaded = ref(false);
const coastlineBlinkTimer = ref<ReturnType<typeof setInterval>>();
const coastlineBlinkVisible = ref(true);
const observedHaloAnimationFrame = ref<number>();
const coastlineTourTimer = ref<ReturnType<typeof setTimeout>>();
const coastlineTourStartTimer = ref<ReturnType<typeof setTimeout>>();
const coastlineTourIndex = ref(0);
const latestTourStops = ref<TourStop[]>([]);
const currentTourStop = ref<TourStop>();
const warnedUndisplayableAreas = new Set<string>();
const mapContainerId = computed(() => `map-${props.id}`);
const toursEnabled = computed(() => props.toursEnabled === true);

const observationSourceId = "observed-tsunami-points";
const coastlineWarningSourceId = "tsunami-coastline-warnings";
const labelMinZoom = 5.45;
const tourStartDelayMs = 1800 / 2;
const tourStepDelayMs = 10400 / 3;

const gradeColors: Record<string, string> = {
  MajorWarning: "#B65BD2",
  Warning: "#DE3329",
  Watch: "#E5A72C",
  Forecast: "#00AAFF",
};
const tourAreaOrder = [
  "オホーツク海沿岸",
  "北海道太平洋沿岸東部",
  "北海道太平洋沿岸中部",
  "北海道太平洋沿岸西部",
  "青森県太平洋沿岸",
  "陸奥湾",
  "岩手県",
  "宮城県",
  "福島県",
  "茨城県",
  "千葉県九十九里・外房",
  "千葉県内房",
  "東京湾内湾",
  "相模湾・三浦半島",
  "伊豆諸島",
  "小笠原諸島",
  "静岡県",
  "愛知県外海",
  "伊勢・三河湾",
  "三重県南部",
  "和歌山県",
  "大阪府",
  "兵庫県瀬戸内海沿岸",
  "淡路島南部",
  "徳島県",
  "香川県",
  "岡山県",
  "広島県",
  "愛媛県瀬戸内海沿岸",
  "高知県",
  "愛媛県宇和海沿岸",
  "山口県瀬戸内海沿岸",
  "福岡県瀬戸内海沿岸",
  "大分県瀬戸内海沿岸",
  "大分県豊後水道沿岸",
  "宮崎県",
  "鹿児島県東部",
  "種子島・屋久島地方",
  "奄美群島・トカラ列島",
  "沖縄本島地方",
  "宮古島・八重山地方",
  "大東島地方",
  "鹿児島県西部",
  "熊本県天草灘沿岸",
  "有明・八代海",
  "長崎県西方",
  "佐賀県北部",
  "壱岐・対馬",
  "福岡県日本海沿岸",
  "山口県日本海沿岸",
  "島根県出雲・石見",
  "隠岐",
  "鳥取県",
  "兵庫県北部",
  "京都府",
  "福井県",
  "石川県加賀",
  "石川県能登",
  "富山県",
  "新潟県上中下越",
  "佐渡",
  "山形県",
  "秋田県",
  "青森県日本海沿岸",
  "北海道日本海沿岸南部",
  "北海道日本海沿岸北部",
] as const;
const tourAreaOrderIndex = new Map<string, number>(
  tourAreaOrder.map((name, index): [string, number] => [name, index])
);
const areaNameMarkers: AreaNameMarkerDatum[] = [];

onMounted(async () => {
  await nextTick();
  map.value = new maplibregl.Map({
    container: mapContainerId.value,
    style: {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {},
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#202632",
          },
        },
      ],
    },
    center: [138.42138499239283, 38.426610210705135],
    zoom: 4.45,
    pitch: 62,
    bearing: -18,
    attributionControl: false,
  });

  map.value.on("load", () => {
    mapLoaded.value = true;
    map.value!.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      "bottom-right"
    );
    addBaseLayers();
    addTsunamiLayers();
    addObservedPointHoverHandlers();
    map.value!.on("click", handleMapClick);
    map.value!.on("move", updateAreaNameMarkerPositions);
    map.value!.on("zoom", updateAreaNameMarkerPositions);
    map.value!.on("pitch", updateAreaNameMarkerPositions);
    map.value!.on("rotate", updateAreaNameMarkerPositions);
    map.value!.on("resize", updateAreaNameMarkerPositions);
    updateTsunamiLayers(props.tsunamiInfo);
  });
});

onUnmounted(() => {
  if (coastlineBlinkTimer.value !== undefined) {
    clearInterval(coastlineBlinkTimer.value);
  }
  if (observedHaloAnimationFrame.value !== undefined) {
    cancelAnimationFrame(observedHaloAnimationFrame.value);
  }
  stopAffectedCoastlineTour();
  clearAreaNameMarkers();
  map.value?.off("move", updateAreaNameMarkerPositions);
  map.value?.off("zoom", updateAreaNameMarkerPositions);
  map.value?.off("pitch", updateAreaNameMarkerPositions);
  map.value?.off("rotate", updateAreaNameMarkerPositions);
  map.value?.off("resize", updateAreaNameMarkerPositions);
  map.value?.off("click", handleMapClick);
  removeObservedPointHoverHandlers();
  observedPointPopup.remove();
  map.value?.remove();
});

watch(
  () => props.tsunamiInfo,
  (value) => {
    updateTsunamiLayers(value);
  },
  { deep: true }
);

watch(
  () => props.toursEnabled,
  () => {
    restartAffectedCoastlineTour();
  }
);

function addBaseLayers() {
  const japanGeoJson = toRaw(geoJsonStore.tsunamiJapan) as FeatureCollection;
  const areaLinesGeoJson = toRaw(
    geoJsonStore.japanAreaLine
  ) as FeatureCollection;

  if (japanGeoJson !== undefined) {
    map.value!.addSource("japan-land", {
      type: "geojson",
      data: japanGeoJson,
    });
    map.value!.addLayer({
      id: "japan-land-fill",
      type: "fill",
      source: "japan-land",
      paint: {
        "fill-color": "#4e565c",
        "fill-opacity": 0.95,
      },
    });
  }

  if (areaLinesGeoJson !== undefined) {
    map.value!.addSource("japan-area-lines", {
      type: "geojson",
      data: areaLinesGeoJson,
    });
    map.value!.addLayer({
      id: "japan-area-lines",
      type: "line",
      source: "japan-area-lines",
      paint: {
        "line-color": "#151a1f",
        "line-width": 0.8,
        "line-opacity": 0.8,
      },
    });
  }
}

function addTsunamiLayers() {
  addEmptySource(observationSourceId);
  addEmptySource(coastlineWarningSourceId);

  map.value!.addLayer({
    id: "tsunami-coastline-warnings",
    type: "line",
    source: coastlineWarningSourceId,
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "width"],
      "line-opacity": 0.95,
      "line-blur": 0.25,
    },
  });
  map.value!.addLayer({
    id: "observed-tsunami-rising-halo",
    type: "circle",
    source: observationSourceId,
    filter: ["==", ["get", "rising"], "true"],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": observedHaloRadius(0),
      "circle-opacity": 0.12,
      "circle-pitch-alignment": "viewport",
      "circle-pitch-scale": "viewport",
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-opacity": 0.3,
      "circle-stroke-width": 1.2,
    },
  } as unknown as maplibregl.AddLayerObject);
  map.value!.addLayer({
    id: "observed-tsunami-points",
    type: "circle",
    source: observationSourceId,
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": baseObservedPointRadius(),
      "circle-opacity": 0.94,
      "circle-pitch-alignment": "viewport",
      "circle-pitch-scale": "viewport",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-opacity": 0.9,
      "circle-stroke-width": 1.8,
    },
  } as unknown as maplibregl.AddLayerObject);
  startObservedHaloBreathing();
  startCoastlineBlink();
}

function addEmptySource(sourceId: string) {
  map.value!.addSource(sourceId, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });
}

function updateTsunamiLayers(tsunamiInfo?: ITsunamiInfo) {
  if (!mapLoaded.value || map.value === undefined) {
    return;
  }

  if (tsunamiInfo === undefined) {
    setSourceData(observationSourceId, emptyFeatureCollection());
    setSourceData(coastlineWarningSourceId, emptyFeatureCollection());
    clearAreaNameMarkers();
    stopAffectedCoastlineTour();
    emit("grades-change", emptyGrades());
    return;
  }

  const areaLookup = buildAreaLookup();
  const stationLookup = tsunamiStationPoints;
  const areaFeatureLookup = buildAreaFeatureLookup();
  const expectedAreas = getExpectedAreas(tsunamiInfo);
  const expectedLabels = buildExpectedLabels(expectedAreas, areaLookup);
  const coastlineWarnings = buildCoastlineWarnings(
    expectedAreas,
    areaFeatureLookup
  );
  const observedPoints = buildObservedPoints(
    getObservedAreas(tsunamiInfo),
    stationLookup
  );

  setSourceData(observationSourceId, observedPoints);
  setSourceData(coastlineWarningSourceId, coastlineWarnings);
  setAreaNameMarkers(expectedLabels.features);
  fitToVisibleData(expectedLabels, observedPoints);
  startAffectedCoastlineTour(expectedLabels, areaFeatureLookup, observedPoints);
  emit("grades-change", calculateGrades(expectedAreas));
}

function setSourceData(sourceId: string, data: FeatureCollection) {
  const source = map.value!.getSource(sourceId) as maplibregl.GeoJSONSource;
  source.setData(data);
}

function getExpectedAreas(
  tsunamiInfo: ITsunamiInfo
): ITsunamiExpectationAreas[] {
  if (props.fetchType === "forecast") {
    return tsunamiInfo.info.forecast_areas ?? [];
  }
  return tsunamiInfo.info.areas ?? tsunamiInfo.info.forecast_areas ?? [];
}

function getObservedAreas(
  tsunamiInfo: ITsunamiInfo
): ITsunamiObservationAreas[] {
  if (tsunamiInfo.watch.receive_time === null) {
    return [];
  }
  return sortObservationAreas(tsunamiInfo.watch.areas ?? []);
}

function sortObservationAreas(
  areas: ITsunamiObservationAreas[]
): ITsunamiObservationAreas[] {
  return [...areas].sort(compareObservationAreas).reverse();
}

function compareObservationAreas(
  first: ITsunamiObservationAreas,
  second: ITsunamiObservationAreas
) {
  const firstHeight = parseFloat(first.height);
  const secondHeight = parseFloat(second.height);
  const firstHeightNaN = Number.isNaN(firstHeight);
  const secondHeightNaN = Number.isNaN(secondHeight);

  if (firstHeightNaN && secondHeightNaN) {
    return compareObservationConditions(first.condition, second.condition);
  }
  if (firstHeightNaN && !secondHeightNaN) {
    return -99;
  }
  if (!firstHeightNaN && secondHeightNaN) {
    return 99;
  }
  return firstHeight - secondHeight;
}

function compareObservationConditions(first: string, second: string) {
  if (first === "Observing") {
    if (second === "Observing") {
      return 0;
    }
    if (second === "Weak") {
      return -99;
    }
    console.error(`Unexpected comparison between ${first} and ${second}`);
    return 0;
  }

  if (first === "Weak") {
    if (second === "Observing") {
      return 99;
    }
    if (second === "Weak") {
      return 0;
    }
    console.error(`Unexpected comparison between ${first} and ${second}`);
    return 0;
  }

  console.error(`Unexpected comparison between ${first} and ${second}`);
  return 0;
}

function buildExpectedLabels(
  areas: ITsunamiExpectationAreas[],
  areaLookup: Map<string, LngLat>
): FeatureCollection<Polygon, ExpectedLabelProperties> {
  const features: Feature<Polygon, ExpectedLabelProperties>[] = [];
  areas.forEach((area, index) => {
    const center = areaLookup.get(area.name);
    if (center === undefined) {
      warnUndisplayableArea(area.name, "expected tsunami height label");
      return;
    }

    const color = gradeColors[area.grade] ?? "#7dd3fc";
    features.push({
      type: "Feature",
      properties: {
        name: area.name,
        grade: area.grade,
        color,
        arrival: formatArrivalTime(area.time),
        expectedHeight: normalizeDisplayHeight(area.height, area.grade),
      },
      geometry: makeRectangle(
        offsetPoint(center, index, areas.length, 3600),
        9000,
        17000
      ),
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildObservedPoints(
  areas: ITsunamiObservationAreas[],
  areaLookup: Map<string, LngLat>
): FeatureCollection<Point, ObservationPointProperties> {
  const features: Feature<Point, ObservationPointProperties>[] = [];
  areas.forEach((area) => {
    const center = areaLookup.get(area.name);
    const heightMeters = parseObservationHeightMeters(area);
    const displayStationStatus = isObservedStationStatus(area.condition);
    const isRising = isRisingHeightCondition(area.height_condition);
    if (center === undefined) {
      warnUndisplayableArea(area.name, "observed tsunami height point");
      return;
    }
    if (heightMeters <= 0 && !displayStationStatus) {
      warnUndisplayableArea(
        area.name,
        `observed tsunami height: ${heightMeters}`
      );
      return;
    }

    features.push({
      type: "Feature",
      properties: {
        name: area.name,
        color: observationColor(heightMeters, area.condition),
        heightMeters,
        observedHeight: formatObservationHeight(area),
        observedTime: area.condition !== "Observing" ? area.time : "",
        condition: area.condition,
        heightCondition: area.height_condition,
        isRising,
        rising: isRising ? "true" : "false",
      },
      geometry: {
        type: "Point",
        coordinates: center,
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildCoastlineWarnings(
  areas: ITsunamiExpectationAreas[],
  areaFeatureLookup: Map<string, ITsunamiGeoJsonFeatures>
): FeatureCollection<Geometry, CoastlineWarningProperties> {
  const features: Feature<Geometry, CoastlineWarningProperties>[] = [];
  areas.forEach((area) => {
    if (!isWarningGrade(area.grade)) {
      return;
    }

    const feature = areaFeatureLookup.get(area.name);
    if (feature === undefined) {
      return;
    }

    features.push({
      type: "Feature",
      properties: {
        name: area.name,
        grade: area.grade,
        color: gradeColors[area.grade],
        width: coastlineWidth(area.grade),
      },
      geometry: feature.geometry,
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildAreaLookup(): Map<string, LngLat> {
  const lookup = new Map<string, LngLat>();
  const areas = toRaw(geoJsonStore.tsunamiAreas) as
    | FeatureCollection
    | undefined;
  if (areas === undefined) {
    return lookup;
  }

  (areas.features as ITsunamiGeoJsonFeatures[]).forEach((feature) => {
    const coordinates = collectCoordinates(feature.geometry);
    if (coordinates.length === 0) {
      return;
    }
    lookup.set(feature.properties.name, representativePoint(coordinates));
  });
  return lookup;
}

function buildAreaFeatureLookup(): Map<string, ITsunamiGeoJsonFeatures> {
  const lookup = new Map<string, ITsunamiGeoJsonFeatures>();
  const areas = toRaw(geoJsonStore.tsunamiAreas) as
    | FeatureCollection
    | undefined;
  if (areas === undefined) {
    return lookup;
  }

  (areas.features as ITsunamiGeoJsonFeatures[]).forEach((feature) => {
    lookup.set(feature.properties.name, feature);
  });
  return lookup;
}

function collectCoordinates(geometry: Geometry): LngLat[] {
  const coordinates: LngLat[] = [];
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((entry) => collectCoordinates(entry));
  }

  const source = geometry.coordinates as unknown[];

  function visit(value: unknown) {
    if (!Array.isArray(value)) {
      return;
    }
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      coordinates.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  }

  visit(source);
  return coordinates;
}

function geometryBounds(coordinates: LngLat[]) {
  return coordinates.reduce(
    (result, coordinate) => ({
      minLng: Math.min(result.minLng, coordinate[0]),
      maxLng: Math.max(result.maxLng, coordinate[0]),
      minLat: Math.min(result.minLat, coordinate[1]),
      maxLat: Math.max(result.maxLat, coordinate[1]),
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    }
  );
}

function boundsCenter(bounds: TourStop["bounds"]): LngLat {
  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

function pointInGeometry(point: LngLat, geometry: Geometry): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates as LngLat[][]);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as LngLat[][][]).some((polygon) =>
      pointInPolygon(point, polygon)
    );
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.some((entry) => pointInGeometry(point, entry));
  }
  return false;
}

function pointInPolygon(point: LngLat, rings: LngLat[][]) {
  if (rings.length === 0 || !pointInRing(point, rings[0])) {
    return false;
  }
  return !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInRing(point: LngLat, ring: LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInBounds(point: LngLat, bounds: TourStop["bounds"], buffer = 0) {
  return (
    point[0] >= bounds.minLng - buffer &&
    point[0] <= bounds.maxLng + buffer &&
    point[1] >= bounds.minLat - buffer &&
    point[1] <= bounds.maxLat + buffer
  );
}

function representativePoint(coordinates: LngLat[]): LngLat {
  const bounds = coordinates.reduce(
    (result, coordinate) => ({
      minLng: Math.min(result.minLng, coordinate[0]),
      maxLng: Math.max(result.maxLng, coordinate[0]),
      minLat: Math.min(result.minLat, coordinate[1]),
      maxLat: Math.max(result.maxLat, coordinate[1]),
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    }
  );

  const center: LngLat = [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];

  return coordinates.reduce((closest, coordinate) => {
    return distanceSquared(coordinate, center) <
      distanceSquared(closest, center)
      ? coordinate
      : closest;
  }, coordinates[0]);
}

function makeRectangle(
  center: LngLat,
  widthMeters: number,
  depthMeters: number
) {
  const westSouth = meterOffset(center, -widthMeters / 2, -depthMeters / 2);
  const eastSouth = meterOffset(center, widthMeters / 2, -depthMeters / 2);
  const eastNorth = meterOffset(center, widthMeters / 2, depthMeters / 2);
  const westNorth = meterOffset(center, -widthMeters / 2, depthMeters / 2);
  return {
    type: "Polygon",
    coordinates: [[westSouth, eastSouth, eastNorth, westNorth, westSouth]],
  } as Polygon;
}

function meterOffset(
  center: LngLat,
  eastMeters: number,
  northMeters: number
): LngLat {
  const latRadians = (center[1] * Math.PI) / 180;
  const lngMeters = 111320 * Math.max(Math.cos(latRadians), 0.2);
  return [center[0] + eastMeters / lngMeters, center[1] + northMeters / 110540];
}

function offsetPoint(
  center: LngLat,
  index: number,
  total: number,
  radiusMeters: number
): LngLat {
  const radians =
    ((index % Math.max(total, 1)) / Math.max(total, 1)) * Math.PI * 2;
  return meterOffset(
    center,
    Math.cos(radians) * radiusMeters,
    Math.sin(radians) * radiusMeters
  );
}

function polygonCenter(polygon: Polygon): LngLat {
  const ring = polygon.coordinates[0] as LngLat[];
  const coordinates =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const bounds = coordinates.reduce(
    (result, coordinate) => ({
      minLng: Math.min(result.minLng, coordinate[0]),
      maxLng: Math.max(result.maxLng, coordinate[0]),
      minLat: Math.min(result.minLat, coordinate[1]),
      maxLat: Math.max(result.maxLat, coordinate[1]),
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    }
  );

  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

function parseObservationHeightMeters(area: ITsunamiObservationAreas) {
  if (area.condition !== "None" && Number.isNaN(parseFloat(area.height))) {
    return 0;
  }
  return parseHeightMeters(area.height);
}

function isObservedStationStatus(condition: string) {
  return condition === "Observing" || condition === "Weak";
}

function isRisingHeightCondition(condition: string) {
  return condition.toLowerCase() === "rising";
}

function parseHeightMeters(value: string, grade?: string) {
  const normalized = value
    .replace(/<[^>]+>/g, "")
    .replace(/,/g, "")
    .replace(/＋/g, "+")
    .toLowerCase();
  const matches = normalized.match(/\d+(\.\d+)?/g);
  if (matches !== null) {
    const number = Math.max(...matches.map((match) => parseFloat(match)));
    if (normalized.includes("cm") && !normalized.includes("m")) {
      return number / 100;
    }
    return number;
  }
  if (grade === "MajorWarning") {
    return 5;
  }
  if (grade === "Warning") {
    return 3;
  }
  if (grade === "Watch") {
    return 1;
  }
  return 0;
}

function formatArrivalTime(time: ITsunamiExpectationAreas["time"]) {
  if (time.type === "time") {
    return (time as ITsunamiTime).time;
  }
  return time.time;
}

function normalizeDisplayHeight(height: string, grade: string) {
  if (height === "Unknown") {
    return grade === "Forecast" ? "<0.2m" : "";
  }
  return height.replace(/<[^>]+>/g, "");
}

function gradeLabel(grade: string) {
  if (grade === "MajorWarning") {
    return "Major Warning";
  }
  if (grade === "Warning") {
    return "Warning";
  }
  if (grade === "Watch") {
    return "Advisory";
  }
  if (grade === "Forecast") {
    return "Forecast";
  }
  return grade;
}

function formatObservationHeight(area: ITsunamiObservationAreas) {
  if (area.condition !== "None") {
    return area.condition;
  }
  return `${area.height_is_max ? "Over " : ""}${area.height}m`;
}

function observationColor(heightMeters: number, condition?: string) {
  if (condition !== undefined && isObservedStationStatus(condition)) {
    return "#9aa4af";
  }
  if (heightMeters >= 3) {
    return "#B65BD2";
  }
  if (heightMeters >= 1) {
    return "#DE3329";
  }
  if (heightMeters >= 0.5) {
    return "#E5A72C";
  }
  return "#33C4A5";
}

function isWarningGrade(grade: string) {
  return grade === "MajorWarning" || grade === "Warning" || grade === "Watch";
}

function coastlineWidth(grade: string) {
  if (grade === "MajorWarning") {
    return 9;
  }
  if (grade === "Warning") {
    return 7;
  }
  return 5;
}

function startCoastlineBlink() {
  if (coastlineBlinkTimer.value !== undefined) {
    clearInterval(coastlineBlinkTimer.value);
  }

  coastlineBlinkTimer.value = setInterval(() => {
    if (
      map.value === undefined ||
      map.value.getLayer("tsunami-coastline-warnings") === undefined
    ) {
      return;
    }
    coastlineBlinkVisible.value = !coastlineBlinkVisible.value;
    map.value.setPaintProperty(
      "tsunami-coastline-warnings",
      "line-opacity",
      coastlineBlinkVisible.value ? 0.95 : 0.14
    );
  }, 700);
}

function startObservedHaloBreathing() {
  if (observedHaloAnimationFrame.value !== undefined) {
    cancelAnimationFrame(observedHaloAnimationFrame.value);
  }

  const animate = (timestamp: number) => {
    if (
      map.value === undefined ||
      map.value.getLayer("observed-tsunami-rising-halo") === undefined
    ) {
      return;
    }

    const progress = (Math.sin(timestamp / 520) + 1) / 2;
    map.value.setPaintProperty(
      "observed-tsunami-rising-halo",
      "circle-radius",
      observedHaloRadius(progress)
    );
    map.value.setPaintProperty(
      "observed-tsunami-rising-halo",
      "circle-opacity",
      0.1 + progress * 0.22
    );
    map.value.setPaintProperty(
      "observed-tsunami-rising-halo",
      "circle-stroke-opacity",
      0.28 + progress * 0.38
    );
    observedHaloAnimationFrame.value = requestAnimationFrame(animate);
  };

  observedHaloAnimationFrame.value = requestAnimationFrame(animate);
}

function baseObservedPointRadius() {
  return [
    "interpolate",
    ["linear"],
    ["get", "heightMeters"],
    0,
    5,
    0.5,
    7,
    1,
    9,
    3,
    12,
  ];
}

function observedHaloRadius(progress: number) {
  return [
    "interpolate",
    ["linear"],
    ["get", "heightMeters"],
    0,
    interpolateNumber(10, 13, progress),
    0.5,
    interpolateNumber(12, 15, progress),
    1,
    interpolateNumber(14, 17, progress),
    3,
    interpolateNumber(17, 21, progress),
  ];
}

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function warnUndisplayableArea(areaName: string, layerDescription: string) {
  const warningKey = `${layerDescription}:${areaName}`;
  if (warnedUndisplayableAreas.has(warningKey)) {
    return;
  }

  warnedUndisplayableAreas.add(warningKey);
  console.warn(
    `Unable to display ${layerDescription} for tsunami area: ${areaName}`
  );
}

function addObservedPointHoverHandlers() {
  map.value!.on(
    "mouseenter",
    "observed-tsunami-points",
    handleObservedPointEnter
  );
  map.value!.on(
    "mousemove",
    "observed-tsunami-points",
    handleObservedPointMove
  );
  map.value!.on(
    "mouseleave",
    "observed-tsunami-points",
    handleObservedPointLeave
  );
}

function removeObservedPointHoverHandlers() {
  if (map.value === undefined) {
    return;
  }
  map.value.off(
    "mouseenter",
    "observed-tsunami-points",
    handleObservedPointEnter
  );
  map.value.off(
    "mousemove",
    "observed-tsunami-points",
    handleObservedPointMove
  );
  map.value.off(
    "mouseleave",
    "observed-tsunami-points",
    handleObservedPointLeave
  );
}

function handleMapClick() {
  closeTourPanel();
}

function openTourPanelByName(name: string) {
  const stop = latestTourStops.value.find((tourStop) => {
    return tourStop.name === name;
  });

  if (stop === undefined) {
    closeTourPanel();
    return;
  }

  selectTourStop(stop);
}

function closeTourPanel() {
  selectTourStop(undefined);
}

function selectTourStop(stop?: TourStop) {
  currentTourStop.value = stop;
  updateSelectedAreaMarker(stop?.name);
}

function updateSelectedAreaMarker(selectedName?: string) {
  areaNameMarkers.forEach((marker) => {
    const selected = marker.name === selectedName;
    marker.element.classList.toggle(
      "tsunami-area-height-label--selected",
      selected
    );
    marker.element.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function handleObservedPointEnter(event: maplibregl.MapLayerMouseEvent) {
  if (map.value === undefined) {
    return;
  }
  map.value.getCanvas().style.cursor = "pointer";
  showObservedPointPopup(event);
}

function handleObservedPointMove(event: maplibregl.MapLayerMouseEvent) {
  showObservedPointPopup(event);
}

function handleObservedPointLeave() {
  if (map.value !== undefined) {
    map.value.getCanvas().style.cursor = "";
  }
  observedPointPopup.remove();
}

function showObservedPointPopup(event: maplibregl.MapLayerMouseEvent) {
  const feature = event.features?.[0];
  if (map.value === undefined || feature === undefined) {
    return;
  }

  const properties = feature.properties as
    | Partial<ObservationPointProperties>
    | undefined;
  if (properties === undefined || properties.name === undefined) {
    return;
  }

  observedPointPopup
    .setLngLat(event.lngLat)
    .setDOMContent(createObservedPointPopupContent(properties))
    .addTo(map.value);
}

function createObservedPointPopupContent(
  properties: Partial<ObservationPointProperties>
) {
  const content = document.createElement("div");
  content.className = "tsunami-observed-popup";

  const name = document.createElement("strong");
  name.className = "tsunami-observed-popup__name";
  name.textContent = properties.name ?? "";
  content.appendChild(name);

  const height = document.createElement("span");
  height.className = "tsunami-observed-popup__height";
  height.textContent = properties.observedHeight ?? "";
  height.style.setProperty(
    "--tsunami-observed-color",
    properties.color ?? "#33C4A5"
  );
  content.appendChild(height);

  const time = document.createElement("span");
  time.className = "tsunami-observed-popup__time";
  time.textContent = properties.observedTime ?? "";
  content.appendChild(time);

  if (properties.isRising === true) {
    const rising = document.createElement("span");
    rising.className = "tsunami-observed-popup__rising";
    rising.textContent = "Rising";
    content.appendChild(rising);
  }

  return content;
}

function setAreaNameMarkers(
  expectedFeatures: Feature<Polygon, ExpectedLabelProperties>[]
) {
  clearAreaNameMarkers();

  if (areaNameOverlay.value === undefined) {
    return;
  }

  expectedFeatures.forEach((feature) => {
    const element = document.createElement("div");
    element.className = "tsunami-area-height-label";
    element.setAttribute("role", "button");
    element.setAttribute(
      "aria-label",
      `Open tsunami information for ${feature.properties.name}`
    );
    element.setAttribute("aria-pressed", "false");
    element.tabIndex = 0;
    element.style.setProperty("--tsunami-area-color", feature.properties.color);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      openTourPanelByName(feature.properties.name);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openTourPanelByName(feature.properties.name);
    });
    element.appendChild(
      createAreaNameMarkerLine(
        "tsunami-area-height-label__name",
        feature.properties.name
      )
    );
    element.appendChild(
      createAreaNameMarkerLine(
        "tsunami-area-height-label__height",
        feature.properties.expectedHeight
      )
    );
    element.appendChild(
      createAreaNameMarkerLine(
        "tsunami-area-height-label__arrival",
        feature.properties.arrival
      )
    );
    areaNameOverlay.value!.appendChild(element);

    areaNameMarkers.push({
      name: feature.properties.name,
      color: feature.properties.color,
      expectedHeight: feature.properties.expectedHeight,
      arrival: feature.properties.arrival,
      center: polygonCenter(feature.geometry),
      elevation: 0,
      element,
    });
  });

  updateSelectedAreaMarker(currentTourStop.value?.name);
  updateAreaNameMarkerPositions();
}

function createAreaNameMarkerLine(className: string, text: string) {
  const line = document.createElement("span");
  line.className = className;
  line.textContent = text;
  return line;
}

function clearAreaNameMarkers() {
  areaNameMarkers.splice(0).forEach((marker) => {
    marker.element.remove();
  });
}

function updateAreaNameMarkerPositions() {
  if (map.value === undefined || areaNameMarkers.length === 0) {
    return;
  }

  const currentMap = map.value;
  const visible = currentMap.getZoom() >= labelMinZoom;
  const transform =
    currentMap.transform as unknown as ProjectableMercatorTransform;

  areaNameMarkers.forEach((marker) => {
    if (!visible) {
      marker.element.style.display = "none";
      return;
    }

    const point = projectElevatedPoint(
      transform,
      marker.center,
      marker.elevation
    );

    if (
      point === undefined ||
      point.x < -120 ||
      point.y < -80 ||
      point.x > transform.width + 120 ||
      point.y > transform.height + 80
    ) {
      marker.element.style.display = "none";
      return;
    }

    marker.element.style.display = "block";
    marker.element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
  });
}

function projectElevatedPoint(
  transform: ProjectableMercatorTransform,
  center: LngLat,
  elevation: number
) {
  if (transform.coordinatePoint === undefined) {
    return undefined;
  }

  const coordinate = maplibregl.MercatorCoordinate.fromLngLat({
    lng: center[0],
    lat: center[1],
  });

  return transform.coordinatePoint(coordinate, elevation);
}

function startAffectedCoastlineTour(
  expectedLabels: FeatureCollection<Polygon, ExpectedLabelProperties>,
  areaFeatureLookup: Map<string, ITsunamiGeoJsonFeatures>,
  observedPoints: FeatureCollection<Point, ObservationPointProperties>
) {
  latestTourStops.value = buildAffectedTourStops(
    expectedLabels,
    areaFeatureLookup,
    observedPoints
  );

  restartAffectedCoastlineTour();
}

function restartAffectedCoastlineTour() {
  const stops = latestTourStops.value;

  if (!toursEnabled.value || stops.length === 0) {
    stopAffectedCoastlineTour();
    return;
  }

  stopAffectedCoastlineTour();
  coastlineTourIndex.value = 0;
  coastlineTourStartTimer.value = setTimeout(() => {
    advanceAffectedCoastlineTour(stops);
  }, tourStartDelayMs);
}

function stopAffectedCoastlineTour() {
  if (coastlineTourStartTimer.value !== undefined) {
    clearTimeout(coastlineTourStartTimer.value);
    coastlineTourStartTimer.value = undefined;
  }
  if (coastlineTourTimer.value !== undefined) {
    clearTimeout(coastlineTourTimer.value);
    coastlineTourTimer.value = undefined;
  }
  closeTourPanel();
}

function advanceAffectedCoastlineTour(stops: TourStop[]) {
  if (!toursEnabled.value) {
    stopAffectedCoastlineTour();
    return;
  }

  flyToAffectedCoastline(stops);
  coastlineTourTimer.value = setTimeout(() => {
    advanceAffectedCoastlineTour(stops);
  }, tourStepDelayMs);
}

function flyToAffectedCoastline(stops: TourStop[]) {
  if (map.value === undefined || stops.length === 0) {
    return;
  }

  const stop = stops[coastlineTourIndex.value % stops.length];
  coastlineTourIndex.value += 1;
  selectTourStop(stop);

  const bounds = new maplibregl.LngLatBounds(
    [stop.bounds.minLng, stop.bounds.minLat],
    [stop.bounds.maxLng, stop.bounds.maxLat]
  );
  map.value.fitBounds(bounds, {
    padding: {
      top: 150,
      right: 80,
      bottom: 70,
      left: 80,
    },
    maxZoom: 7.7,
    duration: 900,
    pitch: 0,
    linear: true,
    bearing: -18,
  });
}

function buildAffectedTourStops(
  expectedLabels: FeatureCollection<Polygon, ExpectedLabelProperties>,
  areaFeatureLookup: Map<string, ITsunamiGeoJsonFeatures>,
  observedPoints: FeatureCollection<Point, ObservationPointProperties>
) {
  const stops: TourStop[] = [];
  expectedLabels.features.forEach((expectedLabel) => {
    const areaFeature = areaFeatureLookup.get(expectedLabel.properties.name);
    if (areaFeature === undefined) {
      warnUndisplayableArea(expectedLabel.properties.name, "tour area");
      return;
    }

    const areaCoordinates = collectCoordinates(areaFeature.geometry);
    if (areaCoordinates.length === 0) {
      warnUndisplayableArea(expectedLabel.properties.name, "tour area");
      return;
    }

    const areaBounds = geometryBounds(areaCoordinates);
    stops.push({
      name: expectedLabel.properties.name,
      grade: expectedLabel.properties.grade,
      gradeLabel: gradeLabel(expectedLabel.properties.grade),
      color: expectedLabel.properties.color,
      arrival: expectedLabel.properties.arrival,
      expectedHeight: expectedLabel.properties.expectedHeight,
      geometry: expectedLabel.geometry,
      center: boundsCenter(areaBounds),
      bounds: areaBounds,
      observations: buildTourObservations(
        areaFeature.geometry,
        areaBounds,
        observedPoints
      ),
    });
  });
  return sortTourStopsByConfiguredOrder(stops);
}

function buildTourObservations(
  geometry: Geometry,
  bounds: TourStop["bounds"],
  observedPoints: FeatureCollection<Point, ObservationPointProperties>
) {
  return observedPoints.features
    .filter((feature) => {
      const point = feature.geometry.coordinates as LngLat;
      return (
        pointInGeometry(point, geometry) || pointInBounds(point, bounds, 0.08)
      );
    })
    .map((feature) => ({
      name: feature.properties.name,
      observedHeight: feature.properties.observedHeight,
      observedTime: feature.properties.observedTime,
      color: feature.properties.color,
      heightCondition: feature.properties.heightCondition,
      isRising: feature.properties.isRising,
    }));
}

function sortTourStopsByConfiguredOrder(stops: TourStop[]) {
  return [...stops].sort((first, second) => {
    const firstIndex =
      tourAreaOrderIndex.get(first.name) ?? Number.POSITIVE_INFINITY;
    const secondIndex =
      tourAreaOrderIndex.get(second.name) ?? Number.POSITIVE_INFINITY;

    if (firstIndex !== secondIndex) {
      return firstIndex - secondIndex;
    }
    return first.name.localeCompare(second.name, "ja");
  });
}

function distanceSquared(a: LngLat, b: LngLat) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function fitToVisibleData(
  expectedLabels: FeatureCollection<Polygon, ExpectedLabelProperties>,
  observedPoints: FeatureCollection<Point, ObservationPointProperties>
) {
  const coordinates = [
    ...expectedLabels.features.flatMap((feature) =>
      collectCoordinates(feature.geometry as MultiPolygon | Polygon)
    ),
    ...observedPoints.features.map(
      (feature) => feature.geometry.coordinates as LngLat
    ),
  ];

  if (coordinates.length === 0) {
    map.value!.jumpTo({
      center: [138.42138499239283, 38.426610210705135],
      zoom: 4.45,
      pitch: 62,
      bearing: -18,
    });
    return;
  }

  const bounds = coordinates.reduce((result, coordinate) => {
    result.extend(coordinate);
    return result;
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.value!.fitBounds(bounds, {
    padding: 50,
    maxZoom: 6.2,
    duration: 0,
    pitch: 62,
    bearing: -18,
  });
}

function calculateGrades(areas: ITsunamiExpectationAreas[]): IMapLegend {
  return areas.reduce((grades, area) => {
    if (area.grade === "MajorWarning") {
      grades.MajorWarning = true;
    } else if (area.grade === "Warning") {
      grades.Warning = true;
    } else if (area.grade === "Watch") {
      grades.Advisory = true;
    } else if (area.grade === "Forecast") {
      grades.Forecast = true;
    }
    return grades;
  }, emptyGrades());
}

function emptyGrades(): IMapLegend {
  return {
    Advisory: false,
    Warning: false,
    MajorWarning: false,
    Forecast: false,
  };
}

function emptyFeatureCollection(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

defineExpose({
  map,
});
</script>

<style lang="scss">
.tsunami-maplibre-frame {
  position: relative;
  width: 100%;
  height: 100%;
  background: #202632;
  overflow: hidden;
}

.tsunami-maplibre {
  width: 100%;
  height: 100%;
}

.tsunami-tour-panel {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 4;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 9px;
  align-items: stretch;
  width: min(860px, calc(100vw - 44px));
  padding: 12px;
  border: 1px solid
    color-mix(in srgb, var(--tsunami-tour-grade-color, #7dd3fc) 34%, white 10%);
  border-radius: 8px;
  background: linear-gradient(
      135deg,
      color-mix(
        in srgb,
        var(--tsunami-tour-grade-color, #7dd3fc) 18%,
        transparent
      ),
      transparent 36%
    ),
    rgb(12 18 25 / 88%);
  box-shadow: 0 18px 48px rgb(0 0 0 / 34%), inset 0 1px 0 rgb(255 255 255 / 9%);
  color: #f7fafc;
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}

.tsunami-tour-panel__top {
  display: grid;
  grid-template-columns: minmax(300px, 1.15fr) minmax(260px, 0.85fr);
  gap: 10px;
  min-width: 0;
}

.tsunami-tour-panel__summary,
.tsunami-tour-panel__facts,
.tsunami-tour-panel__observations {
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 7px;
  background: rgb(255 255 255 / 6%);
}

.tsunami-tour-panel__summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-color: color-mix(
    in srgb,
    var(--tsunami-tour-grade-color, #7dd3fc) 38%,
    white 8%
  );
  background: linear-gradient(
    90deg,
    color-mix(
      in srgb,
      var(--tsunami-tour-grade-color, #7dd3fc) 22%,
      transparent
    ),
    rgb(255 255 255 / 6%) 54%
  );
}

.tsunami-tour-panel__region {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.tsunami-tour-panel__region strong {
  overflow: hidden;
  font-size: 20px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsunami-tour-panel__grade {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--tsunami-tour-grade-color, #7dd3fc);
  border-radius: 6px;
  background: color-mix(
    in srgb,
    var(--tsunami-tour-grade-color, #7dd3fc) 30%,
    rgb(255 255 255 / 8%)
  );
  box-shadow: inset 0 0 18px
      color-mix(
        in srgb,
        var(--tsunami-tour-grade-color, #7dd3fc) 58%,
        transparent
      ),
    0 0 18px
      color-mix(
        in srgb,
        var(--tsunami-tour-grade-color, #7dd3fc) 36%,
        transparent
      );
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.tsunami-tour-panel__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  padding: 8px;
}

.tsunami-tour-panel__fact,
.tsunami-tour-panel__observations {
  display: grid;
  gap: 5px;
}

.tsunami-tour-panel small {
  overflow: hidden;
  color: #9fb0bd;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.tsunami-tour-panel__fact {
  min-width: 0;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  background: rgb(255 255 255 / 5%);
}

.tsunami-tour-panel__fact strong {
  overflow: hidden;
  color: #f7fafc;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsunami-tour-panel__fact--height {
  border-color: color-mix(
    in srgb,
    var(--tsunami-tour-grade-color, #7dd3fc) 54%,
    white 8%
  );
  background: color-mix(
    in srgb,
    var(--tsunami-tour-grade-color, #7dd3fc) 18%,
    rgb(255 255 255 / 5%)
  );
}

.tsunami-tour-panel__fact--height strong {
  color: var(--tsunami-tour-grade-color, #7dd3fc);
  font-size: 20px;
  font-weight: 900;
  text-shadow: 0 0 16px
    color-mix(
      in srgb,
      var(--tsunami-tour-grade-color, #7dd3fc) 54%,
      transparent
    );
}

.tsunami-tour-panel__observations {
  min-height: 0;
  padding: 9px;
  overflow: auto;
}

.tsunami-tour-panel__station-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tsunami-tour-panel__station-table th,
.tsunami-tour-panel__station-table td {
  overflow: hidden;
  padding: 6px 7px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsunami-tour-panel__station-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(21 29 39 / 94%);
  color: #9fb0bd;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.tsunami-tour-panel__station-table td {
  color: #d8e2ea;
  font-size: 12px;
  line-height: 1;
}

.tsunami-tour-panel__station-table th:first-child,
.tsunami-tour-panel__station-table td:first-child {
  width: 44%;
}

.tsunami-tour-panel__station-table th:nth-child(2),
.tsunami-tour-panel__station-table td:nth-child(2) {
  width: 30%;
}

.tsunami-tour-panel__station-table th:last-child,
.tsunami-tour-panel__station-table td:last-child {
  width: 26%;
  text-align: right;
}

.tsunami-tour-panel__height-wrap {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
}

.tsunami-tour-panel__station-table strong {
  font-size: 13px;
  font-weight: 900;
  text-shadow: 0 0 12px currentColor;
}

.tsunami-tour-panel__rising,
.tsunami-observed-popup__rising {
  display: inline-flex;
  align-items: center;
  min-height: 16px;
  padding: 0 5px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 4px;
  background: rgb(229 167 44 / 18%);
  color: #ffd37a;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.tsunami-tour-panel__empty {
  color: #d8e2ea;
  font-size: 12px;
  line-height: 1;
}

.tsunami-area-name-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

.tsunami-area-height-label {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 88px;
  max-width: min(190px, 36vw);
  padding: 5px 8px 6px;
  border: 1px solid rgb(255 255 255 / 32%);
  border-left: 3px solid var(--tsunami-area-color, #f7fafc);
  border-radius: 6px;
  background: rgb(12 18 25 / 84%);
  box-shadow: 0 10px 28px rgb(0 0 0 / 34%);
  color: #ffffff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.18;
  overflow-wrap: anywhere;
  text-align: center;
  text-shadow: 0 1px 2px rgb(0 0 0 / 80%);
  white-space: normal;
  pointer-events: auto;
  will-change: transform;
}

.tsunami-area-height-label:hover,
.tsunami-area-height-label:focus-visible {
  border-color: rgb(255 255 255 / 58%);
  box-shadow: 0 10px 28px rgb(0 0 0 / 34%),
    0 0 0 2px
      color-mix(in srgb, var(--tsunami-area-color, #f7fafc) 62%, transparent);
  outline: none;
}

.tsunami-area-height-label--selected {
  z-index: 3;
  border-color: var(--tsunami-area-color, #f7fafc);
  background: rgb(18 27 36 / 94%);
  box-shadow: 0 14px 32px rgb(0 0 0 / 42%),
    0 0 0 2px
      color-mix(in srgb, var(--tsunami-area-color, #f7fafc) 76%, transparent),
    0 0 24px
      color-mix(in srgb, var(--tsunami-area-color, #f7fafc) 58%, transparent);
}

.tsunami-area-height-label__name,
.tsunami-area-height-label__height,
.tsunami-area-height-label__arrival {
  display: block;
}

.tsunami-area-height-label__name {
  font-size: 12px;
}

.tsunami-area-height-label__height {
  color: var(--tsunami-area-color, #f7fafc);
  font-size: 13px;
  font-weight: 800;
}

.tsunami-area-height-label__arrival {
  color: #d8e2ea;
  font-size: 11px;
  font-weight: 600;
}

.tsunami-observed-popup {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 132px;
  color: #f7fafc;
  font-size: 12px;
  line-height: 1.18;
}

.tsunami-observed-popup__name {
  font-size: 12px;
}

.tsunami-observed-popup__height {
  color: var(--tsunami-observed-color, #33c4a5);
  font-size: 13px;
  font-weight: 800;
}

.tsunami-observed-popup__time {
  color: #d8e2ea;
  font-size: 11px;
  font-weight: 600;
}

.tsunami-maplibre-frame .maplibregl-popup-content {
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 8px;
  background: rgb(12 18 25 / 90%);
  box-shadow: 0 14px 34px rgb(0 0 0 / 36%);
  padding: 8px 10px;
}

.tsunami-maplibre-frame .maplibregl-popup-tip {
  border-top-color: rgb(12 18 25 / 90%);
}

.maplibregl-ctrl-logo,
.maplibregl-ctrl-attrib {
  display: none !important;
}

@media (max-width: 820px) {
  .tsunami-tour-panel {
    top: 12px;
    width: min(360px, calc(100vw - 24px));
  }

  .tsunami-tour-panel__top {
    grid-template-columns: 1fr;
  }
}
</style>
