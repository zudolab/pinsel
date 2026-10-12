import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { SkipLink } from "./skip-link";

const meta: StoryMeta = {
  title: "SkipLink",
  category: "Chrome",
  description: "Hidden above the viewport until focused (press Tab inside the preview).",
  usage: `import { SkipLink } from "@pinsel/ui";\n\n<SkipLink />`,
};
export default meta;

export const Default: Story = {
  name: "Skip to main (focus to reveal)",
  render: (): Child => (
    <div style={{ padding: "2rem", "min-block-size": "6rem" }}>
      <SkipLink />
      <p>Tab でスキップリンクが表示されます。</p>
    </div>
  ),
};
