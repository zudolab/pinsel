import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { contentEditorPlugins } from "zudo-composer/vite";

// The restricted content editor, built with Composer's own plugins (Preact
// JSX, editor chrome Tailwind). It is served by the authoring Worker at
// /editor/ from its private assets, so the build lands in dist/editor and
// emits under /editor/static (never under a path the Worker refuses).

// `vite` (dev only): answers /api/v1 + /preview from dev/mock-api.ts, loaded
// through Vite's SSR loader so the workspace TypeScript resolves.
function mockApi(): Plugin {
  const entry = path.resolve(import.meta.dirname, "dev/mock-api.ts");
  return {
    name: "pinsel-editor-mock-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void server
          .ssrLoadModule(entry)
          .then((mock) => (mock as typeof import("./dev/mock-api")).handleMockRequest(req, res))
          .then((handled) => (handled ? undefined : next()))
          .catch(next);
      });
    },
  };
}

export default defineConfig({
  base: "/editor/",
  publicDir: false,
  build: {
    outDir: "dist/editor",
    assetsDir: "static",
    emptyOutDir: true,
  },
  plugins: [...contentEditorPlugins(), mockApi()],
});
