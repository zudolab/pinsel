import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { lessonsCareer } from "../stories/samples";
import { Timeline, TimelineEntry } from "../timeline/timeline";
import { TwoColumn } from "./two-column";

const meta: StoryMeta = {
  title: "TwoColumn",
  category: "Layout",
  description: "Two equal columns, stacked on mobile (about 経歴 / 学歴).",
  usage: `import { TwoColumn } from "@pinsel/ui";\n\n<TwoColumn columns={[…, …]} />`,
};
export default meta;

const entries = lessonsCareer.slice(0, 3).map((entry) => <TimelineEntry {...entry} />);

export const Cv: Story = {
  name: "About CV columns",
  render: (): Child => (
    <section class="section container reading-zone">
      <TwoColumn columns={[<Timeline variant="cv" title="経歴" items={entries} />, <Timeline variant="cv" title="学歴" items={entries} />]} />
    </section>
  ),
};
