import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { PricingCard, PricingCards, type PricingCardProps } from "./pricing-cards";

// The same props the Gate-1 content record projects into the home page.
export const SAMPLE_COURSES: readonly Omit<PricingCardProps, "taxLabel" | "popularBadge" | "linkLabel">[] = [
  { name: "進路相談", price: "¥10,000", unit: "1回", description: "有料面談 / 1.5〜2時間", featured: false, courseIndex: 1 },
  { name: "2ヶ月コース", price: "¥50,000", unit: "全4回（月2回）", description: "ポートフォリオ制作指導", featured: true, courseIndex: 2 },
  { name: "4ヶ月コース", price: "¥92,000", unit: "全8回（月2回）", description: "出願準備までフルサポート", featured: false, courseIndex: 3 },
];

const LABELS = { taxLabel: "税込", popularBadge: "POPULAR", linkLabel: "このコースについて相談する" };

const meta: StoryMeta = {
  title: "PricingCards",
  category: "Sections",
  description: "The home コースと料金 grid: three course cards, a note and the lessons link.",
  usage: `import { PricingCard, PricingCards } from "@pinsel/ui";\n\n<PricingCards note="…" moreLabel="クラスの詳細はこちら" moreHref="/lessons/" items={[<PricingCard … />]} />`,
};
export default meta;

const cards = (): Child => SAMPLE_COURSES.map((course) => <PricingCard {...course} {...LABELS} />);

export const Home: Story = {
  name: "Home section (#pricing)",
  render: (): Child => (
    <Section id="pricing" eyebrow="COURSE & PRICING" title="コースと料金" content={[<PricingCards note="※ お問い合わせ後にコースをお選びいただけます" moreLabel="クラスの詳細はこちら" moreHref="/lessons/" items={[cards()]} />]} />
  ),
};

export const Featured: Story<PricingCardProps> = {
  name: "Featured card",
  render: (): Child => <div class="pricing-grid"><PricingCard {...SAMPLE_COURSES[1]!} {...LABELS} /></div>,
};
