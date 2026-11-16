import { defineComposerConfig } from "zudo-composer/config";
import { pinselAssistantConfig } from "./src/site/assistant-config";

const stage = process.env.PINSEL_AUTHORING_STAGE;
if (stage && stage !== "course-identity-v1" && stage !== "notes-v1") throw new Error("Unsupported PINSEL_AUTHORING_STAGE");
const suffix = stage ? `-${stage}` : "";

export default defineComposerConfig({
  pack: "@pinsel/ui/composer-pack",
  dataDir: `.native-authoring${suffix}`,
  publicAssetsDir: `.native-public${suffix}/uploaded-assets`,
  styles: "styles/authoring.css",
  authoringAuthority: "workspace",
  assistant: pinselAssistantConfig(process.env),
  nativeEditing: { source: "workspace", paragraph: { componentId: "pinsel.paragraph", textProp: "text" } },
  hostDocument: {
    module: "@pinsel/ui/host-document", jsxImportSource: "@takazudo/zfb/zudo-react", rendererId: "pinsel-zfb", rendererVersion: "native-v3", publicDir: `.native-public${suffix}`,
    componentPresentation: {
      "pinsel.group": { transparent: true },
      "pinsel.section": { labelProp: "title" },
      "pinsel.plain-section": { labelProp: "ariaLabel" },
      "pinsel.section-after": { transparent: true },
      "pinsel.page-heading": { labelProp: "title" },
      "pinsel.article-heading": { labelProp: "title" },
      "pinsel.note-card": { labelProp: "title" },
      "pinsel.note-link": { labelProp: "title" },
      "pinsel.faq-category": { labelProp: "title" },
      "pinsel.faq-item": { labelProp: "question" },
      "pinsel.pricing-card": { labelProp: "name" },
      "pinsel.price-detail-card": { labelProp: "name" },
      "pinsel.consultation-price": { labelProp: "name" },
      "pinsel.year-section": { labelProp: "label" },
      "pinsel.voice-detail": { labelProp: "author" },
    },
  },
});
