import { defineConfig } from "@takazudo/zfb/config";
import { siteConfig } from "./lib/site-config";

// Static documents only: no adapter, no islands, no client router. HTML stays
// unminified so the emitted pages diff readably against the approved prototype.
// No `bundle.loaders`: the art SVGs are inlined from pinsel-ui's committed
// art-sources.ts, so nothing imports `?raw`.
export default defineConfig({
  output: "static",
  wind: false,
  emitRoutesManifest: false,
  minifyHtml: false,
  publicDir: "public",
  site: siteConfig.origin,
});
