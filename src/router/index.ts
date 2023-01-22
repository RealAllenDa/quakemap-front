import { createRouter, createWebHistory } from "vue-router";
import { nextTick } from "vue";

const DEFAULT_TITLE = "";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/map",
      name: "map",
      component: () => import("@/views/QuakeMapView.vue"),
      meta: { title: "QuakeMap" },
    },
  ],
});

router.afterEach((to) => {
  nextTick(() => {
    document.title = <string>to.meta.title || DEFAULT_TITLE;
  });
});

export default router;
