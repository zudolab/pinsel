// Scans the `wrangler deploy --dry-run --outdir` bundle of the authoring
// Worker: no Node builtins, no Vite, no Preact, no local identity fixture, no
// local seed endpoint, no fake publication provider.
// Usage: node scripts/check-worker-bundle.mjs [outdir]
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outdir = path.resolve(process.argv[2] ?? path.join(repoRoot, "apps/authoring-worker/.wrangler/dry-run"));

const files = (await readdir(outdir, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile() && /\.m?js$/.test(entry.name)).map((entry) => path.join(entry.parentPath, entry.name));
if (files.length === 0) throw new Error(`no bundle in ${outdir}; run pnpm worker:dry-run first`);
const code = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

/** @type {[RegExp, string][]} */
const forbidden = [
  [/\bfrom\s*["']node:[a-z]/, "a node: builtin import"],
  [/\brequire\(\s*["']node:[a-z]/, "a node: builtin require"],
  [/\bfrom\s*["']vite["']|\bfrom\s*["']vite\//, "vite"],
  [/\bfrom\s*["']preact["']|\bfrom\s*["']preact\//, "preact"],
  [/__vite-browser-external/, "a Vite browser stub"],
  [/pinsel-local-dev-identity-fixture/, "the local identity fixture (src/local-dev.ts)"],
  [/local-dev@example\.test/, "the local identity subject"],
  [/pinsel-local-admin-seed/, "the local seed endpoint (src/admin/seed.ts)"],
  [/pinsel-fake-publication-provider/, "the fake publication provider (src/publish/fake-provider.ts)"],
  [/zudo-composer\/src\//, "a private Composer source path"],
];
const failures = forbidden.filter(([pattern]) => pattern.test(code)).map(([, label]) => label);
if (failures.length > 0) {
  console.error(`check-worker-bundle: the production bundle contains ${failures.join(", ")}`);
  process.exit(1);
}
/** @type {[string, string][]} */
const required = [["zudo-composer-host-preview", "the preview protocol"], ["pricing-card", "the pinsel-ui renderer"], ["cf-access-jwt-assertion", "Access verification"], ["PUBLISHER_PROVIDER", "the fail-closed publisher selection"], ["var __name = (target) => target;", "the inline preview client's __name prelude (keep-names; see check-worker-bundle-preview.mjs)"]];
const missing = required.filter(([needle]) => !code.includes(needle)).map(([, label]) => label);
if (missing.length > 0) {
  console.error(`check-worker-bundle: the production bundle is missing ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`check-worker-bundle: ${files.length} file(s), ${code.length} chars; no node:/vite/preact/local fixture/seed/fake provider`);
