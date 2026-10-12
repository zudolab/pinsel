declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    /** Node-side `renderToString(renderRouteDocument(...))` of the home route, computed in vitest.config.ts. */
    NODE_HOME_HTML: string;
    /** `apps/site/dist/index.html` when the ZFB build exists, else "". */
    ZFB_HOME_HTML: string;
  }
}
