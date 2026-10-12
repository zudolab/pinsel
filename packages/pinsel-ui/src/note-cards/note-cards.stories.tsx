import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { Section } from "../section/section";
import { knowledgeCards, notes } from "../stories/samples";
import { NoteCard, NoteCards } from "./note-cards";

const meta: StoryMeta = {
  title: "NoteCards",
  category: "Sections",
  description: "Numbered note links: the lessons grid and the editorial rows of the notes index.",
  usage: `import { NoteCard, NoteCards } from "@pinsel/ui";\n\n<NoteCards editorial={false} items={[<NoteCard href="/notes/free-tuition/" title="…" description="…" />]} />`,
};
export default meta;

export const Grid: Story = {
  name: "Lessons #knowledge (grid)",
  render: (): Child => <Section id="knowledge" eyebrow="Knowledge" title="ドイツ美大受験について知る" content={[<NoteCards editorial={false} items={knowledgeCards.map((card, index) => <NoteCard {...card} index={index + 1} />)} />]} />,
};

export const Editorial: Story = {
  name: "Notes index (editorial)",
  render: (): Child => <Section id="" eyebrow="" title="" label="ノート一覧" content={[<NoteCards editorial items={notes.map((note, index) => <NoteCard href={`/notes/${note.slug}/`} title={note.title} description={note.description} index={index + 1} />)} />]} />,
};
