import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Every committed content entry under content/entries.
 * @param {string} repoRoot
 * @returns {{ id: string, modelId: string, values: Record<string, unknown> }[]}
 */
export function readCommittedEntries(repoRoot) {
  const dir = path.join(repoRoot, "content/entries");
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => JSON.parse(readFileSync(path.join(entry.parentPath, entry.name), "utf8")));
}
