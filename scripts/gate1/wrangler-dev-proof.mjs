// Gate-1 step 9 against `wrangler dev --env local` (workerd + local D1):
//   session A saves course.price -> Worker restart -> session B reads it;
//   snapshot + preview show the saved revision; a forbidden field, an unknown
//   field and a stale expectedRevision are refused with typed codes via curl;
//   the saved snapshot is written for `pnpm content:project --snapshot` so the
//   static build can be checked for the edited price; the non-local entry
//   answers 503/401/403 to unauthenticated requests on API, preview AND assets.
// Usage: node scripts/gate1/wrangler-dev-proof.mjs [--port 8787] [--report .reports/gate1-wrangler-dev.json]
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCommittedEntries } from "../lib/committed-entries.mjs";
import { committedAmounts, editPrices } from "../lib/edit-prices.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const worker = path.join(repoRoot, "apps/authoring-worker");
const argv = process.argv.slice(2);
/** @param {string} name @param {string} fallback */
const option = (name, fallback) => (argv.includes(name) ? (argv[argv.indexOf(name) + 1] ?? fallback) : fallback);
const port = Number(option("--port", "8787"));
const reportPath = path.resolve(repoRoot, option("--report", ".reports/gate1-wrangler-dev.json"));
const persist = path.join(worker, ".wrangler/gate1-state");
const origin = `http://127.0.0.1:${port}`;
const PRICE_FIELD = "course-price";
const committed = readCommittedEntries(repoRoot);
const COMMITTED_PRICE = committed.find((entry) => entry.id === "two-month")?.values[PRICE_FIELD];
const NEW_PRICE = editPrices(committedAmounts(committed, PRICE_FIELD))(1);
/** @type {{ step: string, ok: boolean, detail: unknown }[]} */
const steps = [];

/** @param {string} step @param {boolean} ok @param {unknown} detail */
function record(step, ok, detail) {
  steps.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${step}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
  if (!ok) throw new Error(`Gate-1 wrangler dev proof failed at: ${step}`);
}

/** @param {string[]} args @param {string} label */
async function startWrangler(args, label) {
  const child = spawn("corepack", ["pnpm", "exec", "wrangler", "dev", ...args, "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist, "--log-level", "warn"], { cwd: worker, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    if (child.exitCode !== null) throw new Error(`${label} exited early:\n${output}`);
    try {
      const response = await fetch(`${origin}/api/v1/site`, { signal: AbortSignal.timeout(2000) });
      if (response.status < 600) return { child, output: () => output };
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill("SIGTERM");
  throw new Error(`${label} did not start within 90s:\n${output}`);
}

/** @param {{ child: import("node:child_process").ChildProcess }} handle */
async function stopWrangler(handle) {
  handle.child.kill("SIGTERM");
  await new Promise((resolve) => {
    handle.child.once("exit", () => resolve(undefined));
    setTimeout(() => {
      handle.child.kill("SIGKILL");
      resolve(undefined);
    }, 10_000);
  });
}

/**
 * @param {string} pathname
 * @param {RequestInit & { json?: unknown }} [init]
 * @returns {Promise<{ status: number, body: any, text: string }>}
 */
async function call(pathname, init = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    headers.set("origin", origin);
  }
  const response = await fetch(`${origin}${pathname}`, { ...init, headers, body: init.json === undefined ? init.body : JSON.stringify(init.json) });
  const text = await response.text();
  /** @type {any} */
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // HTML or text
  }
  return { status: response.status, body, text };
}

/** @param {string} id @param {unknown} request @param {string} baseline */
const operation = (id, request, baseline) => ({ operationId: id, request, expectedBaselineRevision: baseline });
/** @param {number} revision @param {string} price @param {Record<string, unknown>} [values] */
const putPrice = (revision, price, values) => ({ kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "course", entryId: "two-month", expectedRevision: revision, values: values ?? { [PRICE_FIELD]: price } });

await rm(persist, { recursive: true, force: true });
await mkdir(path.dirname(reportPath), { recursive: true });
// Local D1 starts empty: apply the committed migrations to the persisted state first.
await new Promise((resolve, reject) => {
  const migrate = spawn("corepack", ["pnpm", "exec", "wrangler", "d1", "migrations", "apply", "pinsel-authoring", "--local", "--env", "local", "--persist-to", persist], { cwd: worker, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  migrate.once("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`wrangler d1 migrations apply exited with ${code}`))));
});
/** @type {any} */
let snapshotRecord = null;
try {
  // Session A: local identity, fresh D1.
  let dev = await startWrangler(["--env", "local"], "wrangler dev --env local (A)");
  try {
    const site = await call("/api/v1/site");
    record("GET /api/v1/site describes the site", site.status === 200 && site.body.status === "ok", site.status === 200 ? { baselineRevision: site.body.baselineRevision, pack: site.body.pack } : { status: site.status, body: site.text.slice(0, 300) });
    const baseline = site.body.baselineRevision;
    const draft = await call("/api/v1/draft");
    record("GET /api/v1/draft seeds the draft from the assembled baseline", draft.status === 200 && draft.body.value.snapshot.entries.find((/** @type {any} */ entry) => entry.id === "two-month")?.values[PRICE_FIELD] === COMMITTED_PRICE && COMMITTED_PRICE !== undefined, { draftRevision: draft.body.value.draftRevision });
    const revision = draft.body.value.draftRevision;
    const saved = await call("/api/v1/operations", { method: "POST", json: operation("gate1-save", putPrice(revision, NEW_PRICE), baseline) });
    record(`POST /api/v1/operations saves course.price=${NEW_PRICE} with a receipt`, saved.status === 200 && saved.body.value?.receipt?.affectedEntryIds?.[0] === "two-month", { draftRevision: saved.body.value?.draft?.draftRevision, receipt: saved.body.value?.receipt?.operationId });
    const savedRevision = saved.body.value.draft.draftRevision;
    const forbidden = await call("/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "gate1-forbidden" }, json: { expectedRevision: savedRevision, expectedBaselineRevision: baseline, values: { "course-order": 9 } } });
    record("PUT with the read-only `order` field is refused: forbidden", forbidden.status === 422 && forbidden.body.refusal?.code === "forbidden", forbidden.body.refusal);
    const unknown = await call("/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "gate1-unknown" }, json: { expectedRevision: savedRevision, expectedBaselineRevision: baseline, values: { "course-slug": "x" } } });
    record("PUT with an unknown field is refused: unknown-field", unknown.status === 422 && unknown.body.refusal?.code === "unknown-field", unknown.body.refusal);
    // Every Pinsel model is policy-listed since the content migration; structure is a protected field or a model outside the policy.
    const structure = await call("/api/v1/operations", { method: "POST", json: operation("gate1-structure", { kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "site-copy", entryId: "site-copy", expectedRevision: savedRevision, values: { "site-copy-brand-word": "x" } }, baseline) });
    record("A protected structure field on another model is refused: forbidden", structure.status === 422 && structure.body.refusal?.code === "forbidden", structure.body.refusal);
    const outside = await call("/api/v1/operations", { method: "POST", json: operation("gate1-outside", { kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "no-such-model", entryId: "x", expectedRevision: savedRevision, values: { "no-such-model-label": "x" } }, baseline) });
    record("A write to a model outside the policy is refused: forbidden", outside.status === 422 && outside.body.refusal?.code === "forbidden", outside.body.refusal);
    const composer = await call("/composer");
    record("GET /composer is refused (403)", composer.status === 403, composer.body);
    const stale = await call("/api/v1/operations", { method: "POST", json: operation("gate1-stale", putPrice(revision, "¥1"), baseline) });
    record("A stale expectedRevision is a draft-revision conflict", stale.status === 409 && stale.body.reason === "draft-revision" && stale.body.current.draftRevision === savedRevision, stale.body);
    const noOrigin = await fetch(`${origin}/api/v1/operations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(operation("gate1-csrf", putPrice(savedRevision, "¥1"), baseline)) });
    record("A mutation without Origin is rejected (403)", noOrigin.status === 403, await noOrigin.text());
    const snapshot = await call("/api/v1/snapshots", { method: "POST", json: { expectedDraftRevision: savedRevision } });
    record("POST /api/v1/snapshots captures the saved revision", snapshot.status === 200 && /^[0-9a-f]{64}$/.test(snapshot.body.value?.snapshotId ?? ""), { snapshotId: snapshot.body.value?.snapshotId, draftRevision: snapshot.body.value?.draftRevision });
    snapshotRecord = snapshot.body.value;
    const preview = await call(`/preview/${snapshotRecord.snapshotId}/?revision=${savedRevision}`);
    record("GET /preview/<snapshot>/ renders the saved price with the public renderer", preview.status === 200 && preview.text.includes(NEW_PRICE) && preview.text.includes('<main id="main" tabindex="-1">') && !/preact/i.test(preview.text), { bytes: preview.text.length });
    const staleRendered = await call(`/preview/${snapshotRecord.snapshotId}/?revision=${revision}`);
    record("A preview request naming an older revision is refused (409), never acknowledged as rendered", staleRendered.status === 409, { status: staleRendered.status });
    const editor = await call("/editor/");
    record("GET /editor/ serves the editor host page from private assets", editor.status === 200 && editor.text.includes("Pinsel 編集"), { status: editor.status });
  } finally {
    await stopWrangler(dev);
  }

  // Session B: a new Worker process on the same persisted D1.
  dev = await startWrangler(["--env", "local", "--var", "LOCAL_DEV_SUBJECT:second-editor@example.test"], "wrangler dev --env local (B)");
  try {
    const draft = await call("/api/v1/draft");
    record("After a Worker restart, a second session reads the saved price from D1", draft.status === 200 && draft.body.value.snapshot.entries.find((/** @type {any} */ entry) => entry.id === "two-month")?.values[PRICE_FIELD] === NEW_PRICE, { draftRevision: draft.body.value.draftRevision });
    const receipt = await call("/api/v1/operations/gate1-save");
    record("The receipt is private to its author (second session: 404)", receipt.status === 404, receipt.body);
    const stored = await call(`/api/v1/snapshots/${snapshotRecord.snapshotId}`);
    record("The snapshot survives the restart unchanged", stored.status === 200 && stored.body.value.snapshotId === snapshotRecord.snapshotId, { snapshotId: snapshotRecord.snapshotId });
  } finally {
    await stopWrangler(dev);
  }

  // Production entry (no fixture identity): everything fails closed.
  dev = await startWrangler([], "wrangler dev (production entry, unconfigured)");
  try {
    for (const pathname of ["/api/v1/draft", `/preview/${snapshotRecord.snapshotId}/`, "/editor/", "/assets/fonts/fonts.css"]) {
      const response = await call(pathname);
      record(`Unconfigured production entry answers 503 configuration-required for ${pathname}`, response.status === 503, response.body);
    }
  } finally {
    await stopWrangler(dev);
  }
  dev = await startWrangler(["--var", "TEAM_DOMAIN:https://pinsel.cloudflareaccess.com", "--var", "POLICY_AUD:gate1-aud", "--var", "EDITOR_ALLOWLIST:editor@example.test"], "wrangler dev (production entry, configured)");
  try {
    for (const pathname of ["/api/v1/draft", `/preview/${snapshotRecord.snapshotId}/`, "/editor/", "/assets/fonts/fonts.css"]) {
      const missing = await call(pathname);
      record(`Configured production entry answers 401 without an Access assertion for ${pathname}`, missing.status === 401, missing.body);
      const bogus = await call(pathname, { headers: { "cf-access-jwt-assertion": "not.a.jwt" } });
      record(`Configured production entry answers 403 for an invalid assertion on ${pathname}`, bogus.status === 403, bogus.body);
    }
  } finally {
    await stopWrangler(dev);
  }

  const snapshotFile = path.join(repoRoot, ".reports/gate1-snapshot.json");
  await writeFile(snapshotFile, `${JSON.stringify(snapshotRecord)}\n`);
  await writeFile(reportPath, `${JSON.stringify({ origin, snapshotId: snapshotRecord.snapshotId, newPrice: NEW_PRICE, steps }, null, 2)}\n`);
  console.log(`gate1 wrangler dev proof: ${steps.length} steps passed; snapshot saved to ${path.relative(repoRoot, snapshotFile)}; report ${path.relative(repoRoot, reportPath)}`);
} catch (error) {
  await writeFile(reportPath, `${JSON.stringify({ origin, steps, error: String(error) }, null, 2)}\n`);
  throw error;
}
