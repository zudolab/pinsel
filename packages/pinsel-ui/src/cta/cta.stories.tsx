import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ctaSubCopy } from "../stories/samples";
import { Cta } from "./cta";

const meta: StoryMeta = {
  title: "Cta",
  category: "Sections",
  description: "The closing CONTACT section: heading, the page's sub copy (opening sentence not repeated), the contact button, closing art.",
  usage: `import { Cta } from "@pinsel/ui";\n\n<Cta heading="まずはお気軽にご相談ください。" subCopy="…" buttonLabel="お問い合わせ" large />`,
};
export default meta;

export const Large: Story = { name: "Large (home, lessons, about)", render: (): Child => <Cta heading="まずはお気軽にご相談ください。" subCopy={ctaSubCopy} buttonLabel="お問い合わせ" large /> };
export const Small: Story = { name: "Small (results, voices, faq)", render: (): Child => <Cta heading="まずはお気軽にご相談ください。" subCopy={ctaSubCopy} buttonLabel="お問い合わせ" large={false} /> };
