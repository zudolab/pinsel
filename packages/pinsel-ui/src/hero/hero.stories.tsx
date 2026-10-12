import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { HeroMeta } from "../hero-meta/hero-meta";
import { Hero } from "./hero";

const meta: StoryMeta = {
  title: "Hero",
  category: "Sections",
  description: "The home hero: opaque reading zone above the full hero art; the meta band follows.",
  usage: `import { Hero, HeroMeta } from "@pinsel/ui";\n\n<Hero label="…" titleLines={["あなただけの", "ドイツ美大受験準備を", "個別指導で。"]} lead="…" … />`,
};
export default meta;

const HERO = {
  label: "ドイツ美大受験部 オンラインクラス",
  titleLines: ["あなただけの", "ドイツ美大受験準備を", "個別指導で。"],
  lead: "東京藝術大学、ミュンヘン芸術アカデミー修了の講師があなたの受験をサポートします。普段の作品制作、マッペ（ポートフォリオ）制作はもちろん進路相談、応募する大学のスケジュールや詳細ドイツ語学習の進め方まで、すべてオンラインで！",
  primaryLabel: "オンラインクラス",
  primaryHref: "/lessons/",
  pricingLabel: "コースと料金",
  pricingHref: "#pricing",
};

export const Home: Story = {
  name: "Home hero + meta band",
  render: (): Child => [<Hero {...HERO} />, <HeroMeta line="完全マンツーマン・オンライン" intro="初心者の方も美大卒の方も、どなたでも１対１のオンライン個人レッスンでドイツ美大留学を目指して頂けます。" />],
};
