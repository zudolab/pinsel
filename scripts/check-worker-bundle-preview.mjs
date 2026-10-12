// Bundles the preview protocol client exactly as wrangler bundles the
// authoring Worker (esbuild with keep-names), then runs the inline script it
// serves in a bare context with only `window`, as the preview iframe does.
// Fails when the served script throws (for example on a missing `__name`) or
// never posts `ready`. Needs no assembled content.
// Usage: node scripts/check-worker-bundle-preview.mjs
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const worker = path.join(repoRoot, "apps/authoring-worker");
const harness = path.join(worker, ".wrangler/preview-harness");
const outdir = path.join(harness, "out");

await rm(harness, { recursive: true, force: true });
await mkdir(harness, { recursive: true });
const client = path.join(worker, "src/preview/preview-client.ts");
await writeFile(
  path.join(harness, "entry.ts"),
  `import { previewClientMain, previewClientScript } from ${JSON.stringify(client)};\nexport default { fetch() { return Response.json({ script: previewClientScript({ packId: "pinsel", packVersion: "0.0.0" }, null, null), source: previewClientMain.toString() }); } };\n`,
);
await writeFile(path.join(harness, "wrangler.jsonc"), JSON.stringify({ name: "pinsel-preview-harness", main: "./entry.ts", compatibility_date: "2026-10-12" }));
execFileSync("corepack", ["pnpm", "exec", "wrangler", "deploy", "--dry-run", "--outdir", outdir, "--config", path.join(harness, "wrangler.jsonc")], { cwd: worker, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });

const bundle = (await readdir(outdir)).find((name) => /\.m?js$/.test(name));
if (!bundle) throw new Error(`check-worker-bundle-preview: no bundle in ${outdir}`);
const { default: entry } = await import(pathToFileURL(path.join(outdir, bundle)).href);
const { script, source } = await (await entry.fetch()).json();

function run(code) {
  const posted = [];
  const window = {
    parent: { postMessage: (message) => posted.push(message) },
    location: { origin: "https://authoring.example", replace() {} },
    crypto: { randomUUID: () => "load-1" },
    addEventListener() {},
  };
  vm.runInNewContext(code, { window });
  return posted;
}

const keepNames = source.includes("__name(");
let failure = null;
try {
  const posted = run(script);
  if (posted[0]?.type !== "ready") failure = `the served script posted ${JSON.stringify(posted)} instead of ready`;
} catch (error) {
  failure = `the served script throws: ${error instanceof Error ? error.message : String(error)}`;
}
await rm(harness, { recursive: true, force: true });
if (failure) {
  console.error(`check-worker-bundle-preview: ${failure}`);
  process.exit(1);
}
console.log(`check-worker-bundle-preview: the wrangler-bundled inline preview client posts ready in a bare context (keep-names rewrite ${keepNames ? "present" : "absent"} in the bundle)`);
