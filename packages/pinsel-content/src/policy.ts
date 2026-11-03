import type { JsonValue, HostedPolicy, HostedProvider, ContentFieldDefinition, ContentModelRecord } from "zudo-composer/hosted-content";
import { isAllowedSchoolUrl } from "./invariants";
import { PINSEL_CONTENT_PROVIDER_ID, PINSEL_MODELS, fieldId, type PinselModelId } from "./models";
import { checkNoteMarkdown, isAllowedLinkHref } from "./richtext-policy";
export interface ContentMutationRefusal { ok: false; code: string; message: string; path: string }
export interface EditableFieldSpec {
  /** Field KEYS the client editor may write. Everything else is read-only. */
  fields: readonly string[];
  operations: readonly string[];
}

export const EVERY_OPERATION: readonly string[] = ["put-entry-values", "create-entry", "remove-entry", "reorder"];
const UPDATE_ONLY: readonly string[] = ["put-entry-values"];
const UPDATE_REORDER: readonly string[] = ["put-entry-values", "reorder"];

export const PINSEL_PROJECT_ID = "pinsel";

function allFieldsExcept(modelId: PinselModelId, ...excluded: string[]): string[] {
  const model = PINSEL_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Unknown model ${modelId}`);
  return model.document.fields.map((field) => field.key).filter((key) => !excluded.includes(key));
}

/** Historical import classification: operations preserve the protected-content
 * digest of the committed migration baseline. Runtime permissions are supplied
 * exclusively by createPinselHostedPolicy below (field editing only). */
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

/** The exact field/entry permissions enforced by the service, also supplied to its editor.
 * Structural collection mutation is deliberately outside this dogfood migration.
 */
export function createPinselHostedPolicy(providers: HostedProvider[]): HostedPolicy {
 return { models: providers.flatMap(provider => provider.models.map(model => ({
  providerId: provider.providerId, modelId: model.id,
  entryIds: provider.entries.filter(entry => entry.modelId === model.id).map(entry => entry.id),
  fields: (PINSEL_EDITABLE_FIELDS[model.id as PinselModelId]?.fields ?? []).map(key => ({ fieldId: fieldId(model.id, key), replace: true })),
 }))), collections: [], assets: [] };
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

export const RECORD_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/;
