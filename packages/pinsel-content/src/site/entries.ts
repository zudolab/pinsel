import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentEntryRecord } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { CONTENT_ENTRIES_DIR } from "../import-rules";

export const REPO_ROOT = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));
export const SITE_PROJECT_DIR = join(REPO_ROOT, "packages/pinsel-content/.site-project");
export const SITE_PROJECT_PATH = join(SITE_PROJECT_DIR, "site-project.json");
export const BASELINE_PATH = join(SITE_PROJECT_DIR, "baseline.json");

/** Every `content/entries/<model>/<id>.json`, validated as a Composer entry record, sorted by model then id. */
export async function readContentEntries(root = REPO_ROOT): Promise<ContentEntryRecord[]> {
  const base = join(root, CONTENT_ENTRIES_DIR);
  const entries: ContentEntryRecord[] = [];
  for (const model of (await readdir(base, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
    for (const file of (await readdir(join(base, model))).filter((name) => name.endsWith(".json")).sort()) {
      const path = join(base, model, file);
      const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
      const validated = validateContentEntryRecord(parsed);
      if (!validated.ok) throw new Error(`${path}: ${validated.issue.path} ${validated.issue.message}`);
      const record = validated.value;
      if (record.modelId !== model) throw new Error(`${path}: modelId "${record.modelId}" does not match its directory.`);
      if (`${record.id}.json` !== file) throw new Error(`${path}: id "${record.id}" does not match its file name.`);
      entries.push(record);
    }
  }
  return entries;
}
