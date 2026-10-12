import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { specializations } from "../stories/samples";
import { Specialization, SpecializationGrid } from "./specialization-grid";

const meta: StoryMeta = {
  title: "SpecializationGrid",
  category: "Sections",
  description: "The lessons 専攻分野 grid: German name (lang=de) above the Japanese one.",
  usage: `import { Specialization, SpecializationGrid } from "@pinsel/ui";\n\n<SpecializationGrid items={[<Specialization de="Bildhauerei" ja="彫刻とインスタレーション" />]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons #specializations",
  render: (): Child => <Section id="specializations" eyebrow="Specializations" title="ドイツ美術大学 専攻一例" content={[<SpecializationGrid items={specializations.map((item) => <Specialization {...item} />)} />]} />,
};
