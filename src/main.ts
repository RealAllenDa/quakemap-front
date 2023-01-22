import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

import "@/assets/generic.scss";
import hnapi from "@/assets/hnapi";

const app = createApp(App);

app.use(createPinia());
app.use(router);

hnapi.initializeSentry(app, router);

app.mount("#app");
