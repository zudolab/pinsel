import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ButtonLink, TextLink } from "./text-link";

const meta: StoryMeta = {
  title: "TextLink",
  category: "Typography",
  description: "Text links and buttons: arrow per destination, mail icon on contact, Instagram icon for instagram.com.",
  usage: `import { ButtonLink, TextLink } from "@pinsel/ui";\n\n<TextLink href="/results/" label="もっと見る" />\n<ButtonLink href="/contact/" label="お問い合わせ" primary />`,
};
export default meta;

const row = (children: Child): Child => <div style={{ display: "flex", gap: "2rem", "flex-wrap": "wrap", "align-items": "center", padding: "2rem" }}>{children}</div>;

export const TextLinks: Story = {
  name: "Text links (internal, external, Instagram)",
  render: (): Child => row([<TextLink href="/results/" label="もっと見る" />, <TextLink href="https://www.udk-berlin.de/" label="ベルリン芸術大学" />, <TextLink href="https://www.instagram.com/yuko_takatsudo" label="Instagram" />]),
};

export const Buttons: Story = {
  name: "Buttons (primary, contact, plain)",
  render: (): Child => row([<ButtonLink href="/lessons/" label="オンラインクラス" primary />, <ButtonLink href="/contact/" label="お問い合わせ" primary />, <ButtonLink href="/" label="トップページに戻る" />]),
};
