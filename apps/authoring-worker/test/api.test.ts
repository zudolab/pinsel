import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { fieldId } from "@pinsel/content";
import { PINSEL_PACK_ID, PINSEL_PACK_VERSION } from "@pinsel/ui";

import { createApp } from "../src/app";
import { createFixtureIdentity } from "../src/auth/identity";
import { BASELINE } from "../src/site/baseline";
import { resetD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";

const ORIGIN = "https://authoring.example";
const PRICE = fieldId("course", "price");
const SLUG_LIKE = fieldId("course", "order");

function app(subject = "editor@example.test") {
  return createApp({ identity: createFixtureIdentity(subject) });
}

async function call(handler: ReturnType<typeof createApp>, path: string, init: RequestInit & { json?: unknown; origin?: string | null } = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  }
  const response = await handler.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers, body: init.json === undefined ? init.body : JSON.stringify(init.json) }), env);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON (HTML / text responses)
  }
  return { status: response.status, body: body as Record<string, any>, text, headers: response.headers };
}

async function readDraft(handler: ReturnType<typeof createApp>) {
  const draft = await call(handler, "/api/v1/draft");
  expect(draft.status).toBe(200);
  return draft.body.value as { draftRevision: number; baselineRevision: string; snapshot: { entries: { id: string; values: Record<string, unknown> }[] } };
}

function putPrice(revision: number, price: string, entryId = "two-month") {
  return { kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "course", entryId, expectedRevision: revision, values: { [PRICE]: price } };
}

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
});

describe("authoring API", () => {
  it("describes the site for the editor mount: baseline, presentation policy, pack, preview", async () => {
    const site = await call(app(), "/api/v1/site");
    expect(site.status).toBe(200);
    expect(site.body.baselineRevision).toBe(BASELINE.baselineRevision);
    expect(site.body.policy.models.course.fields).toContain(PRICE);
    expect(site.body.policy.models.course.fields).not.toContain(SLUG_LIKE);
    expect(site.body.pack).toEqual({ packId: PINSEL_PACK_ID, packVersion: PINSEL_PACK_VERSION });
    expect(site.body.preview).toEqual({ url: `${ORIGIN}/preview/`, origin: ORIGIN, route: "/" });
  });

  it("seeds the draft from the assembled baseline and saves a price with a receipt", async () => {
    const handler = app();
    const before = await readDraft(handler);
    expect(before.baselineRevision).toBe(BASELINE.baselineRevision);
    expect(before.snapshot.entries.find((entry) => entry.id === "two-month")?.values[PRICE]).toBe("¥50,000");
    const saved = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-1", request: putPrice(before.draftRevision, "¥55,000"), expectedBaselineRevision: before.baselineRevision } });
    expect(saved.status).toBe(200);
    expect(saved.body.status).toBe("ok");
    expect(saved.body.value.replayed).toBe(false);
    expect(saved.body.value.receipt.affectedEntryIds).toEqual(["two-month"]);
    const after = await readDraft(handler);
    expect(after.draftRevision).toBe(saved.body.value.draft.draftRevision);
    expect(after.snapshot.entries.find((entry) => entry.id === "two-month")?.values[PRICE]).toBe("¥55,000");
    const receipt = await call(handler, "/api/v1/operations/op-1");
    expect(receipt.body.value.operationId).toBe("op-1");
    // A second session sees the durable value, and the receipt only for its author.
    const other = app("someone-else@example.test");
    expect((await readDraft(other)).snapshot.entries.find((entry) => entry.id === "two-month")?.values[PRICE]).toBe("¥55,000");
    expect((await call(other, "/api/v1/operations/op-1")).status).toBe(404);
  });

  it("refuses a forbidden field, an unknown field and a structure write with typed codes, even via the REST alias", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const order = await call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-order" }, json: { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { [fieldId("course", "order")]: 9 } } });
    expect(order.status).toBe(422);
    expect(order.body.refusal.code).toBe("forbidden");
    const unknown = await call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-unknown" }, json: { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { "course-nope": "x" } } });
    expect(unknown.body.refusal.code).toBe("unknown-field");
    const model = await call(handler, "/api/v1/content/site-copy/site-copy", { method: "PUT", headers: { "idempotency-key": "op-model" }, json: { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { "site-copy-hero-label": "x" } } });
    // `site-copy` is policy-listed but not part of the Gate-1 snapshot: unknown-model, nothing written.
    expect(model.body.refusal.code).toBe("unknown-model");
    const create = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-create", request: { ...putPrice(draft.draftRevision, "¥1", "six-month"), kind: "create-entry" }, expectedBaselineRevision: draft.baselineRevision } });
    expect(create.body.refusal.code).toBe("forbidden");
    for (const path of ["/composer", "/mapping/x", "/sitemapper", "/api/v1/models", "/api/v1/upload", "/content/schema"]) {
      expect((await call(handler, path)).status, path).toBe(403);
    }
    expect((await readDraft(handler)).draftRevision).toBe(draft.draftRevision);
    for (const id of ["op-order", "op-unknown", "op-model", "op-create"]) expect((await call(handler, `/api/v1/operations/${id}`)).status, id).toBe(404);
  });

  it("reports a stale expectedRevision as a conflict and keeps the draft; identical retries replay", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const first = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-a", request: putPrice(draft.draftRevision, "¥51,000"), expectedBaselineRevision: draft.baselineRevision } });
    expect(first.body.status).toBe("ok");
    const stale = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-b", request: putPrice(draft.draftRevision, "¥52,000"), expectedBaselineRevision: draft.baselineRevision } });
    expect(stale.status).toBe(409);
    expect(stale.body).toEqual({ status: "conflict", reason: "draft-revision", current: { draftRevision: first.body.value.draft.draftRevision, baselineRevision: draft.baselineRevision } });
    const replay = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-a", request: putPrice(draft.draftRevision, "¥51,000"), expectedBaselineRevision: draft.baselineRevision } });
    expect(replay.body.value.replayed).toBe(true);
    expect((await readDraft(handler)).snapshot.entries.find((entry) => entry.id === "two-month")?.values[PRICE]).toBe("¥51,000");
    const wrongBaseline = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-c", request: putPrice(first.body.value.draft.draftRevision, "¥1"), expectedBaselineRevision: "other" } });
    expect(wrongBaseline.body).toMatchObject({ status: "conflict", reason: "baseline-revision" });
  });

  it("rejects mutations without a matching Origin, with a cross-site fetch hint or a non-JSON body", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const body = { operationId: "op-csrf", request: putPrice(draft.draftRevision, "¥1"), expectedBaselineRevision: draft.baselineRevision };
    expect((await call(handler, "/api/v1/operations", { method: "POST", json: body, origin: null })).status).toBe(403);
    expect((await call(handler, "/api/v1/operations", { method: "POST", json: body, origin: "https://evil.example" })).status).toBe(403);
    expect((await call(handler, "/api/v1/operations", { method: "POST", json: body, headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
    expect((await call(handler, "/api/v1/operations", { method: "POST", body: JSON.stringify(body), headers: { origin: ORIGIN, "content-type": "text/plain" } })).status).toBe(415);
    expect((await call(handler, "/api/v1/operations/op-csrf")).status).toBe(404);
  });

  it("captures immutable snapshots and renders the saved revision in the preview", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const saved = await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-p", request: putPrice(draft.draftRevision, "¥58,000"), expectedBaselineRevision: draft.baselineRevision } });
    const revision = saved.body.value.draft.draftRevision as number;
    const snapshot = await call(handler, "/api/v1/snapshots", { method: "POST", json: { expectedDraftRevision: revision } });
    expect(snapshot.status).toBe(200);
    const snapshotId = snapshot.body.value.snapshotId as string;
    expect(snapshotId).toMatch(/^[0-9a-f]{64}$/);
    const stale = await call(handler, "/api/v1/snapshots", { method: "POST", json: { expectedDraftRevision: draft.draftRevision } });
    expect(stale.body).toMatchObject({ status: "conflict", reason: "draft-revision" });

    const preview = await call(handler, `/preview/${snapshotId}/?revision=${revision}`);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(preview.text).toContain("¥58,000");
    expect(preview.text).toContain('<main id="main" tabindex="-1">');
    expect(preview.text).toContain("zudo-composer-host-preview");
    expect(preview.text).not.toMatch(/preact/i);
    expect(preview.text).not.toContain('"revision":null');

    // The snapshot stays at ¥58,000 after a later save, and an older revision claim is refused.
    await call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-q", request: putPrice(revision, "¥59,000"), expectedBaselineRevision: draft.baselineRevision } });
    expect((await call(handler, `/api/v1/snapshots/${snapshotId}`)).body.value.project.providers.content[0].entries.find((entry: { id: string }) => entry.id === "two-month").values[PRICE]).toBe("¥58,000");
    const mismatch = await call(handler, `/preview/${snapshotId}/?revision=${revision + 1}`);
    expect(mismatch.status).toBe(409);
    expect(mismatch.text).toContain("captured at revision");
    expect((await call(handler, `/preview/${"0".repeat(64)}/`)).status).toBe(404);
    expect((await call(handler, "/preview/")).status).toBe(200);
  });

  it("serves the editor and assets only behind the identity gate", async () => {
    const handler = app();
    const root = await handler.fetch(new Request(`${ORIGIN}/`), env);
    expect(root.status).toBe(302);
    expect(root.headers.get("location")).toBe(`${ORIGIN}/editor/`);
    const denied = createApp({ identity: async () => ({ ok: false, status: 401, code: "missing-assertion", message: "no" }) });
    expect((await call(denied, "/editor/")).status).toBe(401);
    expect((await call(denied, "/api/v1/draft")).status).toBe(401);
    expect((await call(denied, "/preview/")).status).toBe(401);
    expect((await call(denied, "/assets/fonts/fonts.css")).status).toBe(401);
  });
});
