import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { features } from "../stories/samples";
import { FeatureCard, FeatureGrid } from "./feature-grid";

const meta: StoryMeta = {
  title: "FeatureGrid",
  category: "Sections",
  description: "The about レッスンの特長 cards.",
  usage: `import { FeatureCard, FeatureGrid } from "@pinsel/ui";\n\n<FeatureGrid items={[<FeatureCard title="完全マンツーマン" description="…" />]} />`,
};
export default meta;

export const About: Story = {
  name: "About レッスンの特長",
  render: (): Child => <Section id="" eyebrow="Our lessons" title="レッスンの特長" content={[<FeatureGrid items={features.map((feature) => <FeatureCard {...feature} />)} />]} />,
};
