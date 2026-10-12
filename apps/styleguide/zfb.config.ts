// The zudo-sg host (zudo-doc site + engine routes). Host chrome tokens follow
// the engine starter (src/styles/ui-tokens.css); the component previews load
// the approved Pinsel CSS through src/styles/preview-entry.css.
import { defineConfig, type WindConfig } from "@takazudo/zfb/config";
import { zudoDoc } from "@takazudo/zudo-doc/config";
import { withZudoSg } from "@takazudo/zudo-sg/config";
import zudoSgConfig from "./zudo-sg.config.mjs";

export default defineConfig({
  ...withZudoSg(
    {
      ...zudoDoc({
        siteName: "Pinsel styleguide",
        base: "/",
        port: 4397,
        favicon: "auto",
        mermaid: false,
        strictContentBridge: true,
        dynamicPageTransition: true,
        // The engine's preview token panel needs the bundled zdtp loader (zudolab/zudo-doc#4261).
        bundleZdtp: true,
        chromeBindingsModule: "./pages/lib/_chrome-bindings.tsx",
      }),
      emitRoutesManifest: false,
      wind: {
        reset: "owned-v1",
        tokens: {
          colors: {
            bg: "var(--color-bg)",
            fg: "var(--color-fg)",
            surface: "var(--color-surface)",
            "surface-2": "var(--color-surface-2)",
            border: "var(--color-border)",
            muted: "var(--color-muted)",
            accent: "var(--color-accent)",
            "accent-hover": "var(--color-accent-hover)",
            "on-accent": "var(--color-on-accent)",
            focus: "var(--color-focus)",
          },
          spacing: {
            "hsp-sm": "var(--spacing-hsp-sm)",
            "hsp-md": "var(--spacing-hsp-md)",
            "hsp-lg": "var(--spacing-hsp-lg)",
            "vsp-sm": "var(--spacing-vsp-sm)",
            "vsp-md": "var(--spacing-vsp-md)",
            "vsp-lg": "var(--spacing-vsp-lg)",
            "vsp-2xl": "var(--spacing-vsp-2xl)",
          },
          fontSizes: {
            base: { size: "var(--text-base)", lineHeight: "var(--text-base--line-height)" },
            "2xl": { size: "var(--text-2xl)", lineHeight: "var(--text-2xl--line-height)" },
          },
          fontFamilies: { sans: "var(--font-sans)", mono: "var(--font-mono)" },
          fontWeights: { normal: "var(--font-weight-normal)", semibold: "var(--font-weight-semibold)", bold: "var(--font-weight-bold)" },
          lineHeights: { tight: "var(--leading-tight)", normal: "var(--leading-normal)" },
        },
        breakpoints: { sm: { minWidthPx: 640 }, md: { minWidthPx: 768 }, lg: { minWidthPx: 1024 } },
        strict: true,
        dark: false,
        utilities: { placement: "before-authored" },
        sources: { roots: ["pages", "src"] },
      } satisfies WindConfig,
    },
    zudoSgConfig,
  ),
});
