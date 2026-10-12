declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    /** Node-side `renderToString(renderRouteDocument(...))` of the home route, computed in vitest.config.ts. */
    NODE_HOME_HTML: string;
    /** `apps/site/dist/index.html` when the ZFB build exists, else "". */
    ZFB_HOME_HTML: string;
  }
}

/** Vite's `import.meta.glob` (eager raw imports of fixtures and committed entries). */
interface ImportMeta {
  glob(pattern: string, options: { query: "?raw"; import: "default"; eager: true }): Record<string, unknown>;
}
