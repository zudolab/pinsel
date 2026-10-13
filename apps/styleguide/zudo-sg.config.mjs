// zudo-sg CLI + compose config for the Pinsel developer catalog.
//
// Stories live next to their components inside `@pinsel/ui`; `ui/` holds
// generated two-line re-exports of them (scripts/gen-story-shims.mjs) because
// zfb refuses a collection root outside the app and the engine derives its
// componentDocs collection from `componentsRoots.dir`. Each shim imports the
// story through the package specifier, which resolves inside node_modules.

/** @param {string} cssVar @returns {import("@takazudo/zudo-sg/config").HostTokenSpec} */
const textToken = (cssVar) => ({ cssVar, control: "text" });

/** @type {import("@takazudo/zudo-sg/config").HostTokensSpec} */
const tokensSpec = {
  palette: [
    { id: "paper-ink", label: "Paper & ink", tokens: ["paper", "white", "ink", "muted", "line", "teal", "pale", "error"].map((name) => ({ cssVar: `--palette-${name}` })) },
  ],
  color: [
    { id: "roles", label: "Color roles", tokens: ["bg", "surface", "fg", "muted", "line", "action", "soft", "error"].map((name) => ({ cssVar: `--color-${name}` })) },
  ],
  spacing: [
    { id: "scale", label: "Spacing scale", preview: "bar", tokens: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => ({ cssVar: `--space-${step}`, unit: "rem", step: 0.25 })) },
    { id: "layout", label: "Layout", tokens: ["--space-section", "--gutter", "--page-width", "--reading-width", "--header-height"].map(textToken) },
  ],
  font: [
    { id: "families", label: "Families", preview: "family", tokens: ["--font-body", "--font-display", "--font-latin"].map(textToken) },
    { id: "sizes", label: "Fixed sizes", preview: "size", tokens: ["--size-caption", "--size-small", "--size-body", "--size-lead"].map((cssVar) => ({ cssVar, unit: "rem", step: 0.0625 })) },
    { id: "fluid-sizes", label: "Fluid sizes", tokens: ["--size-subheading", "--size-heading", "--size-title"].map(textToken) },
  ],
  size: [
    { id: "shape", label: "Shape", preview: "radius", tokens: [{ cssVar: "--radius", unit: "rem", step: 0.125 }] },
    { id: "layers", label: "Z-index", tokens: [{ cssVar: "--z-header", valueKind: "number", step: 1 }, { cssVar: "--z-overlay", valueKind: "number", step: 1 }] },
  ],
};

/** @satisfies {import("@takazudo/zudo-sg/config").ZudoSgComposeOptions} */
export default {
  componentsRoots: [{ dir: "ui", importBase: "../../ui" }],
  registryOut: "./src/styleguide/sg-registry.ts",
  categoryOrder: ["Pages", "Chrome", "Layout", "Typography", "Sections", "Forms", "Art"],
  uiPackageName: "@pinsel/ui",
  barrelIndex: null,
  previewStyles: "./src/styles/preview-entry.css",
  tokens: {
    // Exactly two files of literal custom properties: the approved Pinsel tokens and colors.
    cssFiles: ["../../packages/pinsel-ui/styles/tokens.css", "../../packages/pinsel-ui/styles/colors.css"],
    manifestOut: "./src/styleguide/token-manifest.ts",
    // The approved vocabulary (prototype styles.css @layer tokens), grouped for the preview token panel.
    spec: tokensSpec,
  },
  zdtpApplyProxy: {
    tabsModule: "./src/config/preview-token-panel-tabs.ts",
  },
};
