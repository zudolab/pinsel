import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { note, notes } from "../stories/samples";
import { ArticleHeading } from "./article-heading";

const meta: StoryMeta = {
  title: "ArticleHeading",
  category: "Sections",
  description: "A note's breadcrumb, heading block and ribbon art.",
  usage: `import { ArticleHeading } from "@pinsel/ui";\n\n<ArticleHeading title="…" description="…" eyebrow="Pinsel Notes" slug="free-tuition" parentLabel="Notes" parentHref="/notes/" />`,
};
export default meta;

export const Phrased: Story = {
  name: "free-tuition (title phrases)",
  render: (): Child => <ArticleHeading title={note.title} description={note.description} eyebrow="Pinsel Notes" slug={note.slug} parentLabel="Notes" parentHref="/notes/" />,
};

export const Plain: Story = {
  name: "Another note",
  render: (): Child => {
    const other = notes.find((entry) => entry.slug === "what-is-mappe")!;
    return <ArticleHeading title={other.title} description={other.description} eyebrow="Pinsel Notes" slug={other.slug} parentLabel="Notes" parentHref="/notes/" />;
  },
};
