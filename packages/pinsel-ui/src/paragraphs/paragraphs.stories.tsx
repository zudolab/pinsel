import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { graduatesParagraphs } from "../stories/samples";
import { Paragraphs } from "./paragraphs";

const meta: StoryMeta = {
  title: "Paragraphs",
  category: "Typography",
  description: "Plain-text paragraphs in a .prose block.",
  usage: `import { Paragraphs } from "@pinsel/ui";\n\n<Paragraphs paragraphs={["…", "…"]} />`,
};
export default meta;

export const Default: Story = {
  name: "Graduates passage",
  render: (): Child => (
    <div class="container reading-zone">
      <Paragraphs paragraphs={graduatesParagraphs} />
    </div>
  ),
};
