import assert from "node:assert/strict";
import { constants } from "node:fs";
import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { readCommittedEntries } from "../lib/committed-entries.mjs";
import { committedAmounts, editPrices } from "../lib/edit-prices.mjs";
import { createHarness, migrate, prerequisites, sanitize, startWorker, workerConfig } from "./local-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const reportIndex = argv.indexOf("--report");
const reportPath = path.resolve(root, reportIndex < 0 ? ".reports/publication-rehearsal.json" : (argv[reportIndex + 1] ?? ""));
if (reportIndex >= 0 && !argv[reportIndex + 1]) throw new Error("--report needs a path");
const h = await createHarness("publication", reportPath);
const checkout = path.join(h.work, "checkout");
const persist = path.join(h.work, "d1");
const gitEnv = { GIT_AUTHOR_NAME: "Local rehearsal", GIT_AUTHOR_EMAIL: "rehearsal@example.test", GIT_COMMITTER_NAME: "Local rehearsal", GIT_COMMITTER_EMAIL: "rehearsal@example.test", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
const git = (/** @type {string[]} */ args, cwd = checkout) => h.run("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd, env: gitEnv });
/** @param {...string} args */
const pnpm = (...args) => h.run("corepack", ["pnpm", ...args], { cwd: checkout, timeout: 180_000 });
/** @param {...string} args */
const check = (...args) => h.run(process.execPath, ["scripts/publication/check-snapshot.mjs", ...args], { cwd: checkout });
const reject = (/** @type {string[]} */ args, /** @type {RegExp} */ pattern) => h.run(process.execPath, ["scripts/publication/check-snapshot.mjs", ...args], { cwd: checkout, rejects: pattern });
const result = (/** @type {string} */ probe) => { h.report.results.push({ probe, ok: true }); console.log(`PASS ${probe}`); };

async function main() {
  await prerequisites(root);
  const sourceSha = await git(["rev-parse", "HEAD"], root);
  assert.equal(await git(["status", "--porcelain", "--untracked-files=no"], root), "", "Commit tracked source changes before rehearsing an exact Git baseline");
  h.report.sourceSha = sourceSha;
  // A detached local clone has no worktree registration to strand on interruption.
  await git(["clone", "--shared", "--no-checkout", "--", root, checkout], root);
  await git(["remote", "remove", "origin"]);
  await git(["checkout", "--detach", sourceSha]);
  const modules = ["node_modules"];
  for (const group of ["apps", "packages"]) {
    for (const entry of await readdir(path.join(root, group), { withFileTypes: true })) {
      if (entry.isDirectory()) modules.push(`${group}/${entry.name}/node_modules`);
    }
  }
  // Copy the frozen install, preserving relative pnpm workspace links. Symlinking
  // node_modules back to the caller would resolve @pinsel/content to its baseline.
  for (const relative of modules) {
    await cp(path.join(root, relative), path.join(checkout, relative), { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
    h.checkSignal();
  }
  await pnpm("no-deploy:check");
  await pnpm("assets:sync");
  await pnpm("content:assemble");
  // Reuse the built editor; only the existing asset assembler writes Worker assets.
  await cp(path.join(root, "apps/editor/dist"), path.join(checkout, "apps/editor/dist"), { recursive: true });
  await pnpm("assets:assemble-worker");
  const baseline = JSON.parse(await readFile(path.join(checkout, "packages/pinsel-content/.site-project/baseline.json"), "utf8"));
  assert.equal(baseline.baselineRevision, sourceSha);
  h.report.baseline = baseline;
  const config = await workerConfig(checkout, path.join(h.work, "worker"), { fixture: true });
  await migrate(h, checkout, config, persist);
  const worker = await startWorker(h, checkout, config, persist, { failStartup: argv.includes("--fail-startup") });
  /** @param {string} route @param {string} method @param {unknown} [body] @param {string} [id] */
  async function api(route, method = "GET", body, id) {
    const answer = await h.request(`${worker.origin}${route}`, { method, headers: { accept: "application/json", ...(body ? { "content-type": "application/json", origin: worker.origin } : {}), ...(id ? { "idempotency-key": id } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(answer.status, 200, `${method} ${route}: HTTP ${answer.status}`);
    const parsed = JSON.parse(answer.body);
    assert.equal(parsed.status, "ok", `${method} ${route}: ${parsed.status}`);
    h.report.commands.push({ command: `${method} ${route}`, exit: 0 });
    return parsed;
  }
  if (argv.includes("--fail-request")) {
    await worker.stop();
    await api("/api/v1/site");
    throw new Error("Induced request failure unexpectedly succeeded");
  }
  const site = await api("/api/v1/site");
  assert.equal(site.baselineRevision, sourceSha);
  const entries = readCommittedEntries(checkout);
  const price = editPrices(committedAmounts(entries, "course-price"))(1);
  const answer = `【ローカル検証 ${randomUUID()}】出願時期は大学ごとに異なります。`;
  const homeFaqs = entries.filter((entry) => entry.modelId === "home-faq");
  /** @param {string} model @param {string} id @param {Record<string, string>} values */
  async function save(model, id, values) {
    const draft = (await api("/api/v1/draft")).value;
    await api(`/api/v1/content/${model}/${id}`, "PUT", { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values }, randomUUID());
  }
  await save("course", "two-month", { "course-price": price });
  await save("faq-item", "faq-exam-01", { "faq-item-answer": answer });
  const draft = (await api("/api/v1/draft")).value;
  const snapshot = (await api("/api/v1/snapshots", "POST", { expectedDraftRevision: draft.draftRevision })).value;
  assert.equal(snapshot.baselineRevision, sourceSha);
  assert.equal(snapshot.draftRevision, draft.draftRevision);
  const captured = JSON.stringify(snapshot);
  await save("course", "two-month", { "course-price": editPrices(committedAmounts(entries, "course-price"))(2) });
  assert.equal(JSON.stringify((await api(`/api/v1/snapshots/${snapshot.snapshotId}`)).value), captured);
  result("saved snapshot remains immutable after a later draft edit");
  await worker.stop();
  const snapshotPath = path.join(h.work, "snapshot.json");
  await writeFile(snapshotPath, captured);
  await pnpm("exec", "tsx", "scripts/publication/write-snapshot-files.ts", snapshotPath);
  await git(["add", "--", "content"]);
  const tree = await git(["write-tree"]);
  const head = await git(["commit-tree", tree, "-p", sourceSha, "-m", "content: local publication rehearsal (never pushed)"]);
  await git(["checkout", "--detach", head]);
  const recordPath = path.join(checkout, "content/snapshot.json");
  const recordText = await readFile(recordPath, "utf8");
  const record = JSON.parse(recordText);
  h.report.identity = { sourceSha, contentHead: head, ...record };
  await check("paths", "--base", sourceSha, "--head", head);
  await check("record", "--head", head);
  await pnpm("assets:sync");
  await pnpm("content:validate");
  await pnpm("content:assemble");
  await check("digest");
  await pnpm("content:project");
  await pnpm("--filter", "@pinsel/site", "exec", "zfb", "check");
  await pnpm("build:site");
  await h.run(process.execPath, ["scripts/content/check-publication.mjs", "--dist", "apps/site/dist", "--snapshot", snapshotPath], { cwd: checkout });
  await h.run(process.execPath, ["scripts/publication/check-public-output.mjs", "--dist", "apps/site/dist"], { cwd: checkout });
  await pnpm("content:check");
  await pnpm("site:check-fragments");
  await pnpm("assets:verify");
  await pnpm("check:approved-seed");
  const identityPath = path.join(h.work, "identity.md");
  await check("report", "--head", head, "--out", identityPath);
  h.report.identityReport = await readFile(identityPath, "utf8");
  const home = await readFile(path.join(checkout, "apps/site/dist/index.html"), "utf8");
  const lessons = await readFile(path.join(checkout, "apps/site/dist/lessons/index.html"), "utf8");
  const faq = await readFile(path.join(checkout, "apps/site/dist/faq/index.html"), "utf8");
  for (const [route, html, value] of /** @type {[string, string, string][]} */ ([["/", home, price], ["/lessons/", lessons, price], ["/faq/", faq, answer]])) {
    assert.ok(html.includes(value), `${route} must contain the saved edit`);
    result(`saved edit in complete ${route} page`);
  }
  assert.ok(!home.includes(answer), "Detail FAQ must not replace a separately authored home FAQ");
  assert.deepEqual(readCommittedEntries(checkout).filter((entry) => entry.modelId === "home-faq"), homeFaqs);
  result("home/detail FAQ records remain distinct; real publication validators passed");

  const forbidden = "rehearsal-forbidden.config";
  await writeFile(path.join(checkout, forbidden), "forbidden path negative control\n");
  await git(["add", "--", forbidden]);
  const badTree = await git(["write-tree"]);
  const badHead = await git(["commit-tree", badTree, "-p", sourceSha, "-m", "local forbidden path negative control"]);
  await reject(["paths", "--base", sourceSha, "--head", badHead], /outside the publish allowlist/);
  await rm(path.join(checkout, forbidden));
  await git(["update-index", "--force-remove", forbidden]);
  result("existing allowlist rejects a forbidden config path");
  try {
    await writeFile(recordPath, JSON.stringify({ ...record, snapshotId: "0".repeat(64), contentDigest: "0".repeat(64) }));
    await reject(["digest"], /the committed entries are not that snapshot/);
    await writeFile(recordPath, JSON.stringify({ ...record, baselineGitSha: "0".repeat(40) }));
    await reject(["record", "--head", head], /must be one commit on top of the recorded base/);
  } finally { await writeFile(recordPath, recordText); }
  await check("record", "--head", head);
  await check("digest");
  result("tampered digest and baseline refused; restored permitted edit passes");
  assert.equal(await git(["status", "--porcelain", "--untracked-files=no"]), "");
}

let failure;
try { await main(); } catch (error) { failure = error; console.error(sanitize(String(error))); }
await h.finish(failure);
