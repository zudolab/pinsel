import type { ContentEntryRecord } from "zudo-composer/site-project";
/** File-envelope check. The hosted projector/service validates model values. */
export function validateContentEntryRecord(value: unknown): { ok: true; value: ContentEntryRecord } | { ok: false; issue: { path: string; message: string } } {
 const v = value as ContentEntryRecord | null;
 if (!v || typeof v !== "object" || typeof v.id !== "string" || typeof v.modelId !== "string" || !v.values || typeof v.values !== "object" || Array.isArray(v.values) || !["draft","published","archived"].includes(v.lifecycle) || !Number.isInteger(v.generation) || typeof v.updatedAt !== "string") return { ok: false, issue: { path: "$", message: "Invalid content entry envelope" } };
 return { ok: true, value: v };
}
