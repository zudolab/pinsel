import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { resultYear } from "../stories/samples";
import { ResultRow, ResultsYearSection } from "./results-year";

const meta: StoryMeta = {
  title: "ResultsYearSection",
  category: "Sections",
  description: "One results year: h2 with the declared count; rows link to the school site in a new tab when a URL exists.",
  usage: `import { ResultRow, ResultsYearSection } from "@pinsel/ui";\n\n<ResultsYearSection label="2025年度" count={9} rows={[<ResultRow school="…" department="…" url="https://…" />]} />`,
};
export default meta;

export const Year: Story = {
  name: "2025年度",
  render: (): Child => (
    <div class="container page-results">
      <ResultsYearSection label={resultYear.label} count={resultYear.count} rows={resultYear.rows.map((row) => <ResultRow {...row} />)} />
    </div>
  ),
};

export const WithoutLink: Story = {
  name: "Row without a school URL",
  render: (): Child => (
    <div class="container page-results">
      <ResultsYearSection label="2015年度" count={1} rows={[<ResultRow school="ミュンヘン芸術アカデミー" department="Freie Kunst" url="" />]} />
    </div>
  ),
};
