import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { MoreLink } from "../more-link/more-link";
import { Section } from "../section/section";
import { homeResults } from "../stories/samples";
import { ResultPreview, ResultPreviews } from "./result-previews";

const meta: StoryMeta = {
  title: "ResultPreviews",
  category: "Sections",
  description: "The home 合格実績 cards and the もっと見る link.",
  usage: `import { ResultPreview, ResultPreviews } from "@pinsel/ui";\n\n<ResultPreviews items={[<ResultPreview yearLabel="2025" school="…" detail="…" />]} />`,
};
export default meta;

export const Home: Story = {
  name: "Home #results",
  render: (): Child => <Section id="results" eyebrow="Results" title="合格実績" content={[<ResultPreviews items={homeResults.map((result) => <ResultPreview {...result} />)} />, <MoreLink href="/results/" label="もっと見る" />]} />,
};
