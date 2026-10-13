import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Breadcrumb } from "./breadcrumb";

const meta: StoryMeta = {
  title: "Breadcrumb",
  category: "Chrome",
  description: "トップ › [parent ›] current page.",
  usage: `import { Breadcrumb } from "@pinsel/ui";\n\n<Breadcrumb label="ドイツの美大は学費が無料" parentLabel="Notes" parentHref="/notes/" />`,
};
export default meta;

export const Page: Story = { name: "Top-level page", render: (): Child => <Breadcrumb label="合格実績" /> };
export const Note: Story = { name: "Note article (with parent)", render: (): Child => <Breadcrumb label="ドイツの美大は学費が無料" parentLabel="Notes" parentHref="/notes/" /> };
