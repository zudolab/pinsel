import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { editPrice, repoRoot, startLocalWorker, type LocalWorker } from "./local-worker";

// #18 adversarial confirm pass of the hosted CMS slice against
// `wrangler dev --env local` (workerd + local D1, the in-memory fake
// publisher driven through the local-only /admin/fake-publisher):
// persistence across a Worker restart, preview identity, forbidden writes,
// concurrency and idempotency, snapshot immutability, and the publication
// state machine with the editor's Japanese labels. Results and the edited
// snapshot for the static build land in .reports/cms-confirm/ (see
// docs/verification/cms.md). Prerequisites: `pnpm content:assemble &&
// pnpm build:editor && pnpm assets:assemble-worker`. Heavy: run through
// heavy-guard, e.g. `pnpm exec playwright test tests/browser/cms-confirm.spec.ts`.
//
// The external-change step temporarily rewrites content/entries/course/four-month.json
// and re-assembles under a fabricated baseline sha; afterAll restores both.

const port = Number(process.env.PINSEL_CMS_CONFIRM_PORT ?? 8853);
const reports = path.join(repoRoot, ".reports/cms-confirm");
const PRICE = "#content-entry-course-price";
const ANSWER = "#content-entry-faq-item-answer";
const NEW_PRICE = editPrice(8);
const FAQ_ID = "faq-exam-01";
const FAQ_QUESTION = "ドイツの美術大学の受験時期はいつ頃ですか？";
const NEW_ANSWER = "【確認用】出願時期は大学ごとに異なります。最新の日程は各大学の公式サイトで確認してください。";
const NEWER_ANSWER = "【確認用・改訂】出願時期は大学ごとに異なるため、志望校の公式サイトで最新の日程を確認しましょう。";
const EXTERNAL_SHA = "e".repeat(40);
const EXTERNAL_UNIT = "全8回（月2回）・外部変更";
const FOUR_MONTH_FILE = path.join(repoRoot, "content/entries/course/four-month.json");
const run = promisify(execFile);

// The editor's labels, written out independently of apps/editor/src/publication.ts.
const LABELS: Record<string, string> = {
  submitted: "公開申請済み",
  building: "ビルド中",
  validated: "検証済み",
  integrated: "反映済み",
  failed: "失敗",
  conflict: "公開内容の競合",
  "configuration-required": "設定が必要",
};
const GREEN = (commit: string) => ({ evidence: { commit, pr: "https://github.com/example/pinsel/pull/1", checks: [{ name: "content-validate", status: "passed" }] } });

let worker: LocalWorker;
let origin = "";
let originalFourMonth: string | null = null;
const evidence: Record<string, unknown> = {};
const labelsSeen: { state: string; label: string }[] = [];

type Json = Record<string, any>;

async function api(route: string, init: { method?: string; json?: unknown; headers?: Record<string, string> } = {}): Promise<{ status: number; body: Json }> {
  const method = init.method ?? (init.json === undefined ? "GET" : "POST");
  const headers: Record<string, string> = { accept: "application/json", ...(init.json === undefined ? {} : { "content-type": "application/json", origin }), ...init.headers };
  const response = await fetch(`${origin}${route}`, { method, headers, body: init.json === undefined ? undefined : JSON.stringify(init.json) });
  const text = await response.text();
  let body: Json = {};
  try {
    body = JSON.parse(text) as Json;
  } catch {
    body = { text };
  }
  return { status: response.status, body };
}

async function draft(): Promise<Json> {
  const answer = await api("/api/v1/draft");
  expect(answer.body.status).toBe("ok");
  return answer.body.value;
}

function valueOf(state: Json, modelId: string, entryId: string, field: string): unknown {
  return state.snapshot.entries.find((entry: Json) => entry.modelId === modelId && entry.id === entryId)?.values[field];
}

async function put(modelId: string, entryId: string, values: Record<string, unknown>, key: string, state?: Json, extra: Record<string, unknown> = {}) {
  const current = state ?? (await draft());
  return api(`/api/v1/content/${encodeURIComponent(modelId)}/${encodeURIComponent(entryId)}`, { method: "PUT", headers: { "idempotency-key": key }, json: { expectedRevision: current.draftRevision, expectedBaselineRevision: current.baselineRevision, values, ...extra } });
}

async function snapshotNow(): Promise<Json> {
  const current = await draft();
  const answer = await api("/api/v1/snapshots", { json: { expectedDraftRevision: current.draftRevision } });
  expect(answer.body.status, JSON.stringify(answer.body)).toBe("ok");
  return answer.body.value;
}

async function fakeDriver(action: "script" | "advance", json: Json) {
  const answer = await api(`/admin/fake-publisher/${action}`, { json });
  expect(answer.status, JSON.stringify(answer.body)).toBe(200);
}

async function fakeSubmissions(): Promise<Json> {
  return (await api("/admin/fake-publisher")).body.value;
}

async function openEditor(browser: Browser, lastPublication?: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 960 } });
  // The host side records every frameLoadId a preview document announced, so a test can forge acks with a real one.
  await context.addInitScript(() => {
    if (window.top !== window) return;
    const loads: string[] = [];
    Object.assign(window, { __previewLoads: loads });
    window.addEventListener("message", (event) => {
      if (event.data?.channel === "zudo-composer-host-preview" && event.data.type === "ready") loads.push(event.data.frameLoadId);
    });
  });
  if (lastPublication) await context.addInitScript((id) => localStorage.setItem("pinsel-editor:last-publication", id), lastPublication);
  const page = await context.newPage();
  await page.goto("/editor/");
  await expect(page.getByTestId("save-status")).toHaveText(/保存済み/, { timeout: 30_000 });
  return page;
}

async function openEntry(page: Page, group: string, modelCard: string, entryText: string, field: string): Promise<void> {
  await page.getByRole("button", { name: group, exact: true }).click();
  // Inside an already open group the entry navigator is showing instead of the model directory.
  const card = page.locator(".sg-content-model-card", { hasText: modelCard });
  const entry = page.getByText(entryText, { exact: false }).first();
  await expect(card.or(entry).first()).toBeVisible();
  if (await card.isVisible()) await card.click();
  await entry.click();
  await expect(page.locator(field)).toBeVisible();
}

async function setField(page: Page, field: string, value: string): Promise<void> {
  await page.locator(field).fill(value);
  await page.locator(field).blur();
  // flush() resolves on the durable receipt and rejects on a conflict or failure; the status line is asserted by the caller.
  await page.evaluate(() => (window as unknown as { __pinselEditor: { flush(): Promise<void> } }).__pinselEditor.flush()).catch(() => undefined);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(reports, `${name}.png`) });
}

async function expectPublicationLabel(page: Page, state: string): Promise<void> {
  const status = page.getByTestId("publication-status");
  await expect(status).toHaveAttribute("data-publication-state", state, { timeout: 15_000 });
  await expect(status).toContainText(`公開状況: ${LABELS[state]}`);
  await expect(page.locator("body")).not.toContainText("公開中");
  labelsSeen.push({ state, label: (await status.locator("span").first().textContent()) ?? "" });
}

async function refreshPublication(page: Page, state: string): Promise<void> {
  await page.getByTestId("publication-status").getByRole("button", { name: "状況を更新" }).click();
  await expectPublicationLabel(page, state);
}

async function assemble(env: Record<string, string> = {}): Promise<void> {
  await run("corepack", ["pnpm", "--filter", "@pinsel/content", "content:assemble"], { cwd: repoRoot, env: { ...process.env, ...env } });
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await mkdir(reports, { recursive: true });
  worker = await startLocalWorker({ port, stateDir: "cms-confirm-state", vars: { PUBLISHER_PROVIDER: "fake" } });
  origin = worker.origin;
});

test.afterAll(async () => {
  test.setTimeout(180_000);
  await worker?.stop();
  if (originalFourMonth !== null) {
    await writeFile(FOUR_MONTH_FILE, originalFourMonth);
    await assemble();
  }
  await writeFile(path.join(reports, "results.json"), `${JSON.stringify({ evidence, labelsSeen }, null, 2)}\n`);
});

test("1. a price and a FAQ answer persist across a Worker restart; the preview acknowledges only the exact revision", async ({ browser }) => {
  const page = await openEditor(browser);
  const operations: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/v1/operations")) operations.push(JSON.parse(request.postData() ?? "{}").operationId);
  });
  await openEntry(page, "コースと料金", "コース・料金", "2ヶ月コース", PRICE);
  await setField(page, PRICE, NEW_PRICE);
  await expect(page.getByTestId("save-status")).toHaveText("保存済み（改訂 2）", { timeout: 30_000 });
  const receipt = await api(`/api/v1/operations/${operations.at(-1)}`);
  expect(receipt.status).toBe(200);
  evidence.priceReceipt = { operationId: operations.at(-1), body: receipt.body };
  // An immutable capture of revision 2 (price only) for the snapshot checks of test 4.
  const before = await snapshotNow();
  evidence.revision2Snapshot = before.snapshotId;
  await writeFile(path.join(reports, "snapshot-revision-2.json"), JSON.stringify(before));

  await openEntry(page, "よくある質問", "/faq/ の質問と回答", FAQ_QUESTION, ANSWER);
  await setField(page, ANSWER, NEW_ANSWER);
  await expect(page.getByTestId("save-status")).toHaveText("保存済み（改訂 3）", { timeout: 30_000 });
  await shot(page, "01-saved-faq-answer");
  await page.context().close();

  await worker.restart();
  const second = await openEditor(browser);
  await openEntry(second, "コースと料金", "コース・料金", "2ヶ月コース", PRICE);
  await expect(second.locator(PRICE)).toHaveValue(NEW_PRICE);
  await openEntry(second, "よくある質問", "/faq/ の質問と回答", FAQ_QUESTION, ANSWER);
  await expect(second.locator(ANSWER)).toHaveValue(NEW_ANSWER);
  const persisted = await draft();
  expect(persisted.draftRevision).toBe(3);
  expect(valueOf(persisted, "course", "two-month", "course-price")).toBe(NEW_PRICE);
  expect(valueOf(persisted, "faq-item", FAQ_ID, "faq-item-answer")).toBe(NEW_ANSWER);

  // Preview of the FAQ page at revision 3.
  await second.getByTestId("route-select").selectOption("/faq/");
  await openEntry(second, "よくある質問", "/faq/ の質問と回答", FAQ_QUESTION, ANSWER);
  await second.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(second.getByTestId("preview-status")).toHaveText("表示中: 改訂 3", { timeout: 30_000 });
  const frame = second.frameLocator(".sg-hosted-content-editor__frame");
  await expect(frame.locator("body")).toContainText(NEW_ANSWER);
  const previewFrame = second.frames().find((candidate) => /\/preview\/[0-9a-f]{64}\/faq\/\?revision=3$/.test(candidate.url()));
  expect(previewFrame, second.frames().map((candidate) => candidate.url()).join(", ")).toBeTruthy();
  evidence.previewRevision3 = previewFrame!.url();
  await shot(second, "01-preview-faq-revision-3");

  // Revision 4, with the frame's navigation to it held back: while it is pending,
  // the old revision-3 document acknowledges `rendered` for revision 3 (and for
  // the revision-2 snapshot). The editor must not show either as the current render.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await second.route(/\/preview\/[0-9a-f]{64}\/faq\/\?revision=4$/, async (route) => {
    await held;
    await route.continue();
  });
  await setField(second, ANSWER, NEWER_ANSWER);
  await expect(second.getByTestId("save-status")).toHaveText("保存済み（改訂 4）", { timeout: 30_000 });
  await second.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect.poll(() => second.evaluate(() => (window as any).__pinselEditor.state.preview.status)).toBe("pending");
  const site = (await api("/api/v1/site")).body;
  // The revision-3 document's own load id: its ready was the last one the host saw before the held navigation.
  const oldLoad = await second.evaluate(() => (window as any).__previewLoads.at(-1) as string);
  const injected = await previewFrame!.evaluate(
    ({ pack, stale, oldLoad }) => {
      const base = { channel: "zudo-composer-host-preview", v: 1, packId: pack.packId, packVersion: pack.packVersion };
      const self = location.pathname.split("/")[2];
      const messages = [
        { ...base, type: "rendered", snapshotId: self, revision: 3, route: "/faq/", frameLoadId: oldLoad },
        { ...base, type: "rendered", snapshotId: stale, revision: 2, route: "/faq/", frameLoadId: oldLoad },
        // Right revision, but not from the load the request went to.
        { ...base, type: "rendered", snapshotId: self, revision: 4, route: "/faq/", frameLoadId: oldLoad },
        { ...base, type: "rendered", snapshotId: self, revision: 4, route: "/faq/", frameLoadId: "forged-load" },
      ];
      for (const message of messages) parent.postMessage(message, location.origin);
      return messages.length;
    },
    { pack: site.pack, stale: before.snapshotId, oldLoad },
  );
  expect(injected).toBe(4);
  await second.waitForTimeout(1000);
  const pending = await second.evaluate(() => (window as any).__pinselEditor.state.preview);
  expect(pending.status, JSON.stringify(pending)).toBe("pending");
  expect(pending.request.revision).toBe(4);
  await expect(second.getByTestId("preview-status")).not.toHaveText(/表示中/);
  evidence.staleAcksIgnored = { injected, oldLoad, previewWhileHeld: pending };
  release();
  await expect(second.getByTestId("preview-status")).toHaveText("表示中: 改訂 4", { timeout: 30_000 });
  await expect(frame.locator("body")).toContainText(NEWER_ANSWER);
  await shot(second, "01-preview-faq-revision-4");

  // The home pricing cards carry the saved price in the same preview mechanism.
  await second.getByTestId("route-select").selectOption("/");
  await openEntry(second, "コースと料金", "コース・料金", "2ヶ月コース", PRICE);
  await second.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(second.getByTestId("preview-status")).toHaveText("表示中: 改訂 4", { timeout: 30_000 });
  await expect(frame.locator("article.pricing-card .price").nth(1)).toHaveText(new RegExp(NEW_PRICE));
  await shot(second, "01-preview-home-price");
  await second.context().close();

  const edited = await snapshotNow();
  evidence.editedSnapshot = { snapshotId: edited.snapshotId, draftRevision: edited.draftRevision, baselineRevision: edited.baselineRevision };
  await writeFile(path.join(reports, "snapshot-edited.json"), JSON.stringify(edited));
});

test("2. forbidden writes get typed refusals and change nothing", async ({ browser }) => {
  const state = await draft();
  const cases: { name: string; send: () => Promise<{ status: number; body: Json }>; status: number; code: string }[] = [
    { name: "note slug", send: () => put("note", "exam-schedule", { "note-slug": "renamed" }, "f-slug", state), status: 422, code: "forbidden" },
    { name: "course order outside reorder", send: () => put("course", "two-month", { "course-order": 9 }, "f-order", state), status: 422, code: "forbidden" },
    { name: "site-copy brand word (read-only field)", send: () => put("site-copy", "site-copy", { "site-copy-brand-word": "X" }, "f-brand", state), status: 422, code: "forbidden" },
    { name: "nav-link href (read-only field)", send: () => put("nav-link", "nav-about", { "nav-link-href": "https://evil.example/" }, "f-href", state), status: 422, code: "forbidden" },
    { name: "structure record (composition) as a model", send: () => put("compositions", "about", { document: {} }, "f-structure", state), status: 422, code: "forbidden" },
    { name: "mapping record as a model", send: () => put("mapping-filesystem", "about-cv", { document: {} }, "f-mapping", state), status: 422, code: "forbidden" },
    { name: "component id as a model", send: () => put("pinsel.pricing-card", "x", { price: "¥1" }, "f-component", state), status: 422, code: "malformed-request" },
    { name: "component id as a field", send: () => put("course", "two-month", { component: "pinsel.raw-html" }, "f-component-field", state), status: 422, code: "unknown-field" },
    {
      name: "structure write through the operation API (other provider)",
      send: () => api("/api/v1/operations", { json: { operationId: "f-provider", expectedBaselineRevision: state.baselineRevision, request: { kind: "put-entry-values", projectId: "pinsel", providerId: "files", modelId: "about", entryId: "about", expectedRevision: state.draftRevision, values: { document: {} } } } }),
      status: 422,
      code: "",
    },
    { name: "markdown with <script>", send: () => put("note", "exam-schedule", { "note-body": "本文\n\n<script>alert(1)</script>" }, "f-script", state), status: 422, code: "invalid-value" },
    { name: "markdown with raw HTML", send: () => put("note", "exam-schedule", { "note-body": '<img src="x" onerror="alert(1)">' }, "f-html", state), status: 422, code: "invalid-value" },
    { name: "markdown javascript: link", send: () => put("note", "exam-schedule", { "note-body": "[開く](javascript:alert(1))" }, "f-md-js", state), status: 422, code: "" },
    { name: "javascript: URL field", send: () => put("result-entry", "year-2015-01", { "result-entry-url": "javascript:alert(1)" }, "f-url", state), status: 422, code: "unsafe-reference" },
    { name: "unknown model", send: () => put("no-such-model", "x", { "no-such-model-label": "x" }, "f-model", state), status: 422, code: "forbidden" },
    { name: "unknown field", send: () => put("course", "two-month", { "course-slug": "x" }, "f-field", state), status: 422, code: "unknown-field" },
    { name: "file path as a field id", send: () => put("course", "two-month", { "../../package.json": "{}" }, "f-path-field", state), status: 422, code: "malformed-request" },
    { name: "file path as an entry id", send: () => put("course", "../../../package.json", { "course-price": "¥1" }, "f-path-entry", state), status: 422, code: "" },
    { name: "file path beside the values", send: () => put("course", "two-month", { "course-price": "¥1" }, "f-path-body", state, { path: "apps/site/zfb.config.ts", files: ["package.json"] }), status: 422, code: "malformed-request" },
    {
      name: "file path inside the operation request",
      send: () => api("/api/v1/operations", { json: { operationId: "f-path-request", expectedBaselineRevision: state.baselineRevision, request: { kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "course", entryId: "two-month", expectedRevision: state.draftRevision, values: { "course-price": "¥1" }, path: "package.json" } } }),
      status: 422,
      code: "",
    },
    { name: "non-string price", send: () => put("course", "two-month", { "course-price": { html: "<b>1</b>" } }, "f-type", state), status: 422, code: "invalid-value" },
    { name: "create-entry on an update-only collection", send: () => api("/api/v1/content/course", { headers: { "idempotency-key": "f-create" }, json: { entryId: "six-month", expectedRevision: state.draftRevision, expectedBaselineRevision: state.baselineRevision, values: { "course-name": "6ヶ月" } } }), status: 422, code: "forbidden" },
    { name: "publication with file paths", send: () => api("/api/v1/publications", { json: { snapshotId: "0".repeat(64), expectedBaselineRevision: state.baselineRevision, files: ["package.json"] } }), status: 422, code: "" },
    { name: "baseline advance with a caller-supplied sha", send: () => api("/api/v1/baseline/advance", { json: { publicationId: "pub-x", gitSha: "f".repeat(40) } }), status: 422, code: "" },
  ];
  const results: Json[] = [];
  for (const probe of cases) {
    const answer = await probe.send();
    const code = answer.body.refusal?.code ?? answer.body.code ?? answer.body.reason ?? null;
    results.push({ name: probe.name, status: answer.status, bodyStatus: answer.body.status, code, message: answer.body.refusal?.message ?? answer.body.message });
  }
  evidence.forbidden = results;
  for (const [index, probe] of cases.entries()) {
    expect.soft(results[index]!.status, `${probe.name}: ${JSON.stringify(results[index])}`).toBe(probe.status);
    expect.soft(["refused", "rejected"], `${probe.name}: ${JSON.stringify(results[index])}`).toContain(results[index]!.bodyStatus);
    if (probe.code) expect.soft(results[index]!.code, `${probe.name}: ${JSON.stringify(results[index])}`).toBe(probe.code);
  }
  for (const path_ of ["/composer", "/mapping/about-cv", "/sitemapper", "/content/schema", "/api/v1/models", "/api/v1/schema", "/api/v1/upload", "/api/v1/assets"]) expect((await api(path_)).status, path_).toBe(403);
  // The form shows 表示順 because the collection allows reorder, but only as a disabled input: order changes go through reorder.
  const page = await openEditor(browser);
  await openEntry(page, "よくある質問", "/faq/ の質問と回答", FAQ_QUESTION, ANSWER);
  const order = page.locator("#content-entry-faq-item-order");
  evidence.orderFieldInForm = { visible: await order.isVisible(), editable: await order.isEditable() };
  expect(await order.isEditable()).toBe(false);
  await page.context().close();
  const after = await draft();
  expect(after.draftRevision).toBe(state.draftRevision);
  expect(JSON.stringify(after.snapshot.entries)).toBe(JSON.stringify(state.snapshot.entries));
  for (const key of ["f-slug", "f-order", "f-script", "f-path-body", "f-path-request", "f-create"]) expect((await api(`/api/v1/operations/${key}`)).status, key).toBe(404);
});

test("3. concurrent saves: one ok, one conflict; idempotent replays; aborted requests never report success", async ({ browser }) => {
  const state = await draft();
  const [a, b] = await Promise.all([put("course", "four-month", { "course-price": editPrice(41) }, "c-a", state), put("course", "four-month", { "course-price": editPrice(43) }, "c-b", state)]);
  const outcomes = [a, b].map((answer) => answer.body.status).sort();
  expect(outcomes).toEqual(["conflict", "ok"]);
  const winner = a.body.status === "ok" ? { key: "c-a", price: editPrice(41), answer: a } : { key: "c-b", price: editPrice(43), answer: b };
  const loser = a.body.status === "ok" ? b : a;
  expect(loser.status).toBe(409);
  expect(loser.body.reason).toBe("draft-revision");
  expect(loser.body.current.draftRevision).toBe(state.draftRevision + 1);
  const afterRace = await draft();
  expect(valueOf(afterRace, "course", "four-month", "course-price")).toBe(winner.price);

  // Same key + same request: the stored result, not a second write.
  const replay = await put("course", "four-month", { "course-price": winner.price }, winner.key, state);
  expect(replay.status).toBe(200);
  expect(replay.body.value.replayed).toBe(true);
  expect(replay.body.value.receipt).toEqual(winner.answer.body.value.receipt);
  expect((await draft()).draftRevision).toBe(afterRace.draftRevision);
  // Same key + different request: refused, nothing written.
  const reused = await put("course", "four-month", { "course-price": editPrice(50) }, winner.key, state);
  expect(reused.status).toBe(409);
  expect(reused.body.reason).toBe("operation-id");
  expect(valueOf(await draft(), "course", "four-month", "course-price")).toBe(winner.price);
  evidence.concurrency = { outcomes: [a.body, b.body].map((body) => ({ status: body.status, reason: body.reason, revision: body.value?.draft?.draftRevision ?? body.current?.draftRevision })), replay: { status: replay.body.status, replayed: replay.body.value.replayed }, reused: reused.body };

  // Two editor sessions on the same revision: the later save is a conflict and the earlier value survives.
  const first = await openEditor(browser);
  await openEntry(first, "コースと料金", "コース・料金", "4ヶ月コース", PRICE);
  const second = await openEditor(browser);
  await openEntry(second, "コースと料金", "コース・料金", "4ヶ月コース", PRICE);
  await setField(second, PRICE, editPrice(44));
  await expect(second.getByTestId("save-status")).toHaveText(/^保存済み（改訂 \d+）$/, { timeout: 30_000 });
  await setField(first, PRICE, editPrice(45));
  await expect(first.getByTestId("save-status")).toHaveText("競合", { timeout: 30_000 });
  await expect(first.getByTestId("conflict-panel")).toBeVisible();
  expect(valueOf(await draft(), "course", "four-month", "course-price")).toBe(editPrice(44));
  await shot(first, "03-conflict");
  await first.context().close();

  // The save request never reaches the Worker: the editor reports a failure, never a save.
  const beforeAbort = await draft();
  await second.route("**/api/v1/operations", (route) => route.abort("connectionfailed"));
  await setField(second, PRICE, editPrice(47));
  await expect(second.getByTestId("save-status")).not.toHaveText(/^保存済み/, { timeout: 5_000 });
  await expect(second.getByTestId("save-status")).toHaveText(/保存に失敗|保存を確認中|未保存の変更/, { timeout: 30_000 });
  // The status line stays Japanese: session messages are localised by the host.
  await expect(second.getByTestId("save-status")).not.toHaveText(/[A-Za-z]{3,} [A-Za-z]{3,}/);
  const abortedLabel = await second.getByTestId("save-status").textContent();
  await shot(second, "03-request-aborted");
  const afterAbort = await draft();
  expect(afterAbort.draftRevision).toBe(beforeAbort.draftRevision);
  expect(valueOf(afterAbort, "course", "four-month", "course-price")).toBe(editPrice(44));
  await second.unroute("**/api/v1/operations");
  await second.context().close();

  // The request reaches the Worker but the answer is lost: the editor must settle on what the server holds.
  const third = await openEditor(browser);
  await openEntry(third, "コースと料金", "コース・料金", "4ヶ月コース", PRICE);
  let dropped = 0;
  await third.route("**/api/v1/operations", async (route) => {
    if (dropped === 0) {
      dropped += 1;
      await route.fetch();
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });
  await setField(third, PRICE, editPrice(48));
  const truth = await draft();
  expect(valueOf(truth, "course", "four-month", "course-price")).toBe(editPrice(48));
  await expect(third.getByTestId("save-status")).toHaveText(/保存済み（改訂 \d+）|保存を確認中|保存に失敗/, { timeout: 30_000 });
  const lostLabel = (await third.getByTestId("save-status").textContent()) ?? "";
  const savedRevision = /改訂 (\d+)/.exec(lostLabel)?.[1];
  if (savedRevision) expect(Number(savedRevision)).toBe(truth.draftRevision);
  await shot(third, "03-response-lost");
  evidence.abort = { requestAborted: { label: abortedLabel, serverRevision: afterAbort.draftRevision }, responseLost: { label: lostLabel, serverRevision: truth.draftRevision } };
  await third.context().close();
});

test("4. a snapshot is immutable and renders its own values after later edits", async () => {
  const stored = JSON.parse(await readFile(path.join(reports, "snapshot-revision-2.json"), "utf8")) as Json;
  const reread = await api(`/api/v1/snapshots/${stored.snapshotId}`);
  expect(reread.status).toBe(200);
  expect(JSON.stringify(reread.body.value)).toBe(JSON.stringify(stored));
  const preview = await fetch(`${origin}/preview/${stored.snapshotId}/faq/?revision=2`);
  expect(preview.status).toBe(200);
  const html = await preview.text();
  expect(html).not.toContain(NEW_ANSWER);
  expect(html).not.toContain(NEWER_ANSWER);
  expect(html).toContain(FAQ_QUESTION);
  expect(html).not.toMatch(/preact/i);
  const home = await (await fetch(`${origin}/preview/${stored.snapshotId}/?revision=2`)).text();
  expect(home).toContain(NEW_PRICE);
  expect((await fetch(`${origin}/preview/${stored.snapshotId}/?revision=3`)).status).toBe(409);
  expect((await fetch(`${origin}/preview/${"0".repeat(64)}/?revision=2`)).status).toBe(404);
  expect((await fetch(`${origin}/preview/${stored.snapshotId}/composer/?revision=2`)).status).toBe(404);
  evidence.snapshotImmutable = { snapshotId: stored.snapshotId, draftRevision: stored.draftRevision, rereadIdentical: true };
});

test("5. publication: external change → conflict → rebase; two publications with an edit in between; failure, timeout, duplicate, lost ack, restart; never 公開中", async ({ browser }) => {
  // --- an in-flight publication, an unsent edit, then a canonical change made outside the CMS ---
  const external = await snapshotNow();
  const jobE = await api("/api/v1/publications", { json: { snapshotId: external.snapshotId, expectedBaselineRevision: external.baselineRevision } });
  expect(jobE.body.status, JSON.stringify(jobE.body)).toBe("ok");
  expect(jobE.body.value.state).toBe("submitted");
  const unsent = await put("course", "two-month", { "course-price": editPrice(11) }, "e-unsent");
  expect(unsent.body.status).toBe("ok");

  await worker.stop();
  originalFourMonth = await readFile(FOUR_MONTH_FILE, "utf8");
  const changed = JSON.parse(originalFourMonth) as Json;
  changed.values["course-unit"] = EXTERNAL_UNIT;
  await writeFile(FOUR_MONTH_FILE, `${JSON.stringify(changed, null, 2)}\n`);
  await assemble({ PINSEL_BASELINE_REVISION: EXTERNAL_SHA });
  await worker.restart();
  const site = (await api("/api/v1/site")).body;
  expect(site.canonicalBaselineRevision).toBe(EXTERNAL_SHA);
  expect(site.baselineRevision).toBe(external.baselineRevision);
  const detected = await api("/api/v1/baseline/reconcile", { json: {} });
  expect(detected.status, JSON.stringify(detected.body)).toBe(409);
  expect(detected.body.reason).toBe("baseline-revision");
  const conflict = detected.body.conflict;
  const rebased = await api("/api/v1/baseline/reconcile", { json: { conflictId: conflict.conflictId, expectedDraftRevision: conflict.draftRevision } });
  expect(rebased.status, JSON.stringify(rebased.body)).toBe(200);
  const afterRebase = await draft();
  expect(afterRebase.baselineRevision).toBe(EXTERNAL_SHA);
  expect(valueOf(afterRebase, "course", "two-month", "course-price")).toBe(editPrice(11));
  expect(valueOf(afterRebase, "course", "four-month", "course-unit")).toBe(EXTERNAL_UNIT);
  expect(valueOf(afterRebase, "faq-item", FAQ_ID, "faq-item-answer")).toBe(NEWER_ANSWER);
  const conflicted = await api(`/api/v1/publications/${jobE.body.value.publicationId}`);
  expect(conflicted.body.value.state).toBe("conflict");
  const conflictPage = await openEditor(browser, jobE.body.value.publicationId);
  await expectPublicationLabel(conflictPage, "conflict");
  await shot(conflictPage, "05-external-change-conflict");
  await conflictPage.context().close();
  evidence.externalChange = { detected: detected.body, rebased: rebased.body, job: conflicted.body.value };

  // --- publication 1 from the editor, an edit while it builds, integration advances the baseline ---
  const page = await openEditor(browser);
  await openEntry(page, "コースと料金", "コース・料金", "2ヶ月コース", PRICE);
  await page.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(page.getByTestId("preview-status")).toHaveText(/^表示中: 改訂 \d+$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "公開を申請" }).click();
  const dialog = page.getByRole("dialog", { name: "公開を申請しますか？" });
  const snapshot1 = (await dialog.getByTestId("publish-snapshot").textContent())!;
  await dialog.getByRole("button", { name: "この内容で申請する" }).click();
  await expectPublicationLabel(page, "submitted");
  const job1 = (await api("/api/v1/publications", { json: { snapshotId: snapshot1, expectedBaselineRevision: EXTERNAL_SHA } })).body;
  expect(job1.replayed).toBe(true);
  const op1 = job1.value.providerRef.operationId as string;

  await openEntry(page, "コースと料金", "コース・料金", "4ヶ月コース", PRICE);
  await setField(page, PRICE, editPrice(46));
  await expect(page.getByTestId("save-status")).toHaveText(/^保存済み（改訂 \d+）$/, { timeout: 30_000 });
  const editDuring = await draft();

  await fakeDriver("advance", { operationId: op1, state: "building" });
  await refreshPublication(page, "building");
  await fakeDriver("advance", { operationId: op1, state: "verified", ...GREEN("a".repeat(40)) });
  await refreshPublication(page, "validated");
  await fakeDriver("advance", { operationId: op1, state: "integrated", ...GREEN("1".repeat(40)) });
  await refreshPublication(page, "integrated");
  await shot(page, "05-publication-1-integrated");
  await page.context().close();
  const afterP1 = await draft();
  expect(afterP1.baselineRevision).toBe("1".repeat(40));
  expect(valueOf(afterP1, "course", "four-month", "course-price")).toBe(editPrice(46));
  expect(afterP1.draftRevision).toBeGreaterThanOrEqual(editDuring.draftRevision);
  const published1 = (await api(`/api/v1/snapshots/${snapshot1}`)).body.value;
  expect(valueOf({ snapshot: { entries: published1.project.providers.content[0].entries } }, "course", "four-month", "course-price")).not.toBe(editPrice(46));

  // --- publication 2 carries the edit made during publication 1 ---
  const page2 = await openEditor(browser);
  await openEntry(page2, "コースと料金", "コース・料金", "4ヶ月コース", PRICE);
  await expect(page2.locator(PRICE)).toHaveValue(editPrice(46));
  await page2.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(page2.getByTestId("preview-status")).toHaveText(/^表示中: 改訂 \d+$/, { timeout: 30_000 });
  await page2.getByRole("button", { name: "公開を申請" }).click();
  const dialog2 = page2.getByRole("dialog", { name: "公開を申請しますか？" });
  const snapshot2 = (await dialog2.getByTestId("publish-snapshot").textContent())!;
  await dialog2.getByRole("button", { name: "この内容で申請する" }).click();
  await expectPublicationLabel(page2, "submitted");
  const job2 = (await api("/api/v1/publications", { json: { snapshotId: snapshot2, expectedBaselineRevision: "1".repeat(40) } })).body.value;
  expect(job2.publicationId).not.toBe(job1.value.publicationId);
  const submitted2 = (await fakeSubmissions()).submissions.find((entry: Json) => entry.snapshotId === snapshot2);
  expect(submitted2.baselineRevision).toBe("1".repeat(40));
  const published2 = (await api(`/api/v1/snapshots/${snapshot2}`)).body.value;
  expect(valueOf({ snapshot: { entries: published2.project.providers.content[0].entries } }, "course", "four-month", "course-price")).toBe(editPrice(46));
  // `deployed` without deployment evidence for the commit is never live.
  await fakeDriver("advance", { operationId: job2.providerRef.operationId, state: "deployed", ...GREEN("2".repeat(40)) });
  await page2.getByTestId("publication-status").getByRole("button", { name: "状況を更新" }).click();
  await page2.waitForTimeout(500);
  const unproven = (await api(`/api/v1/publications/${job2.publicationId}`)).body.value;
  expect(unproven.state).not.toBe("live");
  await expect(page2.locator("body")).not.toContainText("公開中");
  await fakeDriver("advance", { operationId: job2.providerRef.operationId, state: "integrated", ...GREEN("2".repeat(40)) });
  await refreshPublication(page2, "integrated");
  await page2.context().close();
  expect((await draft()).baselineRevision).toBe("2".repeat(40));
  evidence.publications = { job1: job1.value.publicationId, snapshot1, job2: job2.publicationId, snapshot2, deployedWithoutEvidence: unproven.state, baselineAfter: "2".repeat(40) };

  // --- refused submission → failed, draft intact; a retry re-arms the same job; a duplicate replays ---
  expect((await put("course", "two-month", { "course-price": editPrice(12) }, "p-62")).body.status).toBe("ok");
  const s3 = await snapshotNow();
  await fakeDriver("script", { method: "submit", outcome: "rejected" });
  const failed = await api("/api/v1/publications", { json: { snapshotId: s3.snapshotId, expectedBaselineRevision: s3.baselineRevision } });
  expect(failed.body.value?.state, JSON.stringify(failed.body)).toBe("failed");
  expect(valueOf(await draft(), "course", "two-month", "course-price")).toBe(editPrice(12));
  expect((await draft()).baselineRevision).toBe("2".repeat(40));
  const failedPage = await openEditor(browser, failed.body.value.publicationId);
  await expectPublicationLabel(failedPage, "failed");
  await shot(failedPage, "05-publication-failed");
  await failedPage.context().close();
  const retried = await api("/api/v1/publications", { json: { snapshotId: s3.snapshotId, expectedBaselineRevision: s3.baselineRevision } });
  expect(retried.body.value.publicationId).toBe(failed.body.value.publicationId);
  expect(retried.body.value.state).toBe("submitted");
  const countBefore = (await fakeSubmissions()).submissions.length;
  const duplicate = await api("/api/v1/publications", { json: { snapshotId: s3.snapshotId, expectedBaselineRevision: s3.baselineRevision } });
  expect(duplicate.body.value.publicationId).toBe(failed.body.value.publicationId);
  expect(duplicate.body.replayed).toBe(true);
  expect((await fakeSubmissions()).submissions.length).toBe(countBefore);

  // --- a status timeout changes nothing but the counters ---
  await fakeDriver("script", { method: "status", outcome: "timeout" });
  const timedOut = (await api(`/api/v1/publications/${failed.body.value.publicationId}`)).body;
  expect(timedOut.value?.state ?? timedOut.status, JSON.stringify(timedOut)).toBe("submitted");

  // --- a lost acknowledgement is recovered by lookup, never by a second submission ---
  expect((await put("course", "two-month", { "course-price": editPrice(13) }, "p-63")).body.status).toBe("ok");
  const s4 = await snapshotNow();
  const submitsBefore = (await fakeSubmissions()).calls.submit;
  await fakeDriver("script", { method: "submit", outcome: "lost-ack" });
  const uncertain = await api("/api/v1/publications", { json: { snapshotId: s4.snapshotId, expectedBaselineRevision: s4.baselineRevision } });
  expect(uncertain.status, JSON.stringify(uncertain.body)).toBe(503);
  expect(uncertain.body.status).toBe("uncertain");
  const recovered = (await api(`/api/v1/publications/${uncertain.body.value.publicationId}`)).body.value;
  expect(recovered.providerRef?.operationId, JSON.stringify(recovered)).toBeTruthy();
  const again = await api("/api/v1/publications", { json: { snapshotId: s4.snapshotId, expectedBaselineRevision: s4.baselineRevision } });
  expect(again.body.value.publicationId).toBe(uncertain.body.value.publicationId);
  const after = await fakeSubmissions();
  expect(after.calls.submit - submitsBefore).toBe(1);
  expect(after.submissions.filter((entry: Json) => entry.snapshotId === s4.snapshotId)).toHaveLength(1);
  evidence.failureModes = { failed: failed.body.value, retried: retried.body.value.state, duplicateReplayed: duplicate.body.replayed, timeout: { state: timedOut.value?.state, message: timedOut.value?.message, providerFailures: timedOut.value?.providerFailures }, lostAck: { http: uncertain.status, recovered: recovered.state, providerRef: recovered.providerRef, submitCalls: after.calls.submit - submitsBefore } };

  // --- a Worker restart: the jobs are durable in D1 and are re-read, not re-submitted ---
  await worker.restart();
  const durable = (await api(`/api/v1/publications/${uncertain.body.value.publicationId}`)).body;
  const freshFake = await fakeSubmissions();
  expect(durable.value?.publicationId ?? null, JSON.stringify(durable)).toBe(uncertain.body.value.publicationId);
  expect(freshFake.calls.submit).toBe(0);
  evidence.restart = { job: durable.value ?? durable, fakeCallsAfterRestart: freshFake.calls };

  // --- publication switched off: configuration-required, keeping the last observed state ---
  await worker.restart({ PUBLISHER_PROVIDER: "disabled" });
  const disabled = (await api(`/api/v1/publications/${job2.publicationId}`)).body.value;
  expect(disabled.state).toBe("configuration-required");
  expect(disabled.lastObservedState).toBe("integrated");
  const disabledPage = await openEditor(browser, job2.publicationId);
  const status = disabledPage.getByTestId("publication-status");
  await expect(status).toHaveAttribute("data-publication-state", "configuration-required");
  await expect(status).toContainText("公開状況: 設定が必要（最後の状況: 反映済み）");
  await expect(disabledPage.locator("body")).not.toContainText("公開中");
  labelsSeen.push({ state: "configuration-required", label: (await status.locator("span").first().textContent()) ?? "" });
  await shot(disabledPage, "05-configuration-required");
  await disabledPage.context().close();
  evidence.disabled = disabled;
  await worker.restart({ PUBLISHER_PROVIDER: "fake" });
});
