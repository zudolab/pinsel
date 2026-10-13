import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { note } from "../stories/samples";
import { Prose } from "./prose";

const meta: StoryMeta = {
  title: "Prose",
  category: "Typography",
  description: "The safe Markdown subset: ## headings (#section-N), paragraphs, flat lists, links, strong. Raw HTML stays text.",
  usage: `import { Prose } from "@pinsel/ui";\n\n<Prose markdown={note.body} />`,
};
export default meta;

export const Note: Story = {
  name: "Note body (free-tuition)",
  render: (): Child => (
    <div class="container reading-zone">
      <Prose markdown={note.body} />
    </div>
  ),
};
