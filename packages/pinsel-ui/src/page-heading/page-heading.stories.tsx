import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { lessonsHeading, resultsHeading, stats } from "../stories/samples";
import { PageHeading, Stat } from "./page-heading";

const meta: StoryMeta = {
  title: "PageHeading",
  category: "Sections",
  description: "Breadcrumb, eyebrow + h1, description and the shallow hero art (small / medium / ribbon).",
  usage: `import { PageHeading } from "@pinsel/ui";\n\n<PageHeading title="合格実績" description="…" eyebrow="Results" artSize="small" stats={[<Stat number="123+" label="合格実績" />]} />`,
};
export default meta;

export const Lessons: Story = {
  name: "Lessons (two-line title, medium art)",
  render: (): Child => <PageHeading title={lessonsHeading.title} description={lessonsHeading.description} eyebrow="Lessons" artSize="medium" />,
};

export const Results: Story = {
  name: "Results (stats, small art)",
  render: (): Child => <PageHeading title={resultsHeading.title} description={resultsHeading.description} eyebrow="Results" artSize="small" stats={stats.map((stat) => <Stat {...stat} />)} />,
};

export const Contact: Story = {
  name: "Contact (ribbon art)",
  render: (): Child => <PageHeading title="お問い合わせ" description="オンラインクラスや進路相談について、お気軽にお問い合わせください。" eyebrow="Contact" artSize="ribbon" />,
};
