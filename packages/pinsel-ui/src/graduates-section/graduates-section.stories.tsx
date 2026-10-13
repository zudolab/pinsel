import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { graduatesParagraphs } from "../stories/samples";
import { GraduatesSection } from "./graduates-section";

const meta: StoryMeta = {
  title: "GraduatesSection",
  category: "Sections",
  description: "section#graduates: the passage beside the decorative R7-10 illustration (1.6fr/1fr ≤70rem, stacked ≤47.99rem).",
  usage: `import { GraduatesSection } from "@pinsel/ui";\n\n<GraduatesSection eyebrow="For Graduates" title="美大卒の方へ" paragraphs={[…]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons #graduates",
  render: (): Child => <GraduatesSection eyebrow="For Graduates" title="美大卒の方へ" paragraphs={graduatesParagraphs} />,
};
