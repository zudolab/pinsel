import type { JsonValue } from "@zudo-composer/component-contract";
import { assertContentEntryMatchesModel, canonicalStringifyJson } from "zudo-composer/content";
import type { ContentEntryRecord, ContentModelRecord } from "zudo-composer/site-project";

// Three-way rebase of the draft's entries from the stored baseline onto a new
// canonical baseline. A side that left an entry (or a field) as the base had it
// takes the other side's version; only a field both sides changed differently,
// an entry one side deleted while the other changed it, or a draft entry the
// new models no longer accept is a conflict. `prefer` resolves conflicts in
// bulk; a draft entry the new schema rejects cannot be kept with `prefer: "draft"`.

export type RebasePreference = "draft" | "canonical";

export interface RebaseConflict {
  kind: "field" | "entry" | "schema";
  entryId: string;
  modelId: string;
  /** Field id for `field` conflicts. */
  fieldId?: string;
  base: JsonValue | null;
  draft: JsonValue | null;
  canonical: JsonValue | null;
  message?: string;
}

export interface RebasePlan {
  entries: ContentEntryRecord[];
  /** True when the draft differs from the stored baseline at all. */
  draftChanged: boolean;
  conflicts: RebaseConflict[];
  /** Conflicts `prefer` did not resolve; the rebase may only be written when this is empty. */
  unresolved: RebaseConflict[];
}

const content = (entry: ContentEntryRecord | undefined): string => (entry ? canonicalStringifyJson({ modelId: entry.modelId, lifecycle: entry.lifecycle, values: entry.values } as unknown as JsonValue) : "");
const same = (left: JsonValue | undefined, right: JsonValue | undefined): boolean => (left === undefined || right === undefined ? left === right : canonicalStringifyJson(left) === canonicalStringifyJson(right));
const valuesOf = (entry: ContentEntryRecord | undefined): JsonValue | null => (entry ? (entry.values as JsonValue) : null);

export function planRebase(base: readonly ContentEntryRecord[], draft: readonly ContentEntryRecord[], canonical: readonly ContentEntryRecord[], models: readonly ContentModelRecord[], prefer?: RebasePreference): RebasePlan {
  const byId = (list: readonly ContentEntryRecord[]) => new Map(list.map((entry) => [entry.id, entry]));
  const baseById = byId(base);
  const draftById = byId(draft);
  const canonicalById = byId(canonical);
  const ids = [...canonical.map((entry) => entry.id), ...draft.map((entry) => entry.id).filter((id) => !canonicalById.has(id))];
  const draftChanged = draft.length !== base.length || draft.some((entry) => content(entry) !== content(baseById.get(entry.id)));
  const conflicts: RebaseConflict[] = [];
  const unresolved: RebaseConflict[] = [];
  const entries: ContentEntryRecord[] = [];
  const conflict = (item: RebaseConflict, resolvable: boolean) => {
    conflicts.push(item);
    if (!prefer || !resolvable) unresolved.push(item);
  };

  for (const id of new Set(ids)) {
    const b = baseById.get(id);
    const d = draftById.get(id);
    const c = canonicalById.get(id);
    let merged: ContentEntryRecord | undefined;
    if (content(d) === content(b)) merged = c;
    else if (content(c) === content(b) || content(c) === content(d)) merged = d;
    else if (!d || !c) {
      const modelId = (d ?? c ?? b)!.modelId;
      conflict({ kind: "entry", entryId: id, modelId, base: valuesOf(b), draft: valuesOf(d), canonical: valuesOf(c), message: d ? "Removed from the canonical source but edited in the draft." : "Deleted in the draft but changed in the canonical source." }, true);
      merged = prefer === "draft" ? d : c;
    } else {
      const values: Record<string, JsonValue> = {};
      const fields = new Set([...Object.keys(b?.values ?? {}), ...Object.keys(d.values), ...Object.keys(c.values)]);
      for (const field of fields) {
        const bv = b?.values[field];
        const dv = d.values[field];
        const cv = c.values[field];
        let value: JsonValue | undefined;
        if (same(dv, bv)) value = cv;
        else if (same(cv, bv) || same(dv, cv)) value = dv;
        else {
          conflict({ kind: "field", entryId: id, modelId: c.modelId, fieldId: field, base: bv ?? null, draft: dv ?? null, canonical: cv ?? null }, true);
          value = prefer === "draft" ? dv : cv;
        }
        if (value !== undefined) values[field] = value;
      }
      merged = { ...c, values, lifecycle: d.lifecycle !== (b?.lifecycle ?? d.lifecycle) ? d.lifecycle : c.lifecycle };
    }
    if (!merged) continue;
    const model = models.find((candidate) => candidate.id === merged!.modelId);
    try {
      if (!model) throw new Error(`Model ${merged.modelId} no longer exists.`);
      assertContentEntryMatchesModel(merged, model, "put-entry");
    } catch (error) {
      if (merged === c) throw error;
      conflict({ kind: "schema", entryId: id, modelId: merged.modelId, base: valuesOf(b), draft: valuesOf(d), canonical: valuesOf(c), message: error instanceof Error ? error.message : String(error) }, prefer === "canonical");
      merged = prefer === "canonical" ? c : merged;
      if (!merged) continue;
    }
    entries.push(merged);
  }
  return { entries, draftChanged, conflicts, unresolved };
}
