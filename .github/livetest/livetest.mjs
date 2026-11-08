// Owner-approved disposable live test (zudolab/pinsel thread, 2026-11-08). Lives only on
// the claude/pinsel-cf-credentials branch, never on main. Creates throwaway
// pinsel-livetest-* resources and deletes them in `cleanup`, which the workflow always runs.
// Usage: node .github/livetest/livetest.mjs setup|site|auth|access|cleanup
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const worker = path.join(root, "apps/authoring-worker");
const site = path.join(root, "apps/site");
const statePath = path.join(root, ".livetest-state.json");
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, GITHUB_RUN_ID = "local", GITHUB_RUN_ATTEMPT = "1" } = process.env;
if (!token || !account) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
const id = `${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`;
const names = { db: `pinsel-livetest-${id}`, site: `pinsel-livetest-site-${id}`, auth: `pinsel-livetest-auth-${id}` };
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { names, created: {} };
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cf(pathname, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ...body };
}
function wrangler(args, extraEnv = {}) {
  const run = spawnSync("pnpm", ["exec", "wrangler", ...args], { cwd: worker, encoding: "utf8", env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false", ...extraEnv } });
  const output = `${run.stdout}\n${run.stderr}`;
  console.log(output.replace(new RegExp(account, "g"), "<account>"));
  return { ok: run.status === 0, output };
}
const readJsonc = (file) => JSON.parse(readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, ""));
async function subdomain() { const r = await cf(`/accounts/${account}/workers/subdomain`); if (!r.success) throw new Error("workers.dev subdomain unreadable"); return r.result.subdomain; }
async function waitFor(url, predicate, label, timeoutMs = 120000) {
  const started = Date.now();
  let last = "no response";
  while (Date.now() - started < timeoutMs) {
    try { const response = await fetch(url, { redirect: "manual" }); const text = await response.text(); if (predicate(response, text)) return { response, text }; last = `${response.status}`; } catch (error) { last = String(error); }
    await sleep(3000);
  }
  throw new Error(`${label}: not ready after ${timeoutMs}ms (last ${last})`);
}
function finish() {
  const failed = results.filter((r) => !r.ok);
  const summary = [`### livetest ${process.argv[2]}`, "", "| check | result | detail |", "| --- | --- | --- |", ...results.map((r) => `| ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${String(r.detail).replace(/\|/g, "\\|").replace(new RegExp(account, "g"), "<account>")} |`), ""].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (failed.length) process.exitCode = 1;
}

async function setup() {
  const created = await cf(`/accounts/${account}/d1/database`, { method: "POST", body: JSON.stringify({ name: names.db }) });
  check("D1 create", created.success, created.success ? names.db : JSON.stringify(created.errors));
  const base = readJsonc(path.join(worker, "wrangler.jsonc"));
  const config = { ...base, name: names.auth, workers_dev: true, preview_urls: false };
  delete config.env; delete config.$schema;
  if (!created.success) {
    // Without D1 access the production entry is still deployed, unbound, to prove it fails closed before touching storage.
    delete config.d1_databases;
    writeFileSync(path.join(worker, "wrangler.livetest.json"), JSON.stringify(config, null, 2));
    return finish();
  }
  state.created.db = created.result.uuid; save();
  config.d1_databases = [{ binding: "DB", database_name: names.db, database_id: state.created.db, migrations_dir: "./migrations" }];
  writeFileSync(path.join(worker, "wrangler.livetest.json"), JSON.stringify(config, null, 2));
  const migrate = wrangler(["d1", "migrations", "apply", names.db, "--remote", "-c", "wrangler.livetest.json"]);
  check("remote D1 migrations apply", migrate.ok);
  const again = wrangler(["d1", "migrations", "apply", names.db, "--remote", "-c", "wrangler.livetest.json"]);
  check("remote D1 migrations are idempotent", again.ok && /No migrations to apply/i.test(again.output));
  const expected = readdirSync(path.join(worker, "migrations")).filter((f) => f.endsWith(".sql")).flatMap((f) => [...readFileSync(path.join(worker, "migrations", f), "utf8").matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)/gi)].map((m) => m[1]));
  const tables = await cf(`/accounts/${account}/d1/database/${state.created.db}/query`, { method: "POST", body: JSON.stringify({ sql: "SELECT name FROM sqlite_master WHERE type='table'" }) });
  const present = new Set((tables.result?.[0]?.results ?? []).map((row) => row.name));
  const missing = expected.filter((t) => !present.has(t));
  check("remote D1 has every migrated table", tables.success && missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : `${expected.length} tables`);
  const applied = await cf(`/accounts/${account}/d1/database/${state.created.db}/query`, { method: "POST", body: JSON.stringify({ sql: "SELECT name FROM d1_migrations ORDER BY id" }) });
  const files = readdirSync(path.join(worker, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  const appliedNames = (applied.result?.[0]?.results ?? []).map((row) => row.name);
  check("d1_migrations records the five files in order", JSON.stringify(appliedNames) === JSON.stringify(files), appliedNames.join(", "));
  finish();
}

function walk(dir, prefix = "") {
  return readdirSync(dir).flatMap((entry) => { const full = path.join(dir, entry); const rel = `${prefix}/${entry}`; return statSync(full).isDirectory() ? walk(full, rel) : [{ full, rel }]; });
}
async function siteChecks() {
  const config = { ...readJsonc(path.join(site, "wrangler.jsonc")), name: names.site, workers_dev: true, preview_urls: false };
  delete config.$schema;
  writeFileSync(path.join(site, "wrangler.livetest.json"), JSON.stringify(config, null, 2));
  state.created.site = names.site; save();
  const deploy = wrangler(["deploy", "-c", "../site/wrangler.livetest.json"]);
  check("site Worker upload to workers.dev", deploy.ok);
  if (!deploy.ok) return finish();
  const origin = `https://${names.site}.${await subdomain()}.workers.dev`;
  await waitFor(`${origin}/`, (r) => r.status === 200, "site");
  const files = walk(path.join(site, "dist"));
  const pages = files.filter((f) => f.rel.endsWith("/index.html")).map((f) => f.rel.replace(/index\.html$/, ""));
  let badPages = [];
  for (const page of pages) {
    const response = await fetch(`${origin}${page}`, { redirect: "manual" });
    const text = await response.text();
    if (response.status !== 200 || !/noindex/.test(text)) badPages.push(`${page} ${response.status}`);
  }
  check("every HTML route answers 200 with noindex", badPages.length === 0, badPages.length ? badPages.slice(0, 10).join(", ") : `${pages.length} routes`);
  const assets = files.filter((f) => !f.rel.endsWith(".html"));
  const badAssets = [];
  for (let i = 0; i < assets.length; i += 8) {
    await Promise.all(assets.slice(i, i + 8).map(async (asset) => {
      const response = await fetch(`${origin}${asset.rel}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const same = createHash("sha256").update(bytes).digest("hex") === createHash("sha256").update(readFileSync(asset.full)).digest("hex");
      if (response.status !== 200 || !same) badAssets.push(`${asset.rel} ${response.status}${same ? "" : " bytes differ"}`);
    }));
  }
  check("every emitted asset is served byte-exact", badAssets.length === 0, badAssets.length ? badAssets.slice(0, 10).join(", ") : `${assets.length} files`);
  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  check("robots.txt disallows everything", /Disallow:\s*\/\s*$/m.test(robots));
  const missing = await fetch(`${origin}/__livetest-missing/`);
  check("unknown path answers 404 with the 404 page", missing.status === 404 && (await missing.text()).length > 0, `${missing.status}`);
  const sample = pages.find((p) => p !== "/");
  if (sample) { const r = await fetch(`${origin}${sample.replace(/\/$/, "")}`, { redirect: "manual" }); check("auto-trailing-slash redirects", [301, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").endsWith(sample), `${sample.replace(/\/$/, "")} → ${r.status} ${r.headers.get("location")}`); }
  const excluded = ["/content.json", "/expected-content.json", "/page-manifest.json", "/font-provenance.json", "/check-content.py", "/__zfb/routes.json", "/source-content/", "/provenance/"];
  const leaked = [];
  for (const p of excluded) { const r = await fetch(`${origin}${p}`, { redirect: "manual" }); if (r.status === 200 && !(await r.text()).includes("404")) leaked.push(`${p} ${r.status}`); }
  check("public-output exclusions are not served", leaked.length === 0, leaked.join(", "));
  finish();
}

function deployAuth(vars = {}) {
  state.created.auth = names.auth; save();
  return wrangler(["deploy", "-c", "wrangler.livetest.json", ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])]);
}
async function authChecks() {
  const deploy = deployAuth();
  check(`authoring Worker upload (production entry, ${state.created.db ? "real D1 binding" : "NO D1 binding: token lacks D1"})`, deploy.ok);
  if (!deploy.ok) return finish();
  const origin = `https://${names.auth}.${await subdomain()}.workers.dev`;
  await waitFor(`${origin}/api/hosted/config`, (r) => r.status !== 404 && r.status < 520, "authoring");
  for (const p of ["/", "/editor/", "/api/hosted/config", "/api/hosted/state", "/preview/"]) {
    // A fresh workers.dev script can still answer 404 from some edge locations for a short while.
    let r, text;
    for (let i = 0; i < 20; i++) { r = await fetch(`${origin}${p}`, { redirect: "manual" }); text = await r.text(); if (r.status !== 404) break; await sleep(3000); }
    check(`unconfigured ${p} fails closed`, r.status === 503 && text.includes("configuration-required"), `${r.status} ${text.slice(0, 80)}`);
  }
  const forged = await fetch(`${origin}/api/hosted/config`, { headers: { "cf-access-jwt-assertion": "eyJhbGciOiJSUzI1NiJ9.e30.x" } });
  check("forged Access header without config still 503", forged.status === 503, `${forged.status}`);
  finish();
}

async function accessChecks() {
  const org = await cf(`/accounts/${account}/access/organizations`);
  if (!org.success || !org.result?.auth_domain) { check("Access organization readable", false, `NOT TESTED: ${JSON.stringify(org.errors ?? [])}`); return finish(); }
  const sub = await subdomain();
  const host = `${names.auth}.${sub}.workers.dev`;
  const tokenResult = await cf(`/accounts/${account}/access/service_tokens`, { method: "POST", body: JSON.stringify({ name: names.auth, duration: "8760h" }) });
  check("Access service token create", tokenResult.success, JSON.stringify(tokenResult.errors ?? []));
  if (!tokenResult.success) return finish();
  state.created.serviceToken = tokenResult.result.id; save();
  const policy = { name: "livetest service token", decision: "non_identity", include: [{ service_token: { token_id: tokenResult.result.id } }], precedence: 1 };
  let app = await cf(`/accounts/${account}/access/apps`, { method: "POST", body: JSON.stringify({ name: names.auth, domain: host, type: "self_hosted", session_duration: "1h", policies: [policy] }) });
  if (!app.success) app = await cf(`/accounts/${account}/access/apps`, { method: "POST", body: JSON.stringify({ name: names.auth, domain: host, type: "self_hosted", session_duration: "1h" }) });
  check("Access application for the workers.dev host", app.success, app.success ? "" : JSON.stringify(app.errors));
  if (!app.success) return finish();
  state.created.accessApp = app.result.id; save();
  if (!(app.result.policies ?? []).length) { const p = await cf(`/accounts/${account}/access/apps/${app.result.id}/policies`, { method: "POST", body: JSON.stringify(policy) }); check("Access policy attach", p.success, JSON.stringify(p.errors ?? [])); }
  const deploy = deployAuth({ TEAM_DOMAIN: `https://${org.result.auth_domain}`, POLICY_AUD: app.result.aud, EDITOR_ALLOWLIST: "livetest-editor@example.test" });
  check("authoring Worker redeploy with Access launch inputs", deploy.ok);
  const origin = `https://${host}`;
  const creds = { "cf-access-client-id": tokenResult.result.client_id, "cf-access-client-secret": tokenResult.result.client_secret };
  const passed = await waitFor(`${origin}/api/hosted/config`, (r) => r.status !== 503, "access edge", 180000).catch((e) => ({ error: e }));
  const anonymous = await fetch(`${origin}/editor/`, { redirect: "manual" });
  const anonText = await anonymous.text();
  const fromWorker = (anonymous.headers.get("content-type") ?? "").includes("application/json");
  check("anonymous request is stopped by Access before the Worker", [302, 401, 403].includes(anonymous.status) && !fromWorker, `${anonymous.status} ${anonymous.headers.get("content-type")} ${anonymous.headers.get("location")?.split("?")[0] ?? ""}${passed.error ? " (edge wait timed out)" : ""} ${anonText.replace(/\s+/g, " ").slice(0, 120)}`);
  let service;
  for (let i = 0; i < 20; i++) { service = await fetch(`${origin}/api/hosted/config`, { headers: creds, redirect: "manual" }); if (service.status === 403) break; await sleep(3000); }
  const serviceText = await service.text();
  check("service-token JWT reaches the Worker and is verified (JWKS + AUD), then refused as not allowlisted", service.status === 403 && serviceText.includes("not-allowed"), `${service.status} ${serviceText.slice(0, 120)}`);
  const badAud = deployAuth({ TEAM_DOMAIN: `https://${org.result.auth_domain}`, POLICY_AUD: "wrong-aud-livetest", EDITOR_ALLOWLIST: "livetest-editor@example.test" });
  let wrong;
  for (let i = 0; i < 20; i++) { wrong = await fetch(`${origin}/api/hosted/config`, { headers: creds, redirect: "manual" }); const t = await wrong.clone().text(); if (wrong.status === 401 || (wrong.status === 403 && !t.includes("not-allowed"))) break; await sleep(3000); }
  const wrongText = await wrong.text();
  check("a valid Access JWT for another AUD is rejected", badAud.ok && wrong.status >= 400 && wrong.status !== 503 && !wrongText.includes("not-allowed") && !wrongText.includes("actorId"), `${wrong.status} ${wrongText.slice(0, 120)}`);
  finish();
}

async function cleanup() {
  const { created } = state;
  for (const scriptName of [created.site, created.auth].filter(Boolean)) {
    const r = await cf(`/accounts/${account}/workers/scripts/${scriptName}?force=true`, { method: "DELETE" });
    check(`delete Worker ${scriptName}`, r.success || r.status === 404, `${r.status}`);
  }
  if (created.accessApp) { const r = await cf(`/accounts/${account}/access/apps/${created.accessApp}`, { method: "DELETE" }); check("delete Access application", r.success || r.status === 404, `${r.status}`); }
  if (created.serviceToken) { const r = await cf(`/accounts/${account}/access/service_tokens/${created.serviceToken}`, { method: "DELETE" }); check("delete Access service token", r.success || r.status === 404, `${r.status}`); }
  if (created.db) { const r = await cf(`/accounts/${account}/d1/database/${created.db}`, { method: "DELETE" }); check("delete D1 database", r.success || r.status === 404, `${r.status}`); }
  const scripts = await cf(`/accounts/${account}/workers/scripts`);
  const left = (scripts.result ?? []).map((s) => s.id).filter((n) => n.startsWith("pinsel-livetest-"));
  check("no pinsel-livetest Workers remain", scripts.success && left.length === 0, left.join(", "));
  const dbs = await cf(`/accounts/${account}/d1/database?name=pinsel-livetest`);
  if (!dbs.success && !created.db) { check("D1 leftovers", true, "none created (token cannot read D1)"); return finish(); }
  const leftDb = (dbs.result ?? []).map((d) => d.name).filter((n) => n.startsWith("pinsel-livetest-"));
  check("no pinsel-livetest D1 databases remain", dbs.success && leftDb.length === 0, leftDb.join(", "));
  finish();
}

// Points the browser lanes' `--env local` D1 binding at the throwaway remote database.
async function remoteEditor() {
  if (!state.created.db) { check("editor lane on real D1", false, "NOT TESTED: no remote D1"); return finish(); }
  const file = path.join(worker, "wrangler.jsonc");
  const config = readJsonc(file);
  config.env.local.d1_databases = [{ binding: "DB", database_name: "pinsel-authoring", database_id: state.created.db, migrations_dir: "./migrations", remote: true }];
  writeFileSync(file, JSON.stringify(config, null, 2));
  check("browser lane bound to remote D1", true, names.db);
  finish();
}

async function remoteEditorProof() {
  const q = async (sql) => (await cf(`/accounts/${account}/d1/database/${state.created.db}/query`, { method: "POST", body: JSON.stringify({ sql }) })).result?.[0]?.results?.[0];
  const revisions = await q("SELECT COUNT(*) AS n FROM pinsel_hosted_revision");
  const head = await q("SELECT COUNT(*) AS n FROM pinsel_hosted_head");
  check("hosted.spec writes landed in the remote D1 (revisions)", Number(revisions?.n) >= 55, `${revisions?.n} revisions`);
  check("Hosted Content head was seeded on the remote D1", Number(head?.n) >= 1, `${head?.n} head row(s)`);
  finish();
}

const phase = { "remote-editor-proof": remoteEditorProof, "remote-editor": remoteEditor, setup, site: siteChecks, auth: authChecks, access: accessChecks, cleanup }[process.argv[2]];
if (!phase) throw new Error("phase: setup|site|auth|access|cleanup");
await phase().catch((error) => { check(`${process.argv[2]} crashed`, false, String(error?.message ?? error)); finish(); });
