import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { PINSEL_CONTENT_POLICY, PINSEL_EDITOR_POLICY, PINSEL_PROJECT_ID, refusePinselRequest } from "@pinsel/content";
import * as pinselContent from "@pinsel/content";
import {
  applyHostContentRequest,
  createMemoryContentDraftStorage,
  readHostContentReceipt,
  type ContentDraftStorageAdapter,
  type ContentSnapshotRecord,
} from "zudo-composer/host-storage";
import type { SiteProject } from "zudo-composer/site-project";

// Local stand-in for the authoring Worker's /api/v1 + /preview, for
// `pnpm --filter @pinsel/editor dev` only (loaded through Vite's SSR loader by
// vite.config.ts; never part of the build). Storage is Composer's in-memory
// reference adapter under the same Pinsel rules + server policy the Worker
// applies; the preview is a protocol-correct stand-in document, NOT the real
// SSR (use `wrangler dev --env local` for that). Publications run a fake
// provider: submitted -> building -> validated -> integrated, one step per
// status read; MOCK_PUBLISHER=disabled answers configuration-required.
// Requires `pnpm content:assemble` (reads packages/pinsel-content/.site-project).

const PACK = { packId: "pinsel", packVersion: "0.1.0" };
const ACTOR = { subject: process.env.MOCK_SUBJECT ?? "editor@example.test" };
const REFUSED = /^\/(composer|mapping|sitemapper|content\/schema|api\/(v1\/)?(models|schema|upload|assets))(\/|$)/;
const PROGRESSION = ["submitted", "building", "validated", "integrated"] as const;
const projectDir = path.resolve(import.meta.dirname, "../../../packages/pinsel-content/.site-project");

interface Job {
  operationId: string;
  snapshotId: string;
  baselineRevision: string;
  idempotencyKey: string;
  step: number;
  updatedAt: string;
}

interface MockState {
  adapter: ContentDraftStorageAdapter;
  baselineRevision: string;
  baselinePreview: { snapshotId: string; revision: number };
  jobs: Map<string, Job>;
}

let state: Promise<MockState> | null = null;

async function load(): Promise<MockState> {
  const project = JSON.parse(await readFile(path.join(projectDir, "site-project.json"), "utf8")) as SiteProject;
  const { baselineRevision } = JSON.parse(await readFile(path.join(projectDir, "baseline.json"), "utf8")) as { baselineRevision: string };
  const adapter = await createMemoryContentDraftStorage({ project, baselineRevision });
  const draft = await adapter.readDraft();
  if (draft.status !== "ok") throw new Error(`mock draft: ${draft.status}`);
  const seed = await adapter.snapshot({ expectedDraftRevision: draft.value.draftRevision });
  if (seed.status !== "ok") throw new Error(`mock baseline snapshot: ${seed.status}`);
  return { adapter, baselineRevision, baselinePreview: { snapshotId: seed.value.snapshotId, revision: seed.value.draftRevision }, jobs: new Map() };
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

const HTTP: Record<string, number> = { ok: 200, conflict: 409, refused: 422, rejected: 422, "not-found": 404, unavailable: 503, uncertain: 503, "configuration-required": 503 };

function answer(res: ServerResponse, body: { status: string }): void {
  send(res, HTTP[body.status] ?? 500, body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** The same protocol as the Worker's preview client: ready -> render -> navigate -> rendered only on an exact match. */
type Identity = { snapshotId: string; revision: number; route: string };

function clientScript(self: Identity | null, loadError: string | null): string {
  return `(() => {
  const pack = ${JSON.stringify(PACK)}, self = ${JSON.stringify(self)}, loadError = ${JSON.stringify(loadError)}, frameLoadId = crypto.randomUUID();
  const base = { channel: "zudo-composer-host-preview", v: 1, packId: pack.packId, packVersion: pack.packVersion };
  const post = (m) => parent.postMessage({ ...base, ...m }, location.origin);
  addEventListener("message", (event) => {
    const d = event.data;
    if (event.source !== parent || event.origin !== location.origin || !d || d.channel !== base.channel || d.type !== "render" || d.frameLoadId !== frameLoadId) return;
    const request = { snapshotId: d.snapshotId, revision: d.revision, route: d.route };
    if (self && self.snapshotId === d.snapshotId && self.revision === d.revision && self.route === d.route) {
      if (loadError) post({ type: "error", ...request, frameLoadId, message: loadError, recoverable: false });
      else post({ type: "rendered", ...request, frameLoadId });
    }
    else location.replace("/preview/" + d.snapshotId + d.route + "?revision=" + encodeURIComponent(String(d.revision)));
  });
  post({ type: "ready", frameLoadId });
})();`;
}

function previewDocument(body: string, self: Identity | null, loadError: string | null = null): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>モックプレビュー</title><style>body{font:14px/1.6 system-ui;margin:1rem}dt{font-weight:700}dd{margin:0 0 .5rem}</style></head><body>${body}<script>${clientScript(self, loadError)}</script></body></html>`;
}

function renderSnapshot(snapshot: ContentSnapshotRecord, route: string): string {
  const content = snapshot.project.providers.content[0];
  const rows = (content?.entries ?? []).map((entry) => {
    const model = content?.models.find((candidate) => candidate.id === entry.modelId);
    const values = Object.entries(entry.values).map(([id, value]) => `<dt>${escapeHtml(model?.document.fields.find((field) => field.id === id)?.label ?? id)}</dt><dd>${escapeHtml(typeof value === "string" ? value : JSON.stringify(value))}</dd>`).join("");
    return `<section><h2>${escapeHtml(model?.document.name ?? entry.modelId)} / ${escapeHtml(entry.id)}</h2><dl>${values}</dl></section>`;
  });
  return `<p><strong>モックプレビュー（本番の表示ではありません）</strong> ${escapeHtml(route)} — 改訂 ${snapshot.draftRevision}</p>${rows.join("")}`;
}

function routes(): readonly string[] {
  const exported = (pinselContent as Record<string, unknown>).PINSEL_ROUTES;
  return Array.isArray(exported) && exported.every((route) => typeof route === "string") ? exported : ["/"];
}

function jobStatus(job: Job): Record<string, unknown> {
  return { operationId: job.operationId, state: PROGRESSION[Math.min(job.step, PROGRESSION.length - 1)], snapshotId: job.snapshotId, baselineRevision: job.baselineRevision, updatedAt: job.updatedAt, evidence: job.step >= 2 ? { commit: "0".repeat(40), pr: "https://example.test/pull/1", checks: [{ name: "build", status: job.step >= 2 ? "passed" : "pending" }] } : {}, message: "モックの公開サービスです。" };
}

/** Connect-style middleware; returns false when the request is not the mock's. */
export async function handleMockRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://mock.local");
  const { pathname } = url;
  if (REFUSED.test(pathname)) {
    send(res, 403, { status: "forbidden", code: "refused-path", message: "利用できません" });
    return true;
  }
  if (!pathname.startsWith("/api/v1/") && !pathname.startsWith("/preview/")) return false;
  state ??= load();
  const mock = await state;
  const method = req.method ?? "GET";
  const origin = `http://${req.headers.host ?? "localhost"}`;

  if (pathname === "/api/v1/site" && method === "GET") {
    send(res, 200, { status: "ok", projectId: PINSEL_PROJECT_ID, providerId: PINSEL_EDITOR_POLICY.providerId, baselineRevision: mock.baselineRevision, pack: PACK, contractVersion: 1, policy: PINSEL_EDITOR_POLICY, routes: routes(), preview: { url: "/preview/", origin, route: "/" }, baselinePreview: mock.baselinePreview, actor: ACTOR });
    return true;
  }
  if (pathname === "/api/v1/draft" && method === "GET") {
    answer(res, await mock.adapter.readDraft());
    return true;
  }
  if (pathname === "/api/v1/operations" && method === "POST") {
    const input = (await readJson(req)) as { operationId?: unknown; request?: unknown; expectedBaselineRevision?: unknown } | null;
    if (!input || typeof input.operationId !== "string" || typeof input.expectedBaselineRevision !== "string") {
      send(res, 422, { status: "refused", refusal: { ok: false, code: "malformed-request", message: "malformed body" } });
      return true;
    }
    const refusal = refusePinselRequest(input.request);
    if (refusal) {
      send(res, 422, { status: "refused", refusal });
      return true;
    }
    answer(res, await applyHostContentRequest(mock.adapter, { operationId: input.operationId, request: input.request, expectedBaselineRevision: input.expectedBaselineRevision }, { policy: PINSEL_CONTENT_POLICY, actor: ACTOR }));
    return true;
  }
  const receipt = /^\/api\/v1\/operations\/([^/]+)$/.exec(pathname);
  if (receipt && method === "GET") {
    answer(res, await readHostContentReceipt(mock.adapter, decodeURIComponent(receipt[1]!), ACTOR));
    return true;
  }
  if (pathname === "/api/v1/snapshots" && method === "POST") {
    const input = (await readJson(req)) as { expectedDraftRevision?: unknown } | null;
    if (typeof input?.expectedDraftRevision !== "number") {
      send(res, 422, { status: "rejected", code: "validation", message: "expectedDraftRevision is required" });
      return true;
    }
    answer(res, await mock.adapter.snapshot({ expectedDraftRevision: input.expectedDraftRevision }));
    return true;
  }
  if (pathname === "/api/v1/publications" && method === "POST") {
    if (process.env.MOCK_PUBLISHER === "disabled") {
      send(res, 503, { status: "configuration-required", message: "PUBLISHER_PROVIDER=disabled" });
      return true;
    }
    const input = (await readJson(req)) as { snapshotId?: unknown; baselineRevision?: unknown; idempotencyKey?: unknown } | null;
    if (typeof input?.snapshotId !== "string" || typeof input.idempotencyKey !== "string" || typeof input.baselineRevision !== "string") {
      send(res, 422, { status: "rejected", message: "malformed submission" });
      return true;
    }
    const existing = [...mock.jobs.values()].find((job) => job.idempotencyKey === input.idempotencyKey);
    if (existing) {
      if (existing.snapshotId !== input.snapshotId) send(res, 409, { status: "conflict", operationId: existing.operationId });
      else send(res, 200, { status: "ok", value: { operationId: existing.operationId, replayed: true } });
      return true;
    }
    const snapshot = await mock.adapter.readSnapshot(input.snapshotId);
    if (snapshot.status !== "ok") {
      send(res, 422, { status: "rejected", message: "unknown snapshot", path: "snapshotId" });
      return true;
    }
    const job: Job = { operationId: `pub-${mock.jobs.size + 1}`, snapshotId: input.snapshotId, baselineRevision: input.baselineRevision, idempotencyKey: input.idempotencyKey, step: 0, updatedAt: new Date().toISOString() };
    mock.jobs.set(job.operationId, job);
    send(res, 200, { status: "ok", value: { operationId: job.operationId, replayed: false } });
    return true;
  }
  const publication = /^\/api\/v1\/publications\/([^/]+)$/.exec(pathname);
  if (publication && method === "GET") {
    const job = mock.jobs.get(decodeURIComponent(publication[1]!));
    if (!job) {
      send(res, 404, { status: "not-found" });
      return true;
    }
    const status = jobStatus(job);
    job.step += 1;
    job.updatedAt = new Date().toISOString();
    send(res, 200, { status: "ok", value: status });
    return true;
  }
  if (pathname === "/preview/" && method === "GET") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(previewDocument("<p>プレビューを準備しています…</p>", null));
    return true;
  }
  const preview = /^\/preview\/([0-9a-f]{64})(\/.*)$/.exec(pathname);
  if (preview && method === "GET") {
    const snapshot = await mock.adapter.readSnapshot(preview[1]!);
    const revision = Number(url.searchParams.get("revision"));
    const self = { snapshotId: preview[1]!, revision, route: preview[2]! };
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (snapshot.status !== "ok") {
      res.statusCode = 404;
      res.end(previewDocument("<p>スナップショットが見つかりません。</p>", self, "Unknown snapshot."));
    } else if (snapshot.value.draftRevision !== revision) {
      res.statusCode = 409;
      res.end(previewDocument("<p>改訂が一致しません。</p>", self, "Revision mismatch."));
    } else {
      res.end(previewDocument(renderSnapshot(snapshot.value, self.route), self));
    }
    return true;
  }
  send(res, 404, { status: "not-found" });
  return true;
}
