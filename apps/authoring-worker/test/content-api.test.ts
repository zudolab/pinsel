import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { PINSEL_CONTENT_POLICY, fieldId } from "@pinsel/content";
import { CONTENT_STORAGE_CONFORMANCE_POLICY, createContentStorageConformanceBaseline } from "zudo-composer/host-storage";

import { localSeedHandler } from "../src/admin/seed";
import type { AuthoringSite } from "../src/site/baseline";
import { resetD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";
import { COMMITTED_PRICE, PRICE, app, call, priceOf, putPrice, readDraft, savePrice } from "./helpers";

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
});

describe("permitted records", () => {
  it("lists only policy-listed models present in the draft, with values narrowed to permitted fields", async () => {
    const handler = app();
    const listed = await call(handler, "/api/v1/content");
    expect(listed.status).toBe(200);
    const ids: string[] = listed.body.value.models.map((model: { id: string }) => model.id);
    expect([...ids].sort()).toEqual(Object.keys(PINSEL_CONTENT_POLICY.models).sort());
    const course = listed.body.value.models.find((model: { id: string }) => model.id === "course");
    const permitted = PINSEL_CONTENT_POLICY.models.course!.fields;
    expect(course.operations).toEqual(["put-entry-values"]);
    expect(course.fields.every((field: { id: string }) => permitted.includes(field.id))).toBe(true);
    for (const entry of course.entries) expect(Object.keys(entry.values).every((field) => permitted.includes(field))).toBe(true);
    expect(course.entries.map((entry: { id: string }) => entry.id).sort()).toEqual(["consultation", "four-month", "two-month"]);
    const one = await call(handler, "/api/v1/content/course/two-month");
    expect(one.body.value.entry.values[fieldId("course", "price")]).toBe(COMMITTED_PRICE);
    expect((await call(handler, "/api/v1/content/course/nope")).status).toBe(404);
    expect((await call(handler, "/api/v1/content/no-such-model")).status).toBe(404);
  });
});

describe("collection operations", () => {
  const conformance = createContentStorageConformanceBaseline("baseline-1");
  const conformanceSite: AuthoringSite = {
    projectId: conformance.project.id,
    providerId: "content-filesystem",
    canonical: conformance,
    policy: CONTENT_STORAGE_CONFORMANCE_POLICY,
    editorPolicy: CONTENT_STORAGE_CONFORMANCE_POLICY,
    refuse: () => null,
    packageIdentity: conformance.project.componentPack,
    approvedRoutes: [],
  };

  it("adds and reorders entries of a declared collection through the REST aliases, policy-checked", async () => {
    const handler = app("editor@example.test", { site: conformanceSite });
    let draft = await readDraft(handler);
    const created = await call(handler, "/api/v1/content/notes", { method: "POST", headers: { "idempotency-key": "op-create" }, json: { entryId: "third", expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { title: "Third", body: "", order: 2, related: [] } } });
    expect(created.body.status, JSON.stringify(created.body)).toBe("ok");
    draft = await readDraft(handler);
    expect(draft.snapshot.entries.map((entry) => entry.id)).toContain("third");
    const reordered = await call(handler, "/api/v1/content/notes/reorder", { method: "POST", headers: { "idempotency-key": "op-reorder" }, json: { entryIds: ["third", "second", "first"], expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision } });
    expect(reordered.body.status, JSON.stringify(reordered.body)).toBe("ok");
    const listed = await call(handler, "/api/v1/content/notes");
    const order = Object.fromEntries(listed.body.value.models[0].entries.map((entry: { id: string; values: { order: number } }) => [entry.id, entry.values.order]));
    expect(order.third).toBeLessThan(order.second);
    expect(order.second).toBeLessThan(order.first);
  });

  it("refuses add and reorder on a collection whose policy is update-only", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const created = await call(handler, "/api/v1/content/course", { method: "POST", headers: { "idempotency-key": "op-c" }, json: { entryId: "six-month", expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { [fieldId("course", "price")]: "¥1" } } });
    expect(created.body.refusal.code).toBe("forbidden");
    const reordered = await call(handler, "/api/v1/content/course/reorder", { method: "POST", headers: { "idempotency-key": "op-r" }, json: { fieldId: fieldId("course", "order"), entryIds: ["four-month", "two-month", "consultation"], expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision } });
    expect(reordered.body.refusal.code).toBe("forbidden");
    expect((await readDraft(handler)).draftRevision).toBe(draft.draftRevision);
  });
});

describe("unsafe values and concurrency", () => {
  it("refuses raw HTML in markdown and unsafe URLs before anything is written", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const html = await call(handler, "/api/v1/content/note/a", { method: "PUT", headers: { "idempotency-key": "op-html" }, json: { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { [fieldId("note", "body")]: "<script>alert(1)</script>" } } });
    expect(html.status).toBe(422);
    expect(html.body.refusal.code).toBe("invalid-value");
    const url = await call(handler, "/api/v1/content/result-entry/a", { method: "PUT", headers: { "idempotency-key": "op-url" }, json: { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { [fieldId("result-entry", "url")]: "javascript:alert(1)" } } });
    expect(url.body.refusal.code).toBe("unsafe-reference");
    expect((await readDraft(handler)).draftRevision).toBe(draft.draftRevision);
  });

  it("refuses request bodies with keys beyond the documented ones (a file path is never ignored)", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const base = { expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision };
    const attempts = [
      call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-path" }, json: { ...base, values: { [PRICE]: "¥1" }, path: "apps/site/zfb.config.ts" } }),
      call(handler, "/api/v1/content/course", { method: "POST", headers: { "idempotency-key": "op-files" }, json: { ...base, entryId: "two-month", values: {}, files: ["package.json"] } }),
      call(handler, "/api/v1/content/course-step/reorder", { method: "POST", headers: { "idempotency-key": "op-reorder" }, json: { ...base, entryIds: [], patch: {} } }),
      call(handler, "/api/v1/operations", { method: "POST", json: { operationId: "op-extra", request: putPrice(draft.draftRevision, "¥1"), expectedBaselineRevision: draft.baselineRevision, path: "content/entries" } }),
    ];
    for (const answer of await Promise.all(attempts)) {
      expect(answer.status).toBe(422);
      expect(answer.body.refusal).toMatchObject({ code: "malformed-request", message: expect.stringMatching(/^Unexpected field "(path|files|patch)"\.$/) });
    }
    expect((await call(handler, "/api/v1/snapshots", { method: "POST", json: { expectedDraftRevision: draft.draftRevision, project: {} } })).status).toBe(422);
    expect(await readDraft(handler)).toMatchObject({ draftRevision: draft.draftRevision });
    expect(priceOf(await readDraft(handler))).toBe(COMMITTED_PRICE);
  });

  it("lets exactly one of two concurrent sessions win the same revision; the other gets a recoverable conflict", async () => {
    const a = app("editor@example.test");
    const b = app("second@example.test");
    const draft = await readDraft(a);
    const [left, right] = await Promise.all([
      call(a, "/api/v1/operations", { method: "POST", json: { operationId: "op-left", request: putPrice(draft.draftRevision, "¥51,000"), expectedBaselineRevision: draft.baselineRevision } }),
      call(b, "/api/v1/operations", { method: "POST", json: { operationId: "op-right", request: putPrice(draft.draftRevision, "¥52,000"), expectedBaselineRevision: draft.baselineRevision } }),
    ]);
    const statuses = [left.body.status, right.body.status].sort();
    expect(statuses).toEqual(["conflict", "ok"]);
    const winner = left.body.status === "ok" ? "¥51,000" : "¥52,000";
    const after = await readDraft(a);
    expect(after.draftRevision).toBe(draft.draftRevision + 1);
    expect(priceOf(after)).toBe(winner);
  });

  it("answers a reused Idempotency-Key with a different request as an operation-id conflict", async () => {
    const handler = app();
    const draft = await readDraft(handler);
    const body = (price: string) => ({ expectedRevision: draft.draftRevision, expectedBaselineRevision: draft.baselineRevision, values: { [fieldId("course", "price")]: price } });
    expect((await call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-key" }, json: body("¥53,000") })).body.status).toBe("ok");
    const replay = await call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-key" }, json: body("¥53,000") });
    expect(replay.body.value.replayed).toBe(true);
    const reused = await call(handler, "/api/v1/content/course/two-month", { method: "PUT", headers: { "idempotency-key": "op-key" }, json: body("¥54,000") });
    expect(reused.status).toBe(409);
    expect(reused.body).toMatchObject({ status: "conflict", reason: "operation-id" });
    expect(priceOf(await readDraft(handler))).toBe("¥53,000");
  });
});

describe("local seed endpoint", () => {
  it("exists only where the entry compiles it in, and never overwrites newer rows", async () => {
    const production = app();
    expect((await call(production, "/admin/seed", { method: "POST", json: {} })).status).toBe(404);

    const local = app("local-dev@example.test", { admin: localSeedHandler });
    const first = await call(local, "/admin/seed", { method: "POST", json: {} });
    expect(first.body.value).toMatchObject({ seeded: true, draftRevision: 1 });
    await savePrice(local, "¥59,000");
    const again = await call(local, "/admin/seed", { method: "POST", json: {} });
    expect(again.body.value).toMatchObject({ seeded: false, draftRevision: 2 });
    expect(priceOf(await readDraft(local))).toBe("¥59,000");
    expect((await call(local, "/admin/seed", { method: "POST", origin: null, json: {} })).status).toBe(403);
  });
});
