import type {
  ContentFieldDefinition,
  ContentModelRecord,
  ContentValueSchema,
} from "zudo-composer/site-project";

// Composer's authoring DSL (`zudo-composer/authoring`) is Node-only. The Worker
// and the editor need the same model records, so this module rebuilds the DSL's
// output shape without a runtime Composer import; the parity test asserts every
// record equals `defineSite().model()` byte for byte.

/** Same value as Composer's `CONTENT_PROVIDER_ID`, the provider `defineSite` writes to. */
export const PINSEL_CONTENT_PROVIDER_ID = "content-filesystem";

/** Same value as Composer's `DEFAULT_TIMESTAMP`: generated records stay byte-stable. */
export const MODEL_TIMESTAMP = "2026-09-12T00:00:00.000Z";

export type ScalarFieldKind =
  | "text"
  | "long-text"
  | "markdown"
  | "number"
  | "boolean"
  | "date"
  | "slug"
  | "color"
  | "url";

export type FieldSpec = {
  key: string;
  label: string;
  required?: boolean;
} & (
  | { kind: ScalarFieldKind }
  | { kind: "choice"; options: readonly { value: string; label: string }[] }
  | { kind: "reference"; target: string }
  | { kind: "reference-list"; target: string; ordered?: boolean }
  | { kind: "list"; item: ContentValueSchema }
);

export interface ModelSpec {
  id: string;
  name: string;
  description: string;
  kind: "single" | "collection";
  fields: readonly FieldSpec[];
}

/** `homeDescription` → `home-description`, matching Composer's `slugify` for field ids. */
export function kebab(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function fieldId(modelId: string, key: string): string {
  return `${modelId}-${kebab(key)}`;
}

function schemaOf(spec: FieldSpec): ContentValueSchema {
  switch (spec.kind) {
    case "choice":
      return { kind: "choice", options: spec.options.map((option) => ({ ...option })) };
    case "reference":
      return {
        kind: "reference",
        target: { providerId: PINSEL_CONTENT_PROVIDER_ID, recordId: spec.target },
      };
    case "reference-list":
      return {
        kind: "reference-list",
        target: { providerId: PINSEL_CONTENT_PROVIDER_ID, recordId: spec.target },
        ordered: spec.ordered ?? true,
      };
    case "list":
      return { kind: "list", item: spec.item };
    default:
      return { kind: spec.kind };
  }
}

export function defineModel(spec: ModelSpec): ContentModelRecord {
  const fields: ContentFieldDefinition[] = spec.fields.map((field) => ({
    id: fieldId(spec.id, field.key),
    key: field.key,
    label: field.label,
    required: field.required ?? true,
    ...schemaOf(field),
  }));
  return {
    id: spec.id,
    createdAt: MODEL_TIMESTAMP,
    updatedAt: MODEL_TIMESTAMP,
    document: {
      schemaVersion: 1,
      id: spec.id,
      name: spec.name,
      description: spec.description,
      kind: spec.kind,
      fields,
    },
  };
}

export function fieldByKey(model: ContentModelRecord, key: string): ContentFieldDefinition | undefined {
  return model.document.fields.find((field) => field.key === key);
}
