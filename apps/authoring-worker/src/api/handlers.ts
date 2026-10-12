import { PINSEL_CONTENT_POLICY, PINSEL_CONTENT_PROVIDER_ID, PINSEL_EDITOR_POLICY, PINSEL_MODELS, refusePinselRequest } from "@pinsel/content";
import type { HostContentActor } from "zudo-composer/content";
import { applyHostContentRequest, isHostContentOperationId, readHostContentReceipt, type ContentDraftStorageAdapter, type HostContentApplyResult } from "zudo-composer/host-storage";
import { PREVIEW_PACK, previewShellDocument, renderPreviewDocument } from "../preview/preview";
import { BASELINE, PREVIEW_ROUTES, PROJECT_ID } from "../site/baseline";

// The Worker API the editor and `curl` talk to. Every response body is JSON
// with a `status` discriminator from the upstream vocabulary (`ok | conflict |
// refused | rejected | not-found | unavailable | uncertain`); the HTTP code
// only mirrors it for humans and tooling.

export const API_PREFIX = "/api/v1";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function statusCodeFor(result: { status: string }): number {
  switch (result.status) {
    case "ok":
      return 200;
    case "conflict":
      return 409;
    case "refused":
    case "rejected":
      return 422;
    case "not-found":
      return 404;
    default:
      return 503;
  }
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const malformed = (message: string, path?: string): HostContentApplyResult => ({ status: "refused", refusal: { ok: false, code: "malformed-request", message, ...(path ? { path } : {}) } });

export interface ApiContext {
  adapter: ContentDraftStorageAdapter;
  actor: HostContentActor;
  origin: string;
}

async function applyOperation(context: ApiContext, operationId: unknown, request: unknown, expectedBaselineRevision: unknown): Promise<Response> {
  if (!isHostContentOperationId(operationId)) return json(malformed("operationId must be a short opaque token.", "operationId"), 422);
  if (typeof expectedBaselineRevision !== "string" || expectedBaselineRevision.length === 0) return json(malformed("expectedBaselineRevision is required.", "expectedBaselineRevision"), 422);
  // Pinsel's own field rules (note markdown subset, link targets, order is reorder-only) refuse before anything is written.
  const refused = refusePinselRequest(request, PINSEL_MODELS);
  if (refused) return json({ status: "refused", refusal: refused } satisfies HostContentApplyResult, 422);
  const result = await applyHostContentRequest(context.adapter, { operationId, request, expectedBaselineRevision }, { policy: PINSEL_CONTENT_POLICY, actor: context.actor });
  return json(result, statusCodeFor(result));
}

export async function handleApi(request: Request, url: URL, context: ApiContext): Promise<Response | null> {
  const path = url.pathname.slice(API_PREFIX.length) || "/";
  const method = request.method;

  if (method === "GET" && path === "/site") {
    return json({
      status: "ok",
      projectId: PROJECT_ID,
      providerId: PINSEL_CONTENT_PROVIDER_ID,
      baselineRevision: BASELINE.baselineRevision,
      pack: PREVIEW_PACK,
      policy: PINSEL_EDITOR_POLICY,
      routes: PREVIEW_ROUTES,
      preview: { url: `${context.origin}/preview/`, origin: context.origin, route: PREVIEW_ROUTES[0] },
      actor: context.actor,
    });
  }
  if (method === "GET" && path === "/draft") {
    const draft = await context.adapter.readDraft();
    return json(draft, statusCodeFor(draft));
  }
  if (method === "POST" && path === "/operations") {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    return applyOperation(context, body.operationId, body.request, body.expectedBaselineRevision);
  }
  const receipt = /^\/operations\/([^/]+)$/.exec(path);
  if (method === "GET" && receipt) {
    const result = await readHostContentReceipt(context.adapter, decodeURIComponent(receipt[1]!), context.actor);
    return json(result, statusCodeFor(result));
  }
  // REST alias for one Entry: the same save path, with the operation id in `Idempotency-Key`.
  const entry = /^\/content\/([^/]+)\/([^/]+)$/.exec(path);
  if (method === "PUT" && entry) {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    const content = {
      kind: "put-entry-values",
      projectId: PROJECT_ID,
      providerId: PINSEL_CONTENT_PROVIDER_ID,
      modelId: decodeURIComponent(entry[1]!),
      entryId: decodeURIComponent(entry[2]!),
      expectedRevision: body.expectedRevision,
      values: body.values,
    };
    return applyOperation(context, request.headers.get("idempotency-key"), content, body.expectedBaselineRevision);
  }
  if (method === "POST" && path === "/snapshots") {
    const body = await readJson(request);
    if (!body || !Number.isSafeInteger(body.expectedDraftRevision)) return json({ status: "rejected", code: "validation", message: "expectedDraftRevision is required." }, 400);
    const result = await context.adapter.snapshot({ expectedDraftRevision: body.expectedDraftRevision as number });
    return json(result, statusCodeFor(result));
  }
  const snapshot = /^\/snapshots\/([0-9a-f]{64})$/.exec(path);
  if (method === "GET" && snapshot) {
    const result = await context.adapter.readSnapshot(snapshot[1]!);
    return json(result, statusCodeFor(result));
  }
  return null;
}

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  // The document is only ever shown inside the editor on the same origin.
  "content-security-policy": "frame-ancestors 'self'",
  "x-robots-tag": "noindex",
};

export async function handlePreview(url: URL, context: ApiContext): Promise<Response | null> {
  if (url.pathname === "/preview/" || url.pathname === "/preview") return new Response(previewShellDocument(), { headers: HTML_HEADERS });
  const match = /^\/preview\/([0-9a-f]{64})(\/.*)$/.exec(url.pathname);
  if (!match) return null;
  const [, snapshotId, route] = match;
  if (!PREVIEW_ROUTES.includes(route!)) return new Response(`Route ${route} is not an approved preview route.`, { status: 404, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const revisionText = url.searchParams.get("revision");
  const requestedRevision = revisionText === null ? null : Number(revisionText);
  if (requestedRevision !== null && !Number.isSafeInteger(requestedRevision)) return new Response("revision must be an integer", { status: 400, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const stored = await context.adapter.readSnapshot(snapshotId!);
  if (stored.status !== "ok") return new Response(`Snapshot ${snapshotId} is ${stored.status}.`, { status: stored.status === "not-found" ? 404 : 503, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const rendered = await renderPreviewDocument(stored.value, route!, requestedRevision);
  if (rendered.status === "blocked") return new Response(rendered.message, { status: 422, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  return new Response(rendered.html, { status: rendered.status === "ok" ? 200 : rendered.status === "unknown-route" ? 404 : 409, headers: HTML_HEADERS });
}
