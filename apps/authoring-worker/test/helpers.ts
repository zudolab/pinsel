import { env } from "cloudflare:workers";
import { expect } from "vitest";
import { fieldId } from "@pinsel/content";
import type { ContentBaseline } from "zudo-composer/host-storage";

import { createApp, type AppOptions } from "../src/app";
import { createFixtureIdentity } from "../src/auth/identity";
import { BASELINE } from "../src/site/baseline";

export const ORIGIN = "https://authoring.example";
export const PRICE = fieldId("course", "price");
/** The committed two-month price (the migrated ¥50,000 until a publication changes it). */
export const COMMITTED_PRICE = BASELINE.project.providers.content[0]!.entries.find((entry) => entry.id === "two-month")!.values[PRICE] as string;

export type Handler = ReturnType<typeof createApp>;
export type TestEnv = typeof env & { PUBLISHER_PROVIDER?: string; PROMOTION_POLICY?: string };

export function app(subject = "editor@example.test", options: Partial<AppOptions> = {}): Handler {
  return createApp({ identity: createFixtureIdentity(subject), ...options });
}

export interface CallInit extends RequestInit {
  json?: unknown;
  origin?: string | null;
  env?: TestEnv;
}

export async function call(handler: Handler, path: string, init: CallInit = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  }
  const { json, origin: _origin, env: callEnv, ...rest } = init;
  const response = await handler.fetch(new Request(`${ORIGIN}${path}`, { ...rest, headers, body: json === undefined ? init.body : JSON.stringify(json) }), callEnv ?? env);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON (HTML / text responses)
  }
  return { status: response.status, body: body as Record<string, any>, text, headers: response.headers };
}

export interface DraftView {
  draftRevision: number;
  baselineRevision: string;
  snapshot: { entries: { id: string; values: Record<string, unknown> }[] };
}

export async function readDraft(handler: Handler, callEnv?: TestEnv): Promise<DraftView> {
  const draft = await call(handler, "/api/v1/draft", { env: callEnv });
  expect(draft.status).toBe(200);
  return draft.body.value as DraftView;
}

export function priceOf(draft: DraftView, entryId = "two-month"): unknown {
  return draft.snapshot.entries.find((entry) => entry.id === entryId)?.values[PRICE];
}

export function putPrice(revision: number, price: string, entryId = "two-month") {
  return { kind: "put-entry-values", projectId: "pinsel", providerId: "content-filesystem", modelId: "course", entryId, expectedRevision: revision, values: { [PRICE]: price } };
}

/** Saves one price through the editor's path; returns the new draft revision. */
export async function savePrice(handler: Handler, price: string, options: { entryId?: string; operationId?: string; env?: TestEnv } = {}): Promise<number> {
  const draft = await readDraft(handler, options.env);
  const saved = await call(handler, "/api/v1/operations", { method: "POST", env: options.env, json: { operationId: options.operationId ?? `op-${crypto.randomUUID()}`, request: putPrice(draft.draftRevision, price, options.entryId), expectedBaselineRevision: draft.baselineRevision } });
  expect(saved.body.status, JSON.stringify(saved.body)).toBe("ok");
  return saved.body.value.draft.draftRevision as number;
}

export async function snapshotNow(handler: Handler, callEnv?: TestEnv): Promise<{ snapshotId: string; draftRevision: number; baselineRevision: string }> {
  const draft = await readDraft(handler, callEnv);
  const snapshot = await call(handler, "/api/v1/snapshots", { method: "POST", env: callEnv, json: { expectedDraftRevision: draft.draftRevision } });
  expect(snapshot.status).toBe(200);
  return snapshot.body.value;
}

/** The bundled baseline with some course prices changed and a new revision: an external canonical change. */
export function canonicalWith(revision: string, prices: Record<string, string> = {}): ContentBaseline {
  const project = structuredClone(BASELINE.project);
  for (const entry of project.providers.content[0]!.entries) {
    const price = prices[entry.id];
    if (price !== undefined) entry.values[PRICE] = price;
  }
  return { project, baselineRevision: revision };
}

export const COMMIT_1 = "1".repeat(40);
export const COMMIT_2 = "2".repeat(40);
