// The public site's static-asset Worker (apps/site/wrangler.jsonc) under
// `wrangler dev`: directory routes, the trailing-slash redirect, the 404 page,
// an exact asset and the absent ZFB routes manifest. Needs `pnpm build:site`.
// Usage: node scripts/site/wrangler-dev-check.mjs [--port 8788] [--report .reports/site-wrangler-dev.json]
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
/** @param {string} name @param {string} fallback */
const option = (name, fallback) => (argv.includes(name) ? (argv[argv.indexOf(name) + 1] ?? fallback) : fallback);
const port = Number(option("--port", "8788"));
const reportPath = path.resolve(repoRoot, option("--report", ".reports/site-wrangler-dev.json"));
const origin = `http://127.0.0.1:${port}`;
const ILLUSTRATION = "/assets/illustrations/10-form-through-dialogue.png";

const manifest = JSON.parse(await readFile(path.join(repoRoot, "tests/fixtures/approved-seed/asset-manifest.json"), "utf8"));
/** @type {string | undefined} */
const illustrationSha = JSON.stringify(manifest).match(new RegExp(`"sitePath":"${ILLUSTRATION}"[^}]*?"sha256":"([0-9a-f]{64})"`))?.[1];
if (!illustrationSha) throw new Error(`asset-manifest.json has no sha256 for ${ILLUSTRATION}`);

// wrangler is a devDependency of the authoring Worker; the config path is what selects the public site.
const child = spawn("corepack", ["pnpm", "exec", "wrangler", "dev", "--config", "../site/wrangler.jsonc", "--port", String(port), "--ip", "127.0.0.1", "--log-level", "warn"], {
  cwd: path.join(repoRoot, "apps/authoring-worker"),
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
});
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));

/** @type {{ step: string, ok: boolean, detail: string }[]} */
const steps = [];
/** @param {string} pathname */
const get = (pathname) => fetch(`${origin}${pathname}`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });

try {
  const started = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`wrangler dev exited early:\n${output}`);
    if (Date.now() - started > 90_000) throw new Error(`wrangler dev did not start within 90s:\n${output}`);
    if (await get("/").then(() => true, () => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  /** @param {string} step @param {boolean} ok @param {string} detail */
  const record = (step, ok, detail) => {
    steps.push({ step, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${step} — ${detail}`);
  };
  const lessons = await get("/lessons/");
  record("GET /lessons/ is 200", lessons.status === 200, String(lessons.status));
  const bare = await get("/lessons");
  record("GET /lessons redirects 307 to /lessons/", bare.status === 307 && new URL(bare.headers.get("location") ?? "", origin).pathname === "/lessons/", `${bare.status} ${bare.headers.get("location")}`);
  const missing = await get("/nope/");
  const missingBody = await missing.text();
  record("GET /nope/ is 404 with the 404 page body", missing.status === 404 && missingBody.includes("<h1>ページが見つかりません</h1>"), String(missing.status));
  const notFoundPage = await fetch(`${origin}/404.html`, { signal: AbortSignal.timeout(10_000) });
  const notFoundBody = await notFoundPage.text();
  record("GET /404.html serves the 404 page", notFoundBody.includes("<h1>ページが見つかりません</h1>"), `${notFoundPage.status} ${new URL(notFoundPage.url).pathname}`);
  const image = await get(ILLUSTRATION);
  const sha = createHash("sha256").update(Buffer.from(await image.arrayBuffer())).digest("hex");
  record(`GET ${ILLUSTRATION} is 200 with the approved sha256`, image.status === 200 && sha === illustrationSha, `${image.status} ${sha}`);
  const routesManifest = await get("/__zfb/routes.json");
  record("GET /__zfb/routes.json is 404", routesManifest.status === 404, String(routesManifest.status));
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => (child.exitCode !== null ? resolve(undefined) : child.once("exit", () => resolve(undefined))));
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify({ origin, steps }, null, 2)}\n`);
const failed = steps.filter((step) => !step.ok);
if (failed.length > 0) {
  console.error(`site wrangler dev check: ${failed.length} failing step(s); report ${path.relative(repoRoot, reportPath)}`);
  process.exit(1);
}
console.log(`site wrangler dev check: ${steps.length}/${steps.length} passed; report ${path.relative(repoRoot, reportPath)}`);
