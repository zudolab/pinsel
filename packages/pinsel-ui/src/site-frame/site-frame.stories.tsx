import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { SiteFrame } from "./site-frame";

const FRAME = { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–2026 Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" };

const meta: StoryMeta = {
  title: "SiteFrame",
  category: "Chrome",
  description: "Skip link, sticky header with the six navigation items and the green contact button, main outlet, footer.",
  usage: `import { SiteFrame } from "@pinsel/ui";\n\n<SiteFrame brandWord="Pinsel" brandSub="ART STUDY IN GERMANY" … main={[children]} route={{ pathname: "/" }} />`,
};
export default meta;

export const Home: Story = {
  name: "Home (no current item)",
  render: (): Child => <SiteFrame {...FRAME} route={{ pathname: "/" }} main={[<p style={{ padding: "2rem" }}>main outlet</p>]} />,
};

export const Lessons: Story = {
  name: "Lessons (aria-current on オンラインクラス)",
  render: (): Child => <SiteFrame {...FRAME} route={{ pathname: "/lessons/" }} main={[<p style={{ padding: "2rem" }}>main outlet</p>]} />,
};
