import { createRouter, createWebHistory } from "vue-router";
import { nextTick } from "vue";

const DEFAULT_TITLE = "";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/map",
      component: () => import("@/views/quake-map-view.vue"),
      meta: { title: "QuakeMap - Map" },
    },
    {
      path: "/shake_level",
      component: () => import("@/views/shake-level-view.vue"),
      meta: { title: "QuakeMap - Shake Level" },
    },
    {
      path: "/shake_indicator",
      component: () => import("@/views/shake-indicator-view.vue"),
      meta: { title: "QuakeMap - Shake Indicator" },
    },
    {
      path: "/tsunami_banner",
      component: () => import("@/views/tsunami/tsunami-banner-view.vue"),
      meta: { title: "QuakeMap - Tsunami Banner" },
    },
    {
      path: "/tsunami_info",
      component: () => import("@/views/tsunami/tsunami-expectation-view.vue"),
      meta: { title: "QuakeMap - Tsunami Info" },
    },
    {
      path: "/tsunami_forecast",
      redirect: () => {
        return {
          path: "/tsunami_info",
          query: {
            type: "forecast",
          },
        };
      },
    },
    {
      path: "/tsunami_map",
      component: () => import("@/views/tsunami/tsunami-map-view.vue"),
      meta: { title: "QuakeMap - Tsunami Map" },
    },
    {
      path: "/tsunami_forecast_map",
      redirect: () => {
        return {
          path: "/tsunami_map",
          query: {
            type: "forecast",
          },
        };
      },
    },
    {
      path: "/tsunami_watch",
      component: () => import("@/views/tsunami/tsunami-observation.vue"),
      meta: { title: "QuakeMap - Tsunami Observation" },
    },
  ],
});

router.afterEach((to) => {
  nextTick(() => {
    document.title = <string>to.meta.title || DEFAULT_TITLE;
  });
});

export default router;
