import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { note, notes } from "../stories/samples";
import { ArticleLayout, RelatedNote } from "./article-layout";

const meta: StoryMeta = {
  title: "ArticleLayout",
  category: "Sections",
  description: "A note article: Contents rail from the body's h2s, the prose and All Notes with the current note unlinked.",
  usage: `import { ArticleLayout, RelatedNote } from "@pinsel/ui";\n\n<ArticleLayout markdown={body} contentsLabel="Contents" allNotesLabel="All Notes" related={[<RelatedNote href="/notes/x/" title="…" />]} />`,
};
export default meta;

export const FreeTuition: Story = {
  name: "free-tuition",
  render: (): Child => (
    <div class="page-notes">
      <ArticleLayout
        markdown={note.body}
        contentsLabel="Contents"
        allNotesLabel="All Notes"
        related={notes.map((entry) => <RelatedNote href={`/notes/${entry.slug}/`} title={entry.title} route={{ pathname: `/notes/${note.slug}/` }} />)}
      />
    </div>
  ),
};
