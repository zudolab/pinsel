import type { HostedRecoveryCheckpoint } from "zudo-composer/hosted-content/editor";
import type { ContentEntryRef, HostedState } from "zudo-composer/hosted-content";
const object = (x: unknown): x is Record<string, any> => !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const count = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0;
export const entryRef = (x: unknown): x is ContentEntryRef => object(x) && [x.providerId,x.modelId,x.recordId].every(text);
const identities = (x: unknown) => object(x) && text(x.draftRevision) && text(x.definition) && object(x.baseline) && text(x.baseline.gitSha) && text(x.baseline.contentDigest);
/** Host-owned envelope validation. Unknown contracts are retained, never normalized or replayed. */
export function readCheckpoint(raw: string, current: HostedState): HostedRecoveryCheckpoint {
 const x: unknown = JSON.parse(raw);
 if (!object(x) || x.version !== 1 || !count(x.localRevision) || !Array.isArray(x.edits) || !('acknowledged' in x) || !('pending' in x) || x.creationDraft != null || x.publication != null) throw new Error("未対応または不正な回復schema");
 const known = (ref: unknown) => entryRef(ref) && current.providers.some(p=>p.providerId===ref.providerId && p.entries.some(e=>e.modelId===ref.modelId && e.id===ref.recordId));
 if (x.acknowledged !== null) {
  const state=x.acknowledged;
  if (!identities(state) || !count(state.integrationFence) || !Array.isArray(state.providers) || state.providers.length!==current.providers.length) throw new Error("不正な回復state");
  const providerIds=new Set();
  for (const p of state.providers) {
   const original=current.providers.find(item=>item.providerId===p?.providerId);
   if (!original || providerIds.has(p.providerId) || JSON.stringify(p.models)!==JSON.stringify(original.models) || !Array.isArray(p.entries) || p.entries.length!==original.entries.length) throw new Error("未対応の回復definition");
   providerIds.add(p.providerId);const ids=new Set();
   for (const e of p.entries) { if (!object(e) || !known({providerId:p.providerId,modelId:e.modelId,recordId:e.id}) || e.schemaVersion!==original.entries.find(item=>item.id===e.id)?.schemaVersion || !["draft","published"].includes(e.lifecycle) || !count(e.generation) || !object(e.values) || ids.has(e.id)) throw new Error("不正な回復entry"); ids.add(e.id); }
  }
 }
 for(const e of x.edits) if(!object(e)||!known(e.entry)||!text(e.fieldId)||!current.providers.find(p=>p.providerId===e.entry.providerId)?.models.find(m=>m.id===e.entry.modelId)?.document.fields.some(f=>f.id===e.fieldId)||!count(e.revision)||e.revision>x.localRevision) throw new Error("不正な回復edit");
 if(x.pending!==null){const p=x.pending,r=p?.request;if(!object(p)||!count(p.localRevision)||p.localRevision>x.localRevision||typeof p.rejected!=="boolean"||!object(r)||!text(r.operationKey)||!identities(r.expected))throw new Error("不正な回復operation");
  if(r.kind==="set-fields"){if(!known(r.entry)||!object(r.values)||!Array.isArray(r.clear)||!r.clear.every(text))throw new Error("不正な回復fields");}
  else if(r.kind==="restore-revision"){if(!known(r.entry)||!text(r.revisionId))throw new Error("不正な回復revision");}
  else if(r.kind!=="capture-snapshot")throw new Error("未対応の回復operation");
 }
 return x as unknown as HostedRecoveryCheckpoint;
}
export function readAiPointer(raw: string, key: string, prefix: string): {entry: ContentEntryRef; proposalId: string; action: "apply"|"undo"} | undefined {
 try { const x=JSON.parse(raw); if(!object(x)||!entryRef(x.entry)||!text(x.proposalId)||!["apply","undo"].includes(x.action)||key!==`${prefix}:${x.proposalId}:${x.action}` || (x.version!==undefined&&x.version!==1)) return; return {entry:x.entry,proposalId:x.proposalId,action:x.action}; } catch { return; }
}
