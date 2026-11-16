import { defineComposerConfig } from "zudo-composer/config";

export default defineComposerConfig({
  pack: "@pinsel/ui/composer-pack",
  dataDir: ".native-authoring",
  publicAssetsDir: ".native-public/uploaded-assets",
  styles: "styles/authoring.css",
  authoringAuthority: "workspace",
  nativeEditing: { source: "workspace", paragraph: { componentId: "pinsel.paragraph", textProp: "text" } },
  hostDocument: { module: "@pinsel/ui/host-document", jsxImportSource: "@takazudo/zfb/zudo-react", rendererId: "pinsel-zfb", rendererVersion: "native-v1", publicDir: ".native-public" },
});
