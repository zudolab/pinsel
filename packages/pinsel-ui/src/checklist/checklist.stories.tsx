import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { homeTargets } from "../stories/samples";
import { Checklist, ChecklistItem } from "./checklist";

const meta: StoryMeta = {
  title: "Checklist",
  category: "Sections",
  description: "こんな方へ: checked items.",
  usage: `import { Checklist, ChecklistItem } from "@pinsel/ui";\n\n<Checklist items={[<ChecklistItem text="…" />]} />`,
};
export default meta;

export const Home: Story = {
  name: "Home #for-you",
  render: (): Child => <Section id="for-you" eyebrow="For You" title="こんな方へ" content={[<Checklist items={homeTargets.map((text) => <ChecklistItem text={text} />)} />]} />,
};
