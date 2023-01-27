import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      vue(),
      sentryVitePlugin({
        org: "homenetwork",
        project: "quakemap-front",
        include: "./dist",
        url: "https://sentry.mightyhub.net/",
        authToken: env.SENTRY_AUTH_TOKEN,
        release: `quakemap-front@${env.VITE_RELEASE}`,
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
