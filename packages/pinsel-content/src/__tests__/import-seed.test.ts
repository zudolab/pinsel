import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { CONTENT_BASELINE_PATH, entryFilePath, type ContentBaseline } from "../import-rules";
import { DEFAULT_IMPORT_ROOT, importSeed, valuesDigest } from "../import/import-seed";
import { SEED_ENTRY_COUNTS } from "../models";
import { MIGRATION_BASELINE } from "./content-state";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const freshRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "pinsel-import-"));
  roots.push(root);
  return root;
};
const now = () => "2026-10-13T00:00:00.000Z";
const total = Object.values(SEED_ENTRY_COUNTS).reduce((sum, count) => sum + count, 0);

async function listEntries(root: string): Promise<string[]> {
  const files = await readdir(join(root, "content/entries"), { recursive: true });
  return files.filter((file) => file.endsWith(".json")).sort();
}

describe("import-seed", () => {
  it("creates one file per seed entry plus the baseline, then re-runs without writing", async () => {
    const root = await freshRoot();
    const first = await importSeed({ root, now });
    expect(first.rows).toHaveLength(total);
    expect(first.rows.every((row) => row.decision === "create")).toBe(true);
    expect(first.written).toHaveLength(total + 1);
    expect(await listEntries(root)).toHaveLength(total);
    const second = await importSeed({ root, now: () => "2099-01-01T00:00:00.000Z" });
    expect(second.rows.every((row) => row.decision === "unchanged")).toBe(true);
    expect(second.written).toEqual([]);
    expect(second.baseline.importedAt).toBe(first.baseline.importedAt);
  });

  // After a publication the committed entries are CMS-edited by design; the baseline record is still checked by check-publication.
  it.runIf(MIGRATION_BASELINE)("reproduces the committed content/entries and content/baseline.json digests byte for byte", async () => {
    const root = await freshRoot();
    const result = await importSeed({ root, now });
    const committed = JSON.parse(await readFile(join(DEFAULT_IMPORT_ROOT, CONTENT_BASELINE_PATH), "utf8")) as ContentBaseline;
    expect(result.baseline.entries).toEqual(committed.entries);
    expect(result.baseline.entriesDigest).toBe(committed.entriesDigest);
    expect(result.baseline.seedContentDigest).toBe(committed.seedContentDigest);
    for (const row of result.rows) {
      const path = entryFilePath(row.modelId, row.entryId);
      expect(await readFile(join(root, path), "utf8"), path).toBe(await readFile(join(DEFAULT_IMPORT_ROOT, path), "utf8"));
    }
  });

  it("refuses to overwrite an entry the CMS changed since the baseline", async () => {
    const root = await freshRoot();
    await importSeed({ root, now });
    const path = join(root, entryFilePath("course", "two-month"));
    const edited = JSON.parse(await readFile(path, "utf8"));
    edited.values["course-price"] = "¥55,000";
    const editedText = `${JSON.stringify(edited, null, 2)}\n`;
    await writeFile(path, editedText);
    const rerun = await importSeed({ root, now });
    expect(rerun.rows.find((row) => row.key === "course/two-month")?.decision).toBe("keep-newer");
    expect(rerun.rows.filter((row) => row.decision !== "unchanged")).toHaveLength(1);
    expect(await readFile(path, "utf8")).toBe(editedText);
    expect(rerun.written).toEqual([]);
  });

  it("keeps a differing file when there is no baseline yet, and updates from the seed when only the baseline moved", async () => {
    const root = await freshRoot();
    await importSeed({ root, now });
    const path = join(root, entryFilePath("legal-row", "legal-row-01"));
    const record = JSON.parse(await readFile(path, "utf8"));
    record.values["legal-row-value"] = "変更済み";
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);
    await rm(join(root, CONTENT_BASELINE_PATH));
    expect((await importSeed({ root, now })).rows.find((row) => row.key === "legal-row/legal-row-01")?.decision).toBe("keep-newer");

    // The file equals what the baseline recorded, the seed says otherwise: an old import, advanced from the seed.
    const baselinePath = join(root, CONTENT_BASELINE_PATH);
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as ContentBaseline;
    baseline.entries["legal-row/legal-row-01"]!.digest = valuesDigest(record.values);
    await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    const advanced = await importSeed({ root, now });
    expect(advanced.rows.find((row) => row.key === "legal-row/legal-row-01")?.decision).toBe("update-from-seed");
    expect(JSON.parse(await readFile(path, "utf8")).values["legal-row-value"]).not.toBe("変更済み");
    expect((await importSeed({ root, now })).rows.every((row) => row.decision === "unchanged")).toBe(true);
  });
});
