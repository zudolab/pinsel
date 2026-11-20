import assert from 'node:assert/strict';
import {isDeepStrictEqual as equal} from 'node:util';
import {assertOnlyNewContentDrafts} from '../routes-proof.mjs';
/** #988: one extra page-copy draft is created and saved, seen after restart, deleted through the dialog, and proven absent. */
export const steps=['create','inspect-present','delete','inspect-absent'];
export const lifecycleStatus='CONTENT_LIFECYCLE_STEP_CAPTURE_VERIFIED';
const providerId='content-filesystem',modelId='page-copy';
const identityKeys=['workspaceId','schemaVersion','componentPack','renderer','assets','publicFiles'];
const entries=snapshot=>snapshot.project.providers.content.find(p=>p.id===providerId).entries;
export const findEntry=(snapshot,ref)=>{assert.equal(ref.providerId,providerId);assert.equal(ref.modelId,modelId);const found=entries(snapshot).filter(e=>e.id===ref.recordId);assert(found.length<=1);if(found[0])assert.equal(found[0].modelId,modelId);return found[0];};
/** Non-Content state and every other Content token stay byte-equal across every step. */
function assertOnlyContentToken(before,after,increment){
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());for(const key of identityKeys)assert.deepEqual(after[key],before[key],`${key} changed`);
 assert.deepEqual(Object.keys(after.tokens).sort(),Object.keys(before.tokens).sort());for(const[key,value]of Object.entries(before.tokens))if(key!=='content')assert.deepEqual(after.tokens[key],value,`Token ${key} changed`);
 assert.equal(after.tokens.content,before.tokens.content+increment,'Unexpected Content token increment');
 for(const domain of Object.keys(before.project.providers))if(domain!=='content')assert.deepEqual(after.project.providers[domain],before.project.providers[domain],`${domain} changed`);
}
export function assertCreateDelta(before,after,result){
 assert.equal(result.domain,'content');assert(Number.isInteger(result.commitCount)&&result.commitCount>=2,'Create plus at least one acknowledged save');
 assertOnlyContentToken(before,after,result.commitCount);assertOnlyNewContentDrafts(before,after,[{ref:result.ref,values:result.record.values}]);assert.deepEqual(findEntry(after,result.ref),result.record);assert.equal(result.record.generation,after.tokens.content);
}
export function assertUnchanged(before,after){assert.deepEqual(after,before,'Read-only restart changed the complete capture');}
export function assertDeleteDelta(before,after,ref){
 const removed=findEntry(before,ref);assert(removed,'Entry to delete is absent before deletion');assert.equal(findEntry(after,ref),undefined,'Deleted entry still captured');
 assertOnlyContentToken(before,after,1);const expected=structuredClone(before.project);const provider=expected.providers.content.find(p=>p.id===providerId);provider.entries=provider.entries.filter(e=>e.id!==ref.recordId);assert.deepEqual(after.project,expected,'Deletion changed more than the one entry');
}
/** The installed Content UI deletes through one atomic transact carrying exactly this operation. */
export function assertDeleteRequest(operation,input,{ref,before}){
 assert.equal(operation,'transact');assert.deepEqual(Object.keys(input??{}).sort(),['expectedMutationToken','operations']);
 assert.equal(input.expectedMutationToken,before.tokens.content,'Delete must bind the captured Content token');assert.deepEqual(input.operations,[{kind:'delete-entry',id:ref.recordId}]);
}
export function assertDeleteResponse(response,{ref,before}){
 assert.equal(response.status,200);assert.equal(response.body?.ok,true);const result=response.body.result;assert.equal(result.providerId,providerId);assert.equal(result.mutationToken,before.tokens.content+1);assert(!result.entries.some(e=>e.id===ref.recordId),'Deleted entry still in authoritative snapshot');
}
/** A complete listing of the model that omits the id; any listing that contains it holds. */
export function absenceListing(ref,{endpoint,operation,input,status,body}){
 if(endpoint!=='/__zudo_composer_content_provider'||!['page-entries','scan-entries'].includes(operation)||input?.modelId!==ref.modelId)return false;
 assert.equal(status,200);assert.equal(body?.ok,true);assert(Array.isArray(body.result?.entries));assert(!body.result.entries.some(e=>e.id===ref.recordId),'Deleted entry listed after restart');
 return operation==='scan-entries'||body.result.nextCursor===undefined||body.result.nextCursor===null;
}
/** A present exact get-entry; another record or status for this id holds. */
export function presentEntryRead(ref,record,workspaceId,{endpoint,operation,workspace,input,status,body}){
 if(endpoint!=='/__zudo_composer_content_provider'||operation!=='get-entry'||input?.id!==ref.recordId)return false;
 assert.equal(workspace,workspaceId);assert.deepEqual(input,{id:ref.recordId});assert.equal(status,200);assert.equal(body?.ok,true);assert.equal(body.result?.status,'loaded');assert.deepEqual(body.result.record,record);return true;
}
export function lifecycleState(proofs,snapshot,marker){
 assert(Array.isArray(proofs)&&proofs.length<steps.length,'Completed lifecycle cannot take more steps');
 for(let i=0;i<proofs.length;i++){const p=proofs[i];assert.equal(p.status,lifecycleStatus);assert.equal(p.kind,steps[i]);assert.equal(p.sequence,i+1);assert.equal(p.marker,marker);if(i)assert.equal(p.beforeDigest,proofs[i-1].afterDigest);}
 if(proofs.length)assert.equal(snapshot.digest,proofs.at(-1).afterDigest,'Next step must start at the previous accepted after-capture');
 return{sequence:proofs.length+1,kind:steps[proofs.length],created:proofs[0]?.result};
}
export function prepareLifecycleIntent({snapshot,capturePath,proofs,marker}){
 assert.match(marker??'',/^[a-z][a-z0-9-]{4,60}$/);assert.match(snapshot.digest,/^[a-f0-9]{64}$/);const {sequence,kind,created}=lifecycleState(proofs,snapshot,marker);
 const intent={kind,sequence,marker,capturePath,captureDigest:snapshot.digest};
 if(kind==='create'){const route=`/${marker}/`,title=`Lifecycle ${marker}`;assert(!entries(snapshot).some(e=>e.values?.['page-copy-route']===route||e.values?.['page-copy-meta-title']===title),'Marker already used by a Content entry');return{...intent,route,title};}
 const ref=created.ref;if(kind==='inspect-absent'){assert.equal(findEntry(snapshot,ref),undefined);return{...intent,ref};}
 const record=findEntry(snapshot,ref);assert(record,'Created entry missing from accepted capture');assert.deepEqual(record,created.record,'Created entry changed since its acknowledged saves');return{...intent,ref,record};
}
export function validateLifecycleIntent(intent,{snapshot,proofs}){assert.equal(snapshot.digest,intent.captureDigest);assert(Array.isArray(intent.proofPaths)&&intent.proofPaths.length===proofs.length);assert.deepEqual(intent,{...prepareLifecycleIntent({snapshot,capturePath:intent.capturePath,proofs,marker:intent.marker}),proofPaths:intent.proofPaths});return intent;}
/** The journal holds exactly one confirmed delete: gesture, then journaled dispatch, then the original 200 response. */
export function assertDeleteJournal(journal,{ref,before}){
 assert(!journal.some(e=>/held|refused|uncertain/.test(e.phase)),'Delete step contains failure evidence');assert(!journal.some(e=>['create-request','draft-save-before'].includes(e.phase)),'Delete step contains another write');
 const one=phase=>{const found=journal.filter(e=>e.phase===phase);assert.equal(found.length,1,`One ${phase} required`);return found[0];};
 const click=one('delete-confirm-before-click'),request=one('request-before-dispatch'),response=one('request-response'),ack=one('delete-acknowledged');
 assert(journal.indexOf(click)<journal.indexOf(request)&&journal.indexOf(request)<journal.indexOf(response)&&journal.indexOf(response)<journal.indexOf(ack),'Delete evidence out of order');
 assert.equal(request.endpoint,'/__zudo_composer_content_provider');assertDeleteRequest('transact',request.input,{ref,before});assert.deepEqual(request.wire,request.input);assert.deepEqual(response.input,request.input);assertDeleteResponse(response,{ref,before});assert.deepEqual(ack.response,{status:200,body:response.body});
 return response;
}
/** Offline step audit: exact full-capture delta for the step, never a status label. */
export function auditLifecycleStep(intent,before,after,result){
 if(intent.kind==='create'){assertCreateDelta(before,after,result);assert.equal(result.record.values['page-copy-route'],intent.route);assert.equal(result.record.values['page-copy-meta-title'],intent.title);}
 else if(intent.kind==='delete'){assertDeleteDelta(before,after,intent.ref);assert.deepEqual(result,{kind:'delete',ref:intent.ref,status:200,mutationToken:before.tokens.content+1});}
 else{assertUnchanged(before,after);assert.equal(result.kind,intent.kind);assert.deepEqual(result.ref,intent.ref);if(intent.kind==='inspect-present'){assert(result.entryReads>0);assert.deepEqual(findEntry(after,intent.ref),intent.record);}else{assert(result.completeListings>0);assert.equal(findEntry(after,intent.ref),undefined);}}
}
export function noWriteEvents(journal){return!journal.some(e=>/held|refused|uncertain/.test(e.phase)||['request-before-dispatch','draft-save-before','create-request'].includes(e.phase)||equal(e.operation,'transact'));}
