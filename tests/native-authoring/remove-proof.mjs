import assert from 'node:assert/strict';
/** #978: installed Remove refusal reasons (zudo-composer server/host-document/capabilities.ts). */
export const rootRemovalReason='Root components cannot be removed here.';
export const sharedRemovalReasons=new Set(['Linked/global structure belongs to its source editor.','This is a shared Mapping presentation. Edit its shared Content sources; local prop overrides are not supported.','This Composition is shared by multiple pages. Review affected uses in its source editor.']);
const walk=(nodes,out=[])=>{for(const node of nodes){out.push(node);for(const children of Object.values(node.slots??{}))walk(children,out);}return out;};
const composition=(snapshot,recordId)=>{const found=snapshot.project.providers.compositions.filter(p=>p.id==='files').flatMap(p=>p.records).filter(r=>r.id===recordId);assert.equal(found.length,1,`One files Composition ${recordId} required`);return found[0];};
export const rootNodeIds=(snapshot,recordId)=>composition(snapshot,recordId).document.root.map(node=>node.id);
/** The captured target the UI renders; the button must be offered disabled with exactly this refusal. */
export function assertRemoveRefused(target,expectation){
 const remove=target?.capabilities?.remove;assert(remove&&remove.allowed===false,'Remove must be refused for this target');assert(typeof remove.reason==='string'&&remove.reason);
 if(expectation==='root')assert.equal(remove.reason,rootRemovalReason);else{assert.equal(expectation,'shared');assert(sharedRemovalReasons.has(remove.reason),`Unexpected shared refusal: ${remove.reason}`);}
 return remove.reason;
}
/** The root case is a real local root of a files Composition, not a guessed node. */
export function localRootTarget(snapshot,targets,recordId){const ids=new Set(rootNodeIds(snapshot,recordId));const found=targets.filter(t=>t.providerId==='files'&&t.recordId===recordId&&ids.has(t.nodeId));assert(found.length>=1,'Captured local root target required');return found[0];}
export function assertRemovalJournal(journal){
 const node=journal?.node,request=journal?.removal?.request;assert(node?.nodeId&&node.recordId==='lessons','Inserted node journal required');assert.equal(request?.operation,'document-edit');assert.deepEqual(request.input?.change,{kind:'remove'});
 for(const key of ['providerId','recordId','nodeId'])assert.equal(request.input.target[key],node[key]);assert.equal(journal.removal.receipt?.ok,true,'Original removal receipt required');
 assert(typeof journal.text==='string'&&journal.text.length>=8,'Distinct removed text required');return node;
}
export function assertRemovedFromSnapshot(snapshot,journal){const node=assertRemovalJournal(journal);assert(!walk(composition(snapshot,node.recordId).document.root).some(n=>n.id===node.nodeId),'Removed node still captured');}
export function assertRemovedFromPreview(targets,journal){const node=assertRemovalJournal(journal);assert(Array.isArray(targets)&&targets.length,'Captured preview targets required');assert(!targets.some(t=>t.nodeId===node.nodeId),'Removed node still previewed');}
export function assertRemovedText(text,journal,where){assertRemovalJournal(journal);for(const value of [journal.text,journal.laterText].filter(Boolean))assert(!text.includes(value),`Removed node text still present in ${where}`);}
