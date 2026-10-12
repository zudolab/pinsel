import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Paragraphs } from "../paragraphs/paragraphs";
import { Section } from "./section";

const meta: StoryMeta = {
  title: "Section",
  category: "Layout",
  description: "Reading-zone section: eyebrow + h2, optional intro; without a title it renders only its content.",
  usage: `import { Section } from "@pinsel/ui";\n\n<Section id="course" eyebrow="Course" title="オンラインクラス授業内容" content={[…]} />`,
};
export default meta;

const body = [<Paragraphs paragraphs={["２ヶ月コースまたは４ヶ月コースからお選びいただけます。"]} />];

export const Heading: Story = { name: "With eyebrow and h2", render: (): Child => <Section id="course" eyebrow="Course" title="オンラインクラス授業内容" content={body} /> };
export const Intro: Story = { name: "With intro", render: (): Child => <Section id="x" eyebrow="Pricing" title="オンラインクラス価格" intro="すべて税込価格です。" content={body} /> };
export const Untitled: Story = { name: "Without heading (aria-label)", render: (): Child => <Section id="" eyebrow="" title="" label="高津戸優子のプロフィール" content={body} /> };
