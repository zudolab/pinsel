import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Brand } from "./brand";

const meta: StoryMeta = {
  title: "Brand",
  category: "Chrome",
  description: "The Pinsel wordmark linking home.",
  usage: `import { Brand } from "@pinsel/ui";\n\n<Brand word="Pinsel" sub="ART STUDY IN GERMANY" />`,
};
export default meta;

export const Default: Story = {
  name: "Wordmark",
  render: (): Child => (
    <div style={{ padding: "2rem" }}>
      <Brand word="Pinsel" sub="ART STUDY IN GERMANY" />
    </div>
  ),
};
