import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { legalRows } from "../stories/samples";
import { LegalRow, LegalTable } from "./legal-table";

const meta: StoryMeta = {
  title: "LegalTable",
  category: "Forms",
  description: "details#legal: 特定商取引法に基づく表記, closed by default.",
  usage: `import { LegalRow, LegalTable } from "@pinsel/ui";\n\n<LegalTable summary="特定商取引法に基づく表記" rows={rows.map((row) => LegalRow(row))} />`,
};
export default meta;

const rows = (): Child[] => legalRows.map((row) => LegalRow(row));

export const Closed: Story = { name: "Closed", render: (): Child => <LegalTable summary="特定商取引法に基づく表記" rows={rows()} /> };
export const Open: Story = { name: "Open", render: (): Child => <LegalTable summary="特定商取引法に基づく表記" rows={rows()} open /> };
