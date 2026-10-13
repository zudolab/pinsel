import type { JsonValue } from "@zudo-composer/component-contract";
import {
  HOST_CONTENT_OPERATIONS,
  authorizeContentMutation,
  type AuthorizeContentMutationOptions,
  type ContentMutationAuthorization,
  type ContentMutationRefusal,
  type ContentMutationRequest,
  type ContentSnapshot,
  type HostContentActor,
  type HostContentOperation,
  type HostContentPolicy,
} from "zudo-composer/content";
import type { ContentFieldDefinition, ContentModelRecord } from "zudo-composer/site-project";

import { isAllowedSchoolUrl } from "./invariants";
import { PINSEL_CONTENT_PROVIDER_ID, PINSEL_MODELS, fieldId, type PinselModelId } from "./models";
import { checkNoteMarkdown, isAllowedLinkHref } from "./richtext-policy";

export type { ContentMutationRefusal, ContentMutationRequest, HostContentOperation, HostContentPolicy } from "zudo-composer/content";

// The trusted policy is Composer's `HostContentPolicy` (zudo-composer/content):
// field IDS per model and the upstream operation vocabulary. The key-based spec
// below is what docs/content-model.md documents; `PINSEL_CONTENT_POLICY` is
// what the Worker enforces and the editor presents.

export interface EditableFieldSpec {
  /** Field KEYS the client editor may write. Everything else is read-only. */
  fields: readonly string[];
  operations: readonly HostContentOperation[];
}

export const EVERY_OPERATION: readonly HostContentOperation[] = HOST_CONTENT_OPERATIONS;
const UPDATE_ONLY: readonly HostContentOperation[] = ["put-entry-values"];
const UPDATE_REORDER: readonly HostContentOperation[] = ["put-entry-values", "reorder"];

export const PINSEL_PROJECT_ID = "pinsel";

function allFieldsExcept(modelId: PinselModelId, ...excluded: string[]): string[] {
  const model = PINSEL_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Unknown model ${modelId}`);
  return model.document.fields.map((field) => field.key).filter((key) => !excluded.includes(key));
}

/**
 * The client may edit copy, prices, results, testimonials, FAQ and notes, and
 * add/remove/reorder inside collections whose size is free. Slugs, routes,
 * hrefs, placement choices and `order` (owned by `reorder`) stay read-only.
 */
export const PINSEL_EDITABLE_FIELDS: Readonly<Record<PinselModelId, EditableFieldSpec>> = {
  "site-copy": { fields: allFieldsExcept("site-copy", "brandWord", "brandSub"), operations: UPDATE_ONLY },
  "page-copy": { fields: allFieldsExcept("page-copy", "route", "order"), operations: UPDATE_ONLY },
  "nav-link": { fields: allFieldsExcept("nav-link", "href", "order"), operations: UPDATE_ONLY },
  "lessons-copy": { fields: allFieldsExcept("lessons-copy"), operations: UPDATE_ONLY },
  "about-copy": { fields: allFieldsExcept("about-copy"), operations: UPDATE_ONLY },
  "instructor-profile": { fields: allFieldsExcept("instructor-profile"), operations: UPDATE_ONLY },
  "contact-copy": { fields: allFieldsExcept("contact-copy"), operations: UPDATE_ONLY },
  course: { fields: allFieldsExcept("course", "order"), operations: UPDATE_ONLY },
  "course-step": { fields: allFieldsExcept("course-step", "order"), operations: UPDATE_REORDER },
  "target-item": { fields: allFieldsExcept("target-item", "order"), operations: EVERY_OPERATION },
  specialization: { fields: allFieldsExcept("specialization", "order"), operations: EVERY_OPERATION },
  "feature-card": { fields: allFieldsExcept("feature-card", "order"), operations: EVERY_OPERATION },
  "timeline-entry": { fields: allFieldsExcept("timeline-entry", "order"), operations: EVERY_OPERATION },
  "result-year": { fields: allFieldsExcept("result-year", "order"), operations: EVERY_OPERATION },
  "result-entry": { fields: allFieldsExcept("result-entry", "order"), operations: EVERY_OPERATION },
  "home-result": { fields: allFieldsExcept("home-result", "order"), operations: EVERY_OPERATION },
  testimonial: { fields: allFieldsExcept("testimonial", "order"), operations: EVERY_OPERATION },
  "home-voice": { fields: allFieldsExcept("home-voice", "order"), operations: EVERY_OPERATION },
  "faq-group": { fields: allFieldsExcept("faq-group", "order"), operations: EVERY_OPERATION },
  "faq-item": { fields: allFieldsExcept("faq-item", "order"), operations: EVERY_OPERATION },
  "home-faq": { fields: allFieldsExcept("home-faq", "order"), operations: EVERY_OPERATION },
  note: { fields: allFieldsExcept("note", "slug", "order"), operations: UPDATE_REORDER },
  "knowledge-card": { fields: allFieldsExcept("knowledge-card", "order"), operations: EVERY_OPERATION },
  "contact-step": { fields: allFieldsExcept("contact-step", "order"), operations: EVERY_OPERATION },
  "legal-row": { fields: allFieldsExcept("legal-row", "order"), operations: EVERY_OPERATION },
};

function hostPolicy(withOrder: boolean): HostContentPolicy {
  return {
    projectId: PINSEL_PROJECT_ID,
    providerId: PINSEL_CONTENT_PROVIDER_ID,
    models: Object.fromEntries(
      Object.entries(PINSEL_EDITABLE_FIELDS).map(([modelId, spec]) => {
        const fields = spec.fields.map((key) => fieldId(modelId, key));
        // Composer's `reorder` rewrites a *permitted* number field, so the server
        // policy must list `order` wherever reordering is allowed; Pinsel's own
        // rule below keeps it out of `put-entry-values`.
        if (withOrder && spec.operations.includes("reorder")) fields.push(fieldId(modelId, "order"));
        return [modelId, { fields, operations: spec.operations }];
      }),
    ),
  };
}

/** The trusted server policy the Worker enforces (`applyHostContentRequest`). */
export const PINSEL_CONTENT_POLICY: HostContentPolicy = hostPolicy(true);

/** The presentation copy `mountContentEditor` receives: `order` is never shown as editable; the server stays authoritative. */
export const PINSEL_EDITOR_POLICY: HostContentPolicy = hostPolicy(false);

/** Keys of `model` the policy leaves read-only (for documentation and editor rendering). */
export function readOnlyFields(policy: HostContentPolicy, model: ContentModelRecord): string[] {
  const editable = policy.models[model.id]?.fields ?? [];
  return model.document.fields.filter((field) => !editable.includes(field.id)).map((field) => field.key);
}

function refusal(code: ContentMutationRefusal["code"], message: string, path: string): ContentMutationRefusal {
  return { ok: false, code, message, path };
}

/**
 * Pinsel's rules on top of Composer's typed check: note markdown subset,
 * allowed link targets, school URLs. Returns the first refusal for one value.
 */
export function checkFieldValue(model: ContentModelRecord, field: ContentFieldDefinition, value: JsonValue): ContentMutationRefusal | null {
  const path = `values.${field.id}`;
  if (field.kind === "markdown" && typeof value === "string") {
    const issue = checkNoteMarkdown(value)[0];
    if (issue) {
      return refusal(issue.code === "unsafe-link" ? "unsafe-reference" : "invalid-value", `${field.key} ${issue.line}行目: ${issue.message}`, path);
    }
  }
  if (field.kind === "url" && typeof value === "string" && value !== "" && !isAllowedLinkHref(value)) {
    return refusal("unsafe-reference", `${field.key}: 内部パスか https:// のみ使えます`, path);
  }
  if (model.id === "result-entry" && field.key === "url" && typeof value === "string" && value !== "" && !isAllowedSchoolUrl(value)) {
    return refusal("unsafe-reference", `${field.key}: 許可された大学サイト以外は使えません`, path);
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Host rules over an untrusted request. Only a `put-entry-values` /
 * `create-entry` shape with a known model is inspected; everything else is
 * left to `authorizeContentMutation`, which refuses malformed requests.
 * `order` may be set on creation (the new entry's position) but changes only
 * through `reorder` afterwards.
 */
export function refusePinselRequest(request: unknown, models: readonly ContentModelRecord[] = PINSEL_MODELS): ContentMutationRefusal | null {
  if (!isPlainObject(request) || (request.kind !== "put-entry-values" && request.kind !== "create-entry")) return null;
  if (typeof request.modelId !== "string" || !isPlainObject(request.values)) return null;
  const model = models.find((candidate) => candidate.id === request.modelId);
  if (!model) return null;
  const orderField = fieldId(model.id, "order");
  if (request.kind === "put-entry-values" && orderField in request.values) {
    return refusal("forbidden", "表示順は並べ替え操作でのみ変更できます", `values.${orderField}`);
  }
  for (const [id, value] of Object.entries(request.values)) {
    const field = model.document.fields.find((candidate) => candidate.id === id);
    if (!field || value === null || value === undefined) continue;
    const refused = checkFieldValue(model, field, value as JsonValue);
    if (refused) return refused;
  }
  return null;
}

/** Composer's decision under `PINSEL_CONTENT_POLICY`, narrowed by Pinsel's field rules. */
export function authorizePinselMutation(actor: HostContentActor, request: unknown, snapshot: ContentSnapshot, options?: AuthorizeContentMutationOptions): ContentMutationAuthorization {
  const decision = authorizeContentMutation(PINSEL_CONTENT_POLICY, actor, request, snapshot, options);
  if (!decision.ok) return decision;
  return refusePinselRequest(decision.request, snapshot.models) ?? decision;
}

/** Composer `RECORD_ID_PATTERN`. */
export const RECORD_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/;
