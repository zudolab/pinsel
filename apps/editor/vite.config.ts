import path from "node:path";
import { defineConfig } from "vite";
// Composer is a prebuilt public editor: no source Tailwind/Vite plugin needed.
export default defineConfig({ base: "/editor/", publicDir: false,
 build: { outDir: "dist/editor", assetsDir: "static", emptyOutDir: true, rollupOptions: {
  input: { main: path.resolve(import.meta.dirname, "index.html"), preview: path.resolve(import.meta.dirname, "src/preview.ts") },
  output: { entryFileNames: "static/[name].js" },
 } },
});
