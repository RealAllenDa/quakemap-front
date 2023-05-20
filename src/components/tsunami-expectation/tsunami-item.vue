<template>
  <div v-if="props.grade === 'MajorWarning'" class="major-tsunami-warn">
    MAJOR
  </div>
  <div v-else-if="props.grade === 'Warning'" class="tsunami-warn">WRN</div>
  <div v-else-if="props.grade === 'Watch'" class="tsunami-advisory">ADV</div>
  <div v-else-if="props.grade === 'Forecast'" class="tsunami-forecast">FC</div>
  <div v-else class="tsunami-unknown">???</div>
  <div>{{ props.name }}</div>
  <div v-if="props.fetchType === 'information'" class="tsunami-time">
    {{ props.time.time }}
  </div>
  <div v-if="props.height === 'Unknown'"></div>
  <div
    v-else-if="props.height !== 'Unknown' && props.grade === 'MajorWarning'"
    class="tsunami-height major-tsunami-warn"
    v-html="props.height"
  ></div>
  <div
    v-else-if="props.height !== 'Unknown' && props.grade === 'Warning'"
    class="tsunami-height tsunami-warn"
    v-html="props.height"
  ></div>
  <div
    v-else-if="props.height !== 'Unknown' && props.grade === 'Forecast'"
    class="tsunami-forecast"
  >
    Below 0.2m
  </div>
  <div v-else class="tsunami-height" v-html="props.height"></div>
</template>

<script lang="ts" setup>
import type {
  ITsunamiSpecialTime,
  ITsunamiTime,
} from "@/interfaces/api/TsunamiInfo";

const props = defineProps<{
  fetchType: string;
  grade: string;
  name: string;
  time: ITsunamiTime | ITsunamiSpecialTime;
  height: string;
}>();
</script>
