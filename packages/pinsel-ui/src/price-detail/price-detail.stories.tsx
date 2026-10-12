import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { PriceDetail, PriceDetailCard } from "./price-detail";

const meta: StoryMeta = {
  title: "PriceDetail",
  category: "Sections",
  description: "The lessons クラス価格 cards.",
  usage: `import { PriceDetail, PriceDetailCard } from "@pinsel/ui";\n\n<PriceDetail items={[<PriceDetailCard name="2ヶ月コース" price="¥50,000" note="税込 / 1ヶ月あたり25,000円" />]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons #pricing",
  render: (): Child => (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="オンラインクラス価格"
      content={[<PriceDetail items={[<PriceDetailCard name="2ヶ月コース" price="¥50,000" note="税込 / 1ヶ月あたり25,000円" />, <PriceDetailCard name="4ヶ月コース" price="¥92,000" note="税込 / 1ヶ月あたり23,000円" />]} />]}
    />
  ),
};
