import axios from "axios";
import type { IFetchGeoJsonConfig } from "@/interfaces/parsing/GeoJson";
import { useGeoJsonStore } from "@/stores/geojson";
import type { App } from "vue";
import * as Sentry from "@sentry/vue";
import type { Router } from "vue-router";
import { BrowserTracing } from "@sentry/tracing";

class _ReqFailedErr extends Error {
  constructor(error: Error) {
    super(error.message);
    Object.setPrototypeOf(this, _ReqFailedErr.prototype);
  }
}

class HNAPI {
  private readonly mode = import.meta.env.MODE;
  private readonly color = this.mode === "production" ? "#43bb88" : "orange";
  private readonly useProductionAPI: boolean;
  private readonly apiUrl: [string, string];
  private readonly logo = atob(
    "JWMgICBfX18gICAgICAgICAgICAgIF8gICAgICAgIF9fICBfXyAgICAgICAgICAgICAKICAvIF8gXCBfICAgXyAgX18gX3wgfCBfX19fX3wgIFwvICB8IF9fIF8gXyBfXyAgCiB8IHwgfCB8IHwgfCB8LyBfYCB8IHwvIC8gXyBcIHxcL3wgfC8gX2AgfCAnXyBcIAogfCB8X3wgfCB8X3wgfCAoX3wgfCAgIDwgIF9fLyB8ICB8IHwgKF98IHwgfF8pIHwKICBcX19cX1xcX18sX3xcX18sX3xffFxfXF9fX3xffCAgfF98XF9fLF98IC5fXy8gCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfF98ICAgIA=="
  );
  private readonly version = import.meta.env.VITE_RELEASE;

  constructor(useProductionAPI = false) {
    this.useProductionAPI = useProductionAPI;
    if (this.mode === "development") {
      if (!useProductionAPI) {
        this.apiUrl = ["http://", "127.0.0.1:8001"];
      } else {
        this.apiUrl = ["https://", "back.quake.daziannetwork.com"];
      }
    } else {
      this.apiUrl = ["https://", "back.quake.daziannetwork.com"];
    }
  }

  async fetchGeoJson(fetchGeoJsonConfig: IFetchGeoJsonConfig): Promise<void> {
    const store = useGeoJsonStore();
    if (fetchGeoJsonConfig.japan && store.geojson.japan === undefined) {
      await this.makeApiRequest("/static/geojson/japan.json")
        .then((res) => {
          store.setJapanGeoJson(res);
        })
        .catch((error) => {
          throw new Error("Failed to load japan geojson: " + error);
        });
    }
    if (fetchGeoJsonConfig.countries && store.geojson.countries === undefined) {
      await this.makeApiRequest("/static/geojson/countries_without_japan.json")
        .then((res) => {
          store.setCountriesGeoJson(res);
        })
        .catch((error) => {
          throw new Error("Failed to load countries geojson: " + error);
        });
    }
    if (
      fetchGeoJsonConfig.japanWithSubAreas &&
      store.geojson.japanWithSubAreas === undefined
    ) {
      await this.makeApiRequest("/static/geojson/japan_with_sub_areas.json")
        .then((res) => {
          store.setJapanSubAreasGeoJson(res);
        })
        .catch((error) => {
          throw new Error("Failed to load japanSubAreas geojson: " + error);
        });
    }
  }

  initializeSentry(app: App, router: Router) {
    Sentry.init({
      app,
      dsn: "https://32e5d1dfc4504687ae75b16fa1e7b1f2@sentry.mightyhub.net/4",
      integrations: [
        new BrowserTracing({
          routingInstrumentation: Sentry.vueRouterInstrumentation(router),
          tracePropagationTargets: [this.apiUrl[1]],
        }),
      ],
      tracesSampleRate: this.mode === "production" ? 1.0 : 1.0,
      sampleRate: this.mode === "production" ? 1.0 : 1.0,
      environment: this.mode,
      release: `quakemap-front@${this.version}`,
      logErrors: true,
    });

    hnapi.info("Sentry initialized.");
  }

  async initialize(fetchGeoJsonConfig: IFetchGeoJsonConfig): Promise<void> {
    await this.fetchGeoJson(fetchGeoJsonConfig);
    // eslint-disable-next-line no-console
    console.log(
      `${this.logo}\n\n\n` + `Version ${this.version}-${this.mode}.`,
      `color: ${this.color}; font-size: 20px; font-weight: bold;`
    );
    if (this.mode === "development") {
      if (this.useProductionAPI) {
        this.warn(
          "Using production API server: " + "It can cause unexpected behaviors."
        );
      }
    }
  }

  // eslint-disable-next-line require-await
  async makeApiRequest(url: string, timeout = 0): Promise<never> {
    return new Promise((resolve, reject) => {
      axios
        .get(`${this.apiUrl.join("")}${url}`, {
          timeout,
        })
        .then((response: any) => {
          resolve(response.data);
        })
        .catch((error: Error) => {
          reject(new _ReqFailedErr(error));
        });
    });
  }

  debug(...text: any[]) {
    // eslint-disable-next-line no-console
    console.log("%c[DEBUG]", "color: lightgreen; font-weight: bold;", ...text);
  }

  info(...text: any[]) {
    // eslint-disable-next-line no-console
    console.log("%c[INFO]", "color: lightblue; font-weight: bold;", ...text);
  }

  warn(...text: any[]) {
    // eslint-disable-next-line no-console
    console.warn("%c[WARN]", "color: yellow; font-weight: bold;", ...text);
  }

  error(...text: any[]) {
    // eslint-disable-next-line no-console
    console.error("%c[ERROR]", "color: red; font-weight: bold;", ...text);
  }
}

const hnapi = new HNAPI(false);
export default hnapi;
