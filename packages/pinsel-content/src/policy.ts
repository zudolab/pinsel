import type { JsonValue } from "@zudo-composer/component-contract";
import type { ContentFieldDefinition, ContentModelRecord, ContentValueSchema } from "zudo-composer/site-project";

import { isAllowedSchoolUrl } from "./invariants";
import { PINSEL_CONTENT_PROVIDER_ID, PINSEL_MODELS, type PinselModelId } from "./models";
import { checkNoteMarkdown, isAllowedLinkHref } from "./richtext-policy";

// Thin local form of the `HostContentPolicy` contract from Composer #903
// milestone 1 (Takazudo/zudo-composer#903, item 2). Gate-1 (#7) reconciles
// this shape with the pinned `zudo-composer/content` entry.

export type ContentOperation = "update" | "create" | "delete" | "reorder";

export interface ModelPolicy {
  /** Field KEYS the client editor may write. Everything else is read-only. */
  fields: readonly string[];
  operations: readonly ContentOperation[];
}

export interface HostContentPolicy {
  projectId: string;
  providerId: string;
  models: Readonly<Record<string, ModelPolicy>>;
}

export type ContentMutationRequest =
  | { kind: "update-entry"; modelId: string; entryId: string; values: Record<string, JsonValue> }
  | { kind: "create-entry"; modelId: string; entryId: string; values: Record<string, JsonValue> }
  | { kind: "delete-entry"; modelId: string; entryId: string }
  | { kind: "reorder-entries"; modelId: string; entryIds: readonly string[] };

export type AuthorizationFailureCode =
  | "invalid-request"
  | "unknown-model"
  | "forbidden-operation"
  | "unknown-field"
  | "forbidden-field"
  | "missing-required"
  | "invalid-value"
  | "unsafe-link"
  | "unsafe-markdown"
  | "unsafe-id";

export interface AuthorizationIssue {
  code: AuthorizationFailureCode;
  message: string;
  field?: string;
}

export type AuthorizationResult =
  | { ok: true; request: ContentMutationRequest; model: ContentModelRecord }
  | { ok: false; issues: readonly AuthorizationIssue[] };

/** Composer `RECORD_ID_PATTERN`. */
export const RECORD_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/;

export const EVERY_OPERATION: readonly ContentOperation[] = ["update", "create", "delete", "reorder"];
const UPDATE_ONLY: readonly ContentOperation[] = ["update"];
const UPDATE_REORDER: readonly ContentOperation[] = ["update", "reorder"];

function allFieldsExcept(modelId: PinselModelId, ...excluded: string[]): string[] {
  const model = PINSEL_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Unknown model ${modelId}`);
  return model.document.fields.map((field) => field.key).filter((key) => !excluded.includes(key));
}

/**
 * The client may edit copy, prices, results, testimonials, FAQ and notes, and
 * add/remove/reorder inside collections whose size is free. Slugs, routes,
 * hrefs, placement choices and `order` (owned by `reorder-entries`) stay read-only.
 */
export const PINSEL_CONTENT_POLICY: HostContentPolicy = {
  projectId: "pinsel",
  providerId: PINSEL_CONTENT_PROVIDER_ID,
  models: {
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
  },
};

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntryRef(value: JsonValue, schema: Extract<ContentValueSchema, { kind: "reference" }>): boolean {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 3 &&
    value.providerId === schema.target.providerId &&
    value.modelId === schema.target.recordId &&
    typeof value.recordId === "string" &&
    RECORD_ID_PATTERN.test(value.recordId)
  );
}

/** Composer `isContentUrl`: site path, fragment, or http/https/mailto/tel URL. The host narrows this further. */
export function isComposerUrl(value: string): boolean {
  if (/[\s\\]/.test(value) || Array.from(value).some((character) => character.charCodeAt(0) < 32)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[^\s]*$/.test(value)) return true;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Typed-value check for the kinds Pinsel models use (mirrors Composer `isValueValidForField`). */
export function isValueValidForSchema(schema: ContentValueSchema, value: JsonValue): boolean {
  switch (schema.kind) {
    case "text":
    case "long-text":
    case "markdown":
    case "color":
    case "date":
      return typeof value === "string";
    case "slug":
      return typeof value === "string" && (value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
    case "url":
      return typeof value === "string" && (value === "" || isComposerUrl(value));
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "choice":
      return typeof value === "string" && schema.options.some((option) => option.value === value);
    case "reference":
      return isEntryRef(value, schema);
    case "reference-list":
      return (
        Array.isArray(value) &&
        value.every((item) => isEntryRef(item, { kind: "reference", target: schema.target })) &&
        new Set(value.map((item) => (item as { recordId: string }).recordId)).size === value.length
      );
    case "list":
      return Array.isArray(value) && value.every((item) => isValueValidForSchema(schema.item, item));
    case "object":
      return (
        isPlainObject(value) &&
        schema.fields.every((field) => {
          const nested = value[field.id];
          return nested === undefined ? !field.required : isValueValidForSchema(field, nested);
        })
      );
    case "asset-use":
      return false;
  }
}

function isEmpty(value: JsonValue): boolean {
  return value === "" || (Array.isArray(value) && value.length === 0);
}

/** Host-specific rules on top of the typed check: note markdown, allowed link targets, school URLs. */
export function checkFieldValue(model: ContentModelRecord, field: ContentFieldDefinition, value: JsonValue): AuthorizationIssue[] {
  if (!isValueValidForSchema(field, value)) {
    return [{ code: "invalid-value", field: field.key, message: `${field.key}: ${field.kind} の値ではありません` }];
  }
  if (field.required && isEmpty(value)) {
    return [{ code: "missing-required", field: field.key, message: `${field.key} は必須です` }];
  }
  if (field.kind === "markdown" && typeof value === "string") {
    const issues = checkNoteMarkdown(value);
    if (issues.length > 0) {
      return issues.map((issue) => ({
        code: issue.code === "unsafe-link" ? "unsafe-link" : "unsafe-markdown",
        field: field.key,
        message: `${field.key} ${issue.line}行目: ${issue.message}`,
      }));
    }
  }
  if (field.kind === "url" && typeof value === "string" && value !== "" && !isAllowedLinkHref(value)) {
    return [{ code: "unsafe-link", field: field.key, message: `${field.key}: 内部パスか https:// のみ使えます` }];
  }
  if (model.id === "result-entry" && field.key === "url" && typeof value === "string" && value !== "" && !isAllowedSchoolUrl(value)) {
    return [{ code: "unsafe-link", field: field.key, message: `${field.key}: 許可された大学サイト以外は使えません` }];
  }
  return [];
}

export interface AuthorizationContext {
  policy?: HostContentPolicy;
  models?: readonly ContentModelRecord[];
  /** Current entry ids of the request's model; required to authorize `reorder-entries` and `delete-entry`. */
  existingEntryIds?: readonly string[];
}

function fail(...issues: AuthorizationIssue[]): AuthorizationResult {
  return { ok: false, issues };
}

function checkValues(
  model: ContentModelRecord,
  modelPolicy: ModelPolicy,
  values: Record<string, JsonValue>,
  requireAll: boolean,
): AuthorizationIssue[] {
  const issues: AuthorizationIssue[] = [];
  for (const [key, value] of Object.entries(values)) {
    const field = model.document.fields.find((candidate) => candidate.key === key);
    if (!field) {
      issues.push({ code: "unknown-field", field: key, message: `${model.id} に ${key} はありません` });
      continue;
    }
    if (!modelPolicy.fields.includes(key)) {
      issues.push({ code: "forbidden-field", field: key, message: `${model.id}.${key} は編集できません` });
      continue;
    }
    issues.push(...checkFieldValue(model, field, value));
  }
  if (requireAll) {
    for (const key of modelPolicy.fields) {
      const field = model.document.fields.find((candidate) => candidate.key === key);
      if (field?.required && !(key in values)) {
        issues.push({ code: "missing-required", field: key, message: `${key} は必須です` });
      }
    }
  }
  return issues;
}

/**
 * Decides whether a client mutation may reach the store. Value checks run on
 * the submitted keys only; `order` for created entries and the singleton
 * entry id are assigned by the host, never by the request.
 */
export function authorizeContentMutation(request: ContentMutationRequest, context: AuthorizationContext = {}): AuthorizationResult {
  const policy = context.policy ?? PINSEL_CONTENT_POLICY;
  const models = context.models ?? PINSEL_MODELS;
  const model = models.find((candidate) => candidate.id === request.modelId);
  const modelPolicy = policy.models[request.modelId];
  if (!model || !modelPolicy) {
    return fail({ code: "unknown-model", message: `モデル ${request.modelId} は編集対象外です` });
  }
  const operation: ContentOperation =
    request.kind === "update-entry" ? "update" : request.kind === "create-entry" ? "create" : request.kind === "delete-entry" ? "delete" : "reorder";
  if (!modelPolicy.operations.includes(operation)) {
    return fail({ code: "forbidden-operation", message: `${model.id} では ${operation} は許可されていません` });
  }
  if (model.document.kind === "single" && request.kind !== "update-entry") {
    return fail({ code: "forbidden-operation", message: `${model.id} は1件のみです` });
  }

  switch (request.kind) {
    case "update-entry":
    case "create-entry": {
      if (!RECORD_ID_PATTERN.test(request.entryId)) {
        return fail({ code: "unsafe-id", message: `id "${request.entryId}" は使えません` });
      }
      if (model.document.kind === "single" && request.entryId !== model.id) {
        return fail({ code: "unsafe-id", message: `${model.id} のエントリー id は ${model.id} 固定です` });
      }
      if (!isPlainObject(request.values)) {
        return fail({ code: "invalid-request", message: "values はオブジェクトである必要があります" });
      }
      if (request.kind === "create-entry" && context.existingEntryIds?.includes(request.entryId)) {
        return fail({ code: "unsafe-id", message: `id "${request.entryId}" は既に存在します` });
      }
      const issues = checkValues(model, modelPolicy, request.values, request.kind === "create-entry");
      return issues.length > 0 ? fail(...issues) : { ok: true, request, model };
    }
    case "delete-entry": {
      if (context.existingEntryIds && !context.existingEntryIds.includes(request.entryId)) {
        return fail({ code: "invalid-request", message: `id "${request.entryId}" は存在しません` });
      }
      return { ok: true, request, model };
    }
    case "reorder-entries": {
      const ids = request.entryIds;
      if (new Set(ids).size !== ids.length || ids.some((id) => !RECORD_ID_PATTERN.test(id))) {
        return fail({ code: "invalid-request", message: "entryIds に重複または不正な id があります" });
      }
      const existing = context.existingEntryIds;
      if (!existing) {
        return fail({ code: "invalid-request", message: "並べ替えには現在の entry 一覧が必要です" });
      }
      const sameSet = existing.length === ids.length && existing.every((id) => ids.includes(id));
      if (!sameSet) {
        return fail({ code: "invalid-request", message: "entryIds は既存の全件を一度ずつ含む必要があります" });
      }
      return { ok: true, request, model };
    }
  }
}

/** Keys of `model` the policy leaves read-only (for editor rendering). */
export function readOnlyFields(policy: HostContentPolicy, model: ContentModelRecord): string[] {
  const editable = policy.models[model.id]?.fields ?? [];
  return model.document.fields.map((field) => field.key).filter((key) => !editable.includes(key));
}
