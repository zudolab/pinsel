import assert from 'node:assert/strict';
import {validateIntent} from './driver-proof.mjs';
import {admitHeaderField,auditHeaderField} from './owner.mjs';
import {auditOriginalCompositionReads} from './saved-reference.mjs';
/** The original run remains FAIL. Only its acknowledged single save is audited. */
export function validateSavedHref(snapshot,evidence){
 const {bundle,bundleHash,before,after,events,provenance,hashes,paths}=evidence;
 for(const key of ['bundle','bundleHash','before','after','events','provenance']){assert(paths[key]?.startsWith('/'));assert.match(hashes[paths[key]],/^[a-f0-9]{64}$/);}
 assert.equal(hashes[paths.bundle],bundleHash.sha256);assert.deepEqual(bundle.snapshot,before);assert.deepEqual(after,snapshot);
 assert.equal(provenance.beforeDigest,before.digest);assert.match(provenance.source.head,/^[a-f0-9]{40}$/);assert(Object.keys(provenance.source.hashes).length);assert.match(provenance.composer,/^[a-f0-9]{40}$/);
 const intent=bundle.intent;assert.equal(intent.kind,'header');assert.equal(intent.field,'nav-link-href');assert.equal(intent.direction,'forward');
 const owner=validateIntent(before,intent),one=phase=>{const found=events.filter(e=>e.phase===phase);assert.equal(found.length,1,`Exactly one ${phase} required`);return found[0];};
 const begin=one('begin'),dispatch=one('header-before-dispatch'),response=one('header-response'),readback=one('header-readback-verified'),held=one('held');
 assert.deepEqual(begin.intent,intent);assert.deepEqual(dispatch.ref,owner.ref);assert.equal(dispatch.beforeToken,before.tokens.content);admitHeaderField(before,owner,dispatch.input,intent.field,intent.value);
 assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true,result:null});assert(Number.isFinite(Date.parse(dispatch.time))&&Number.isFinite(Date.parse(response.time)));assert(Date.parse(dispatch.time)<=Date.parse(response.time));assert(events.indexOf(dispatch)<events.indexOf(response)&&events.indexOf(response)<events.indexOf(readback));
 assert.equal(events.at(-1),held);assert.equal(events.at(-2)?.phase,'browser-quiescence-settled');assert.equal(events.at(-2)?.boundary,'before-header-visitor-link');
 assert(held.error.startsWith('locator.click: Timeout 30000ms exceeded.'));assert(held.error.includes('element is not visible'));assert(held.error.includes(`href="${intent.value}"`));
 assert(!events.some(e=>/held|failed|uncertain|refused/.test(e.phase)&&e!==held),'Other unresolved outcomes cannot be recovered');
 const record=after.project.providers.content.find(p=>p.id===owner.ref.providerId)?.entries.find(e=>e.id===owner.ref.recordId&&e.modelId===owner.ref.modelId);
 assert.deepEqual(readback.ref,owner.ref);assert.equal(readback.token,after.tokens.content);assert.deepEqual(readback.record,record);assert.deepEqual(record,{...dispatch.input.record,generation:after.tokens.content});auditOriginalCompositionReads(before,events);
 const delta=auditHeaderField(before,after,owner,intent.field,intent.value);
 return{status:'SAVED_HREF_WRITE_EVIDENCE_AUDITED',originalScenario:'FAIL',originalFailure:held.error,writeWindow:{dispatch:dispatch.time,response:response.time},intent,result:{domain:'content-edit',ref:owner.ref,record},delta,evidenceHashes:hashes,originalSource:provenance.source,composer:provenance.composer,stage:provenance.stage};
}
/** UI-produced first history page only; no pagination, restore, synthetic fetch or private files. */
export function savedHrefReadback(saved){
 let record,history;let historyRequests=0;
 return{
  admit(operation,input){if(operation==='editorial-revisions'){assert.deepEqual(input,{entry:saved.result.ref,limit:10});assert(++historyRequests<=3,'Unexpected repeated history reads');}},
  observe(operation,input,response){
   if(operation==='get-entry'&&input.id===saved.result.ref.recordId){assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true,result:{status:'loaded',record:saved.result.record}});record=structuredClone(response.body.result.record);}
   if(operation==='editorial-revisions'){
    assert.equal(response.status,200);assert.equal(response.body.ok,true);const envelope=response.body.result;assert.equal(envelope.ok,true);const page=envelope.value;assert(Array.isArray(page.revisions)&&page.revisions.length>0&&page.revisions.length<=10);assert(page.nextCursor===null||/^[1-9]\d*$/.test(page.nextCursor));
    assert.equal(new Set(page.revisions.map(r=>r.id)).size,page.revisions.length);for(const revision of page.revisions)assert.deepEqual(revision.entry,saved.result.ref);
    const newest=page.revisions[0];assert.deepEqual(newest.values,saved.result.record.values);assert.equal(newest.source,'content-editor');assert.equal(newest.operation.kind,'save');assert(Number.isFinite(Date.parse(newest.createdAt)));assert(Date.parse(newest.createdAt)>=Date.parse(saved.result.record.updatedAt));assert(Date.parse(newest.createdAt)<=Date.parse(saved.writeWindow.response));const previous=page.revisions[1];assert(previous);assert.equal(newest.parentId,previous.id);assert.equal(newest.sequence,previous.sequence+1);assert.deepEqual(previous.values,saved.intent.owner.record.values);assert(Number.isSafeInteger(newest.sequence)&&newest.sequence>0);assert(typeof newest.id==='string'&&newest.id);if(history)assert.deepEqual(page,history);history=structuredClone(page);
   }
  },
  finish(){assert(record&&history,'Original qualified record and native history responses required');return{status:'SAVED_HREF_PUBLIC_HISTORY_VERIFIED',ref:saved.result.ref,record,history};}
 };
}

export function assertSavedHrefPublicHistory(saved,proof){const gate=savedHrefReadback(saved);assert.equal(proof.status,'SAVED_HREF_PUBLIC_HISTORY_VERIFIED');assert.deepEqual(proof.ref,saved.result.ref);const input={entry:proof.ref,limit:10};gate.admit('editorial-revisions',input);gate.observe('editorial-revisions',input,{status:200,body:{ok:true,result:{ok:true,value:proof.history}}});gate.observe('get-entry',{id:proof.ref.recordId},{status:200,body:{ok:true,result:{status:'loaded',record:proof.record}}});assert.deepEqual(gate.finish(),proof);}
