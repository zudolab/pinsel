import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { NotFound } from "./not-found";

const meta: StoryMeta = {
  title: "NotFound",
  category: "Sections",
  description: "The 404 block and its closing art.",
  usage: `import { NotFound } from "@pinsel/ui";\n\n<NotFound title="ページが見つかりません" body="…" linkLabel="トップページに戻る" />`,
};
export default meta;

export const Default: Story = {
  name: "404",
  render: (): Child => <NotFound title="ページが見つかりません" body="お探しのページは存在しないか、移動した可能性があります。" linkLabel="トップページに戻る" />,
};
