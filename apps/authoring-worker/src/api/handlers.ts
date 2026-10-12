import type { HostContentActor } from "zudo-composer/content";
import { applyHostContentRequest, isHostContentOperationId, readHostContentReceipt, type ContentDraftState, type ContentDraftStorageAdapter, type HostContentApplyResult } from "zudo-composer/host-storage";
import { advanceFromPublication } from "../baseline/advance";
import { ensureBaselinePreview } from "../baseline/preview-snapshot";
import { reconcileCanonical } from "../baseline/reconcile-canonical";
import { PREVIEW_PACK, previewRoutesOf, previewShellDocument, renderPreviewDocument } from "../preview/preview";
import { requestPublication, type PublicationContext } from "../publish/jobs";
import { reconcilePublication } from "../publish/reconcile";
import type { PublisherSelection } from "../publish/port";
import type { AuthoringSite } from "../site/baseline";

// The Worker API the editor and `curl` talk to. Every response body is JSON
// with a `status` discriminator from the upstream vocabulary (`ok | conflict |
// refused | rejected | not-found | unavailable | uncertain`); the HTTP code
// only mirrors it for humans and tooling. Absent by design: executable
// MDX/JSX/raw HTML, file patches, shell commands, schema/model editing,
// uploads (docs/authoring-worker.md).

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

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const malformed = (message: string, path?: string): HostContentApplyResult => ({ status: "refused", refusal: { ok: false, code: "malformed-request", message, ...(path ? { path } : {}) } });

const rejected = (message: string, path?: string) => ({ status: "rejected", code: "validation", message, ...(path ? { path } : {}) });

/** Request bodies carry exactly these keys; anything else (a sha, a file path, a URL) is refused, never ignored. */
function exactBody(body: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): string | null {
  const unknown = Object.keys(body).find((key) => !required.includes(key) && !optional.includes(key));
  if (unknown) return `Unexpected field "${unknown}".`;
  const missing = required.find((key) => !Object.hasOwn(body, key));
  return missing ? `"${missing}" is required.` : null;
}

export interface ApiContext {
  db: D1Database;
  adapter: ContentDraftStorageAdapter;
  actor: HostContentActor;
  origin: string;
  site: AuthoringSite;
  publisher: PublisherSelection;
}

function publicationContext(context: ApiContext): PublicationContext {
  return { db: context.db, projectId: context.site.projectId, adapter: context.adapter, actor: context.actor, publisher: context.publisher, packageIdentity: context.site.packageIdentity };
}

async function applyOperation(context: ApiContext, operationId: unknown, request: unknown, expectedBaselineRevision: unknown): Promise<Response> {
  if (!isHostContentOperationId(operationId)) return json(malformed("operationId must be a short opaque token.", "operationId"), 422);
  if (typeof expectedBaselineRevision !== "string" || expectedBaselineRevision.length === 0) return json(malformed("expectedBaselineRevision is required.", "expectedBaselineRevision"), 422);
  // Host field rules (Pinsel: note markdown subset, link targets, order is reorder-only) refuse before anything is written.
  const refused = context.site.refuse(request);
  if (refused) return json({ status: "refused", refusal: refused } satisfies HostContentApplyResult, 422);
  // `applyHostContentRequest` runs upstream `authorizeContentMutation` with the server policy on every mutation.
  const result = await applyHostContentRequest(context.adapter, { operationId, request, expectedBaselineRevision }, { policy: context.site.policy, actor: context.actor });
  return json(result, statusCodeFor(result));
}

/** Models, fields and entries the policy lets this role see, values narrowed to the permitted fields. */
function permittedContent(context: ApiContext, draft: ContentDraftState, modelId?: string) {
  const policy = context.site.policy;
  return draft.snapshot.models
    .filter((model) => Object.hasOwn(policy.models, model.id) && (modelId === undefined || model.id === modelId))
    .map((model) => {
      const allowed = policy.models[model.id]!;
      return {
        id: model.id,
        name: model.document.name,
        kind: model.document.kind,
        operations: allowed.operations,
        fields: model.document.fields.filter((field) => allowed.fields.includes(field.id)),
        entries: draft.snapshot.entries
          .filter((entry) => entry.modelId === model.id)
          .map((entry) => ({ id: entry.id, modelId: entry.modelId, lifecycle: entry.lifecycle, generation: entry.generation, updatedAt: entry.updatedAt, values: Object.fromEntries(Object.entries(entry.values).filter(([field]) => allowed.fields.includes(field))) })),
      };
    });
}

function orderField(context: ApiContext, modelId: string): string | undefined {
  const fields = context.site.policy.models[modelId]?.fields ?? [];
  return fields.find((field) => field === `${modelId}-order`) ?? fields.find((field) => field === "order");
}

export async function handleApi(request: Request, url: URL, context: ApiContext): Promise<Response | null> {
  const path = url.pathname.slice(API_PREFIX.length) || "/";
  const method = request.method;
  const site = context.site;
  const base = { projectId: site.projectId, providerId: site.providerId };

  if (method === "GET" && path === "/site") {
    // The editor saves against the STORED baseline: after a publication advance it moves without a Worker redeploy.
    const baseline = await context.adapter.readBaseline();
    if (baseline.status !== "ok") return json({ status: "unavailable", message: "The baseline is not seeded." }, 503);
    const routes = await previewRoutesOf(baseline.value, site.approvedRoutes);
    return json({
      status: "ok",
      ...base,
      baselineRevision: baseline.value.baselineRevision,
      canonicalBaselineRevision: site.canonical.baselineRevision,
      pack: PREVIEW_PACK,
      policy: site.editorPolicy,
      routes,
      preview: { url: `${context.origin}/preview/`, origin: context.origin, route: routes[0] ?? "/" },
      baselinePreview: await ensureBaselinePreview(context.db, site.projectId, baseline.value),
      publication: context.publisher.ok ? { providerId: context.publisher.port.providerId, promotionPolicy: context.publisher.config.promotionPolicy } : { state: "configuration-required", message: context.publisher.message },
      actor: context.actor,
    });
  }
  if (method === "GET" && path === "/draft") {
    const draft = await context.adapter.readDraft();
    return json(draft, statusCodeFor(draft));
  }

  // --- content: permitted records, saves (Composer request vocabulary), REST aliases ---
  const contentPath = /^\/content(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(path);
  if (method === "GET" && contentPath) {
    const draft = await context.adapter.readDraft();
    if (draft.status !== "ok") return json(draft, statusCodeFor(draft));
    const [, modelPart, entryPart] = contentPath;
    const modelId = modelPart === undefined ? undefined : decodeURIComponent(modelPart);
    const models = permittedContent(context, draft.value, modelId);
    if (modelId !== undefined && models.length === 0) return json({ status: "not-found", message: `Model ${modelId} is not editable.` }, 404);
    const meta = { draftRevision: draft.value.draftRevision, baselineRevision: draft.value.baselineRevision };
    if (entryPart === undefined) return json({ status: "ok", value: { ...meta, models } });
    const entryId = decodeURIComponent(entryPart);
    const entry = models[0]!.entries.find((candidate) => candidate.id === entryId);
    return entry ? json({ status: "ok", value: { ...meta, entry } }) : json({ status: "not-found" }, 404);
  }
  if (method === "POST" && path === "/operations") {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    const shape = exactBody(body, ["operationId", "request", "expectedBaselineRevision"]);
    if (shape) return json(malformed(shape), 422);
    return applyOperation(context, body.operationId, body.request, body.expectedBaselineRevision);
  }
  const receipt = /^\/operations\/([^/]+)$/.exec(path);
  if (method === "GET" && receipt) {
    const result = await readHostContentReceipt(context.adapter, decodeURIComponent(receipt[1]!), context.actor);
    return json(result, statusCodeFor(result));
  }
  // REST aliases for one Entry / one collection: the same save path, with the operation id in `Idempotency-Key`.
  const entry = /^\/content\/([^/]+)\/([^/]+)$/.exec(path);
  if (method === "PUT" && entry) {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    const shape = exactBody(body, ["expectedRevision", "expectedBaselineRevision", "values"]);
    if (shape) return json(malformed(shape), 422);
    const content = { kind: "put-entry-values", ...base, modelId: decodeURIComponent(entry[1]!), entryId: decodeURIComponent(entry[2]!), expectedRevision: body.expectedRevision, values: body.values };
    return applyOperation(context, request.headers.get("idempotency-key"), content, body.expectedBaselineRevision);
  }
  const collection = /^\/content\/([^/]+)$/.exec(path);
  if (method === "POST" && collection) {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    const shape = exactBody(body, ["entryId", "expectedRevision", "expectedBaselineRevision", "values"]);
    if (shape) return json(malformed(shape), 422);
    const content = { kind: "create-entry", ...base, modelId: decodeURIComponent(collection[1]!), entryId: body.entryId, expectedRevision: body.expectedRevision, values: body.values };
    return applyOperation(context, request.headers.get("idempotency-key"), content, body.expectedBaselineRevision);
  }
  const reorder = /^\/content\/([^/]+)\/reorder$/.exec(path);
  if (method === "POST" && reorder) {
    const body = await readJson(request);
    if (!body) return json(malformed("A JSON object body is required."), 400);
    const shape = exactBody(body, ["entryIds", "expectedRevision", "expectedBaselineRevision"], ["fieldId"]);
    if (shape) return json(malformed(shape), 422);
    const modelId = decodeURIComponent(reorder[1]!);
    const content = { kind: "reorder", ...base, modelId, fieldId: body.fieldId ?? orderField(context, modelId), entryIds: body.entryIds, expectedRevision: body.expectedRevision };
    return applyOperation(context, request.headers.get("idempotency-key"), content, body.expectedBaselineRevision);
  }

  // --- snapshots ---
  if (method === "POST" && path === "/snapshots") {
    const body = await readJson(request);
    if (!body || !Number.isSafeInteger(body.expectedDraftRevision)) return json(rejected("expectedDraftRevision is required.", "expectedDraftRevision"), 400);
    const shape = exactBody(body, ["expectedDraftRevision"]);
    if (shape) return json(rejected(shape), 422);
    const result = await context.adapter.snapshot({ expectedDraftRevision: body.expectedDraftRevision as number });
    return json(result, statusCodeFor(result));
  }
  const snapshot = /^\/snapshots\/([0-9a-f]{64})$/.exec(path);
  if (method === "GET" && snapshot) {
    const result = await context.adapter.readSnapshot(snapshot[1]!);
    return json(result, statusCodeFor(result));
  }

  // --- publications (provider port) ---
  if (method === "POST" && path === "/publications") {
    const body = await readJson(request);
    if (!body) return json(rejected("A JSON object body is required."), 400);
    const shape = exactBody(body, ["snapshotId", "expectedBaselineRevision"]);
    if (shape) return json(rejected(shape), 422);
    if (typeof body.snapshotId !== "string" || !/^[0-9a-f]{64}$/.test(body.snapshotId)) return json(rejected("snapshotId must be a snapshot digest.", "snapshotId"), 422);
    if (typeof body.expectedBaselineRevision !== "string" || body.expectedBaselineRevision.length === 0) return json(rejected("expectedBaselineRevision is required.", "expectedBaselineRevision"), 422);
    const result = await requestPublication(publicationContext(context), { snapshotId: body.snapshotId, expectedBaselineRevision: body.expectedBaselineRevision });
    return json(result, statusCodeFor(result));
  }
  const publication = /^\/publications\/([A-Za-z0-9._-]{1,128})$/.exec(path);
  if (method === "GET" && publication) {
    const result = await reconcilePublication(publicationContext(context), publication[1]!);
    return json(result, statusCodeFor(result));
  }

  // --- baseline: verified advance, canonical reconcile ---
  if (method === "GET" && path === "/baseline") {
    const baseline = await context.adapter.readBaseline();
    if (baseline.status !== "ok") return json(baseline, statusCodeFor(baseline));
    const [evidence, conflicts] = await context.db.batch<Record<string, unknown>>([
      context.db.prepare("SELECT job_id AS publicationId, git_sha AS gitSha, content_digest AS contentDigest, package_identity_json AS packageIdentity, advanced_at AS advancedAt FROM baseline_evidence WHERE project_id = ? AND git_sha = ?").bind(site.projectId, baseline.value.baselineRevision),
      context.db.prepare("SELECT conflict_id AS conflictId, stored_baseline AS storedBaselineRevision, canonical_baseline AS canonicalBaselineRevision, draft_revision AS draftRevision, detected_at AS detectedAt FROM baseline_conflicts WHERE project_id = ? AND state = 'open'").bind(site.projectId),
    ]);
    const proven = evidence?.results[0];
    return json({
      status: "ok",
      value: {
        baselineRevision: baseline.value.baselineRevision,
        canonicalBaselineRevision: site.canonical.baselineRevision,
        evidence: proven ? { ...proven, packageIdentity: JSON.parse(String(proven.packageIdentity)) } : null,
        openConflicts: conflicts?.results ?? [],
      },
    });
  }
  if (method === "POST" && path === "/baseline/advance") {
    const body = await readJson(request);
    if (!body) return json(rejected("A JSON object body is required."), 400);
    // Only a publication id: the sha is read from the provider's evidence, never accepted from a caller.
    const shape = exactBody(body, ["publicationId"]);
    if (shape) return json(rejected(shape), 422);
    if (typeof body.publicationId !== "string") return json(rejected("publicationId must be a string.", "publicationId"), 422);
    const result = await advanceFromPublication(publicationContext(context), body.publicationId);
    return json(result, statusCodeFor(result));
  }
  if (method === "POST" && path === "/baseline/reconcile") {
    const body = await readJson(request);
    if (!body) return json(rejected("A JSON object body is required."), 400);
    const shape = exactBody(body, [], ["conflictId", "expectedDraftRevision", "prefer"]);
    if (shape) return json(rejected(shape), 422);
    let resolution: Parameters<typeof reconcileCanonical>[1];
    if (body.conflictId !== undefined) {
      if (typeof body.conflictId !== "string" || !Number.isSafeInteger(body.expectedDraftRevision)) return json(rejected("A resolution needs conflictId and expectedDraftRevision.", "conflictId"), 422);
      if (body.prefer !== undefined && body.prefer !== "draft" && body.prefer !== "canonical") return json(rejected('prefer must be "draft" or "canonical".', "prefer"), 422);
      resolution = { conflictId: body.conflictId, expectedDraftRevision: body.expectedDraftRevision as number, ...(body.prefer ? { prefer: body.prefer as "draft" | "canonical" } : {}) };
    } else if (body.expectedDraftRevision !== undefined || body.prefer !== undefined) {
      return json(rejected("expectedDraftRevision and prefer only accompany a conflictId.", "conflictId"), 422);
    }
    const result = await reconcileCanonical({ db: context.db, projectId: site.projectId, providerId: site.providerId, adapter: context.adapter, canonical: site.canonical }, resolution);
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
  if (!context.site.approvedRoutes.includes(route!)) return new Response(`Route ${route} is not an approved preview route.`, { status: 404, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const revisionText = url.searchParams.get("revision");
  const requestedRevision = revisionText === null ? null : Number(revisionText);
  if (requestedRevision !== null && !Number.isSafeInteger(requestedRevision)) return new Response("revision must be an integer", { status: 400, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const stored = await context.adapter.readSnapshot(snapshotId!);
  if (stored.status !== "ok") return new Response(`Snapshot ${snapshotId} is ${stored.status}.`, { status: stored.status === "not-found" ? 404 : 503, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  const rendered = await renderPreviewDocument(stored.value, route!, requestedRevision);
  if (rendered.status === "blocked") return new Response(rendered.message, { status: 422, headers: { ...HTML_HEADERS, "content-type": "text/plain; charset=utf-8" } });
  return new Response(rendered.html, { status: rendered.status === "ok" ? 200 : rendered.status === "unknown-route" ? 404 : 409, headers: HTML_HEADERS });
}
