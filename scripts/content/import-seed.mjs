// Imports the approved seed (tests/fixtures/approved-seed/content.json plus the
// prototype's hard-coded copy) into content/entries/<model>/<id>.json and
// records content/baseline.json. Idempotent; never overwrites an entry the CMS
// changed since the last import. Logic: packages/pinsel-content/src/import/.
import { tsImport } from "tsx/esm/api";

const { importSeed } = await tsImport("../../packages/pinsel-content/src/import/import-seed.ts", import.meta.url);

/** @type {{ rows: { key: string, modelId: string, decision: string }[], written: string[] }} */
const result = await importSeed();
const byDecision = new Map();
const byModel = new Map();
for (const row of result.rows) {
  byDecision.set(row.decision, (byDecision.get(row.decision) ?? 0) + 1);
  byModel.set(row.modelId, (byModel.get(row.modelId) ?? 0) + 1);
}
for (const row of result.rows.filter((candidate) => candidate.decision === "keep-newer")) {
  console.warn(`keep-newer ${row.key}: the entry file differs from content/baseline.json (CMS edit); not overwritten`);
}
console.log(`import-seed: ${result.rows.length} seed entries in ${byModel.size} models; ${[...byDecision].map(([decision, count]) => `${decision} ${count}`).join(", ")}`);
console.log(result.written.length === 0 ? "import-seed: nothing written" : `import-seed: wrote ${result.written.length} file(s)`);
