import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { faqGroups, homeFaq } from "../stories/samples";
import { Faq, FaqCategory, FaqItem } from "./faq";

const meta: StoryMeta = {
  title: "Faq",
  category: "Sections",
  description: "details/summary questions; the first /faq/ category opens its first question.",
  usage: `import { Faq, FaqItem } from "@pinsel/ui";\n\n<Faq items={[<FaqItem question="…" answer="…" prefix="home-q" openFirst={false} />]} />`,
};
export default meta;

export const Home: Story = {
  name: "Home (all closed)",
  render: (): Child => (
    <Section id="faq" eyebrow="FAQ" title="よくある質問" content={[<Faq items={homeFaq.map((item, index) => <FaqItem {...item} prefix="home-q" openFirst={false} index={index + 1} />)} />]} />
  ),
};

export const OpenFirst: Story = {
  name: "FAQ category (first open)",
  render: (): Child => {
    const group = faqGroups[0]!;
    return (
      <div class="container">
        <FaqCategory title={group.title} index={1} content={[<Faq items={group.items.map((item, index) => <FaqItem {...item} prefix="category-1" openFirst index={index + 1} />)} />]} />
      </div>
    );
  },
};
