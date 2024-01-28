import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const getPluginOptions = (mode: string, env: Record<string, string>) => {
  const pluginOptions = [vue()];
  if (mode !== "development") {
    pluginOptions.push(
      sentryVitePlugin({
        org: "homenetwork",
        project: "quakemap-front",
        include: "./dist",
        url: "https://sentry.mightyhub.net/",
        authToken: env.SENTRY_AUTH_TOKEN,
        release: `quakemap-front@${process.env.npm_package_version}`,
      })
    );
  }
  return pluginOptions;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    build: {
      sourcemap: true,
    },
    plugins: getPluginOptions(mode, env),
    define: {
      VITE_RELEASE: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
