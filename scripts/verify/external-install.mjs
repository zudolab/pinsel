// Gate-1 step 1: a clean external install of the two Composer git specs
// Pinsel pins, in a temporary directory outside the repository, with nothing
// from this checkout: fresh lockfile, frozen reinstall, and an import of every
// public subpath Pinsel consumes. Prints a JSON summary.
// Usage: node scripts/verify/external-install.mjs
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const root = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const content = JSON.parse(await readFile(path.join(repoRoot, "packages/pinsel-content/package.json"), "utf8"));
const toolSpec = content.dependencies["zudo-composer"];
const contractSpec = content.dependencies["@zudo-composer/component-contract"];
assert.match(toolSpec, /^git\+https:\/\/github\.com\/Takazudo\/zudo-composer\.git#[0-9a-f]{40}$/, "zudo-composer must be pinned to a full git SHA");
assert.match(contractSpec, /^git\+https:\/\/github\.com\/Takazudo\/zudo-composer\.git#[0-9a-f]{40}$/, "component-contract must be pinned to a full git SHA");

const SUBPATHS = ["zudo-composer/content", "zudo-composer/site-build", "zudo-composer/preview-protocol", "zudo-composer/export", "zudo-composer/host-storage", "zudo-composer/authoring", "@zudo-composer/component-contract"];

const temporary = await mkdtemp(path.join(tmpdir(), "pinsel-external-install-"));
const host = path.join(temporary, "host");
/** @param {string[]} args */
const pnpm = (args) => execFile("corepack", ["pnpm", ...args], { cwd: host, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
try {
  await execFile("mkdir", ["-p", host]);
  await writeFile(path.join(host, "package.json"), `${JSON.stringify({
    name: "pinsel-external-install", private: true, version: "0.0.0", type: "module", packageManager: root.packageManager,
    dependencies: { "zudo-composer": toolSpec, "@zudo-composer/component-contract": contractSpec, preact: content.dependencies.preact },
  }, null, 2)}\n`);
  await writeFile(path.join(host, "pnpm-workspace.yaml"), "packages: []\nautoInstallPeers: false\nallowBuilds:\n  '@zudo-composer/component-contract': true\n  esbuild: true\n");
  await pnpm(["install", "--lockfile-only"]);
  const lock = await readFile(path.join(host, "pnpm-lock.yaml"), "utf8");
  for (const spec of [toolSpec, contractSpec]) assert.ok(lock.includes(spec.slice(spec.indexOf("#") + 1)), `lockfile must record ${spec}`);
  for (const protocol of ["file:", "link:", "workspace:", "path:"]) assert.ok(!lock.includes(` ${protocol}`) && !lock.includes(`\n${protocol}`), `lockfile must not use ${protocol}`);
  await pnpm(["install", "--frozen-lockfile"]);
  assert.equal(await readFile(path.join(host, "pnpm-lock.yaml"), "utf8"), lock, "frozen reinstall must not rewrite the lockfile");
  await writeFile(path.join(host, "probe.mjs"), `const names = {};\nfor (const subpath of ${JSON.stringify(SUBPATHS)}) names[subpath] = Object.keys(await import(subpath)).sort();\nconsole.log(JSON.stringify(names));\n`);
  const probe = await execFile(process.execPath, ["probe.mjs"], { cwd: host, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  /** @type {Record<string, string[]>} */
  const names = JSON.parse(probe.stdout);
  /** @type {[string, string[]][]} */
  const expectations = [
    ["zudo-composer/content", ["compileSiteProjectPlan", "authorizeContentMutation", "validateSiteProject", "validateContentEntryRecord"]],
    ["zudo-composer/host-storage", ["applyHostContentRequest", "runContentStorageConformance", "createMemoryContentDraftStorage"]],
    ["zudo-composer/preview-protocol", ["createHostPreviewBridge", "readPreviewToHost"]],
    ["zudo-composer/export", ["validateContentExportSubmission", "createFakeContentExportAdapter"]],
    ["zudo-composer/site-build", ["compileStaticSite"]],
    ["@zudo-composer/component-contract", ["defineComponentPack", "defineComponent"]],
  ];
  for (const [subpath, expected] of expectations) for (const name of expected) assert.ok(names[subpath]?.includes(name), `${subpath} must export ${name}`);
  const installed = JSON.parse(await readFile(path.join(host, "node_modules/zudo-composer/package.json"), "utf8"));
  console.log(JSON.stringify({ host, toolSpec, contractSpec, installedVersion: installed.version, subpaths: Object.fromEntries(Object.entries(names).map(([k, v]) => [k, v.length])) }, null, 2));
  console.log("external-install: fresh lockfile, frozen reinstall and every public subpath import passed outside the repository.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
