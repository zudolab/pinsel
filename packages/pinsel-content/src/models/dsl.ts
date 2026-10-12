import type { ContentModelRecord, Model, ModelInput } from "zudo-composer/site-project";

/**
 * The `site.model()` input that reproduces `record` byte for byte (asserted by
 * `models.test.ts`). Reference targets must already be declared, so callers
 * pass models in `PINSEL_MODELS` order and collect the returned `Model`s.
 */
export function modelInput(record: ContentModelRecord, declared: ReadonlyMap<string, Model>): ModelInput {
  const target = (recordId: string): Model => {
    const model = declared.get(recordId);
    if (!model) throw new Error(`Model "${record.id}" references "${recordId}" before it was declared.`);
    return model;
  };
  return {
    id: record.id,
    name: record.document.name,
    kind: record.document.kind,
    description: record.document.description,
    fields: record.document.fields.map((field) => {
      const base = { key: field.key, label: field.label, required: field.required };
      switch (field.kind) {
        case "reference":
          return { ...base, kind: "reference", target: target(field.target.recordId) };
        case "reference-list":
          return { ...base, kind: "reference-list", target: target(field.target.recordId), ordered: field.ordered };
        case "choice":
          return { ...base, kind: "choice", options: field.options };
        case "list":
          return { ...base, kind: "list", item: field.item };
        case "object":
          throw new Error("object fields are not used by Pinsel models");
        case "asset-use":
          return { ...base, kind: "asset-use", use: field.use };
        default:
          return { ...base, kind: field.kind };
      }
    }),
  };
}
