import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { ResultRow, ResultsYearSection } from "../results-year/results-year";
import { resultYear, resultYears } from "../stories/samples";
import { TocItem } from "../toc/toc";
import { ArchiveLayout } from "./archive-layout";

const meta: StoryMeta = {
  title: "ArchiveLayout",
  category: "Layout",
  description: "Results and FAQ: the sticky aside TOC rail beside the archive body (one column ≤64rem).",
  usage: `import { ArchiveLayout } from "@pinsel/ui";\n\n<ArchiveLayout tocLabel="年度から見る" toc={[…TocItem]} body={[…ResultsYearSection]} />`,
};
export default meta;

export const Results: Story = {
  name: "Results page",
  render: (): Child => (
    <div class="page-results">
      <ArchiveLayout
        tocLabel="年度から見る"
        toc={resultYears.map((year, index) => <TocItem label={year} target={`year-${year}`} prefix="" index={index + 1} current={index === 0} />)}
        body={[<ResultsYearSection label={resultYear.label} count={resultYear.count} items={resultYear.rows.map((row) => <ResultRow {...row} />)} />]}
      />
    </div>
  ),
};
