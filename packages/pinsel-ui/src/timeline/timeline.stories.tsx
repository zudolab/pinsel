import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { lessonsCareer } from "../stories/samples";
import { Timeline, TimelineEntry } from "./timeline";

const meta: StoryMeta = {
  title: "Timeline",
  category: "Sections",
  description: "Year + text rows: plain, as an about CV column, or as the lessons career block.",
  usage: `import { Timeline, TimelineEntry } from "@pinsel/ui";\n\n<Timeline variant="career" title="経歴" items={[<TimelineEntry year="1987" text="埼玉県生まれ" />]} />`,
};
export default meta;

const entries = (): Child[] => lessonsCareer.map((entry) => <TimelineEntry {...entry} />);
const wrap = (child: Child): Child => <div class="container reading-zone">{child}</div>;

export const Career: Story = { name: "Lessons career (h3)", render: (): Child => wrap(<Timeline variant="career" title="経歴" items={entries()} />) };
export const Cv: Story = { name: "About CV column (h2)", render: (): Child => wrap(<Timeline variant="cv" title="経歴" items={entries()} />) };
export const Plain: Story = { name: "Plain list", render: (): Child => wrap(<Timeline variant="plain" title="" items={entries()} />) };
