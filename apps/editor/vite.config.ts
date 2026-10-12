import { defineConfig } from "vite";
import { contentEditorPlugins } from "zudo-composer/vite";

// The restricted content editor, built with Composer's own plugins (Preact
// JSX, editor chrome Tailwind). It is served by the authoring Worker at
// /editor/ from its private assets, so the build lands in dist/editor and
// emits under /editor/static (never under a path the Worker refuses).
export default defineConfig({
  base: "/editor/",
  publicDir: false,
  build: {
    outDir: "dist/editor",
    assetsDir: "static",
    emptyOutDir: true,
  },
  plugins: contentEditorPlugins(),
});
