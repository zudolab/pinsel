// `pnpm content:assemble`: content/entries + the structure manifest -> the
// derived .site-project/site-project.json (canonical JSON) and baseline.json
// (the baseline identity the Worker seeds and the editor is built for).
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { TrustedComponentPack } from "@zudo-composer/component-contract";
import { serializeSiteProject, validateSiteProject } from "zudo-composer/content";
import { sha256Hex } from "zudo-composer/host-storage";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { readContentEntries, BASELINE_PATH, REPO_ROOT, SITE_PROJECT_DIR, SITE_PROJECT_PATH } from "./entries";
import { structurePack } from "./pack";
import { buildPinselSite } from "./structure";

export interface AssembledBaseline {
  /** Git commit the content tree was assembled from (`PINSEL_BASELINE_REVISION` overrides). */
  baselineRevision: string;
  /** sha256 of the canonical site-project.json. */
  projectDigest: string;
  assembledAt: string;
}

async function gitHead(): Promise<string> {
  const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  return stdout.trim();
}

/** Entries + structure → the canonical site-project.json text; throws on any validation diagnostic. */
export function assembleProjectText(entries: readonly ContentEntryRecord[], pack: TrustedComponentPack): string {
  const { project } = buildPinselSite(entries, pack);
  const validated = validateSiteProject(project, { componentPack: pack.manifest });
  if (!validated.ok) throw new Error(`site project is invalid:\n${validated.diagnostics.map((d) => `  ${d.code} ${d.path}: ${d.message}`).join("\n")}`);
  return serializeSiteProject(validated.project);
}

export async function assemble(): Promise<AssembledBaseline> {
  const text = assembleProjectText(await readContentEntries(), structurePack());
  const baseline: AssembledBaseline = {
    baselineRevision: process.env.PINSEL_BASELINE_REVISION ?? (await gitHead()),
    projectDigest: await sha256Hex(text),
    assembledAt: new Date().toISOString(),
  };
  await mkdir(SITE_PROJECT_DIR, { recursive: true });
  await writeFile(SITE_PROJECT_PATH, `${text}\n`);
  await writeFile(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const baseline = await assemble();
  console.log(`content:assemble wrote ${SITE_PROJECT_PATH} (digest ${baseline.projectDigest.slice(0, 12)}…, baseline ${baseline.baselineRevision})`);
}
