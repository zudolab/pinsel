import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { faqGroups } from "../stories/samples";
import { Toc, TocItem } from "./toc";

const meta: StoryMeta = {
  title: "Toc",
  category: "Layout",
  description: "Numbered in-page navigation: the wide lessons band and the aside rail; the visitor script sets aria-current=location.",
  usage: `import { Toc, TocItem } from "@pinsel/ui";\n\n<Toc label="このページの内容" wide items={[<TocItem label="授業内容" target="course" prefix="" />]} />`,
};
export default meta;

const LESSONS = [["for-you", "受講をお勧めする方"], ["course", "授業内容"], ["pricing", "クラス価格"], ["consultation", "有料進路相談"], ["instructor", "講師紹介"], ["specializations", "専攻分野"], ["graduates", "美大卒の方へ"], ["knowledge", "受験について知る"]] as const;

export const Wide: Story = {
  name: "Wide (lessons)",
  render: (): Child => <Toc label="このページの内容" wide items={LESSONS.map(([target, label], index) => <TocItem label={label} target={target} prefix="" index={index + 1} />)} />,
};

export const Active: Story = {
  name: "Aside rail with the active item",
  render: (): Child => (
    <div class="container" style={{ "max-inline-size": "16rem", "padding-block": "2rem" }}>
      <Toc label="質問のカテゴリー" wide={false} items={faqGroups.map((group, index) => <TocItem label={group.title} target="" prefix="faq-" index={index + 1} current={index === 1} />)} />
    </div>
  ),
};
