import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { courseSteps } from "../stories/samples";
import { CourseStep, CourseSteps } from "./course-steps";

const meta: StoryMeta = {
  title: "CourseSteps",
  category: "Sections",
  description: "The lessons 授業内容 cards, numbered by position.",
  usage: `import { CourseStep, CourseSteps } from "@pinsel/ui";\n\n<CourseSteps items={[<CourseStep title="…" description="…" />]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons #course",
  render: (): Child => <Section id="course" eyebrow="Course" title="オンラインクラス授業内容" content={[<CourseSteps items={courseSteps.map((step, index) => <CourseStep {...step} index={index + 1} />)} />]} />,
};
