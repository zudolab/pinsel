import {outputExchange} from '../families/composition-output.mjs';
import {compositionRead} from '../families/composition-read.mjs';
import assert from 'node:assert/strict';
import {validateIntent} from './driver-proof.mjs';
import {admitHeaderField,auditHeaderField} from './owner.mjs';
/** Evidence of an acknowledged save, not evidence that the failed scenario passed. */
export function validateSavedReference(snapshot,evidence){return validate(snapshot,evidence,false);}
export function validateCapturedReference(snapshot,evidence){return validate(snapshot,evidence,true);}
function validate(snapshot,evidence,captured){
 const {bundle,bundleHash,before,after,events,provenance,hashes,paths}=evidence;
 for(const key of ['bundle','bundleHash','before','after','events','provenance']){assert(paths[key]?.startsWith('/'));assert.match(hashes[paths[key]],/^[a-f0-9]{64}$/);}
 assert.equal(hashes[paths.bundle],bundleHash.sha256,'Original sealed bundle changed');
 assert.deepEqual(bundle.snapshot,before);assert.deepEqual(after,snapshot,'Saved state changed');
 assert.equal(provenance.beforeDigest,before.digest);assert.match(provenance.source.head,/^[a-f0-9]{40}$/);assert.match(provenance.composer,/^[a-f0-9]{40}$/);
 const intent=bundle.intent;assert.equal(intent.kind,'knowledge-reference');if(!captured)assert.equal(intent.direction,'forward');
 const owner=validateIntent(before,intent);const one=phase=>{const found=events.filter(e=>e.phase===phase);assert.equal(found.length,1,`Exactly one ${phase} required`);return found[0];};
 const begin=one('begin'),dispatch=one('header-before-dispatch'),response=one('header-response'),readback=one('header-readback-verified');
 assert.deepEqual(begin.intent,intent);assert.deepEqual(dispatch.ref,owner.ref);assert.equal(dispatch.beforeToken,before.tokens.content);
 admitHeaderField(before,owner,dispatch.input,intent.field,intent.value);
 assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true,result:null});
 assert(events.indexOf(dispatch)<events.indexOf(response)&&events.indexOf(response)<events.indexOf(readback));
 assert.deepEqual(readback.ref,owner.ref);assert.equal(readback.token,after.tokens.content);
 const record=after.project.providers.content.find(p=>p.id===owner.ref.providerId).entries.find(e=>e.modelId===owner.ref.modelId&&e.id===owner.ref.recordId);
 assert.deepEqual(readback.record,record);assert.deepEqual(record,{...dispatch.input.record,generation:after.tokens.content});
 let originalFailure;
 if(captured){
  assert(paths.uiResult?.startsWith('/'));assert.match(hashes[paths.uiResult],/^[a-f0-9]{64}$/);
  assert.equal(evidence.uiResult.stage,'SAVE_READBACK_ONLY');assert.deepEqual(evidence.uiResult.result,{domain:'content-edit',ref:owner.ref,record});
  const completed=one('knowledge-save-readback-only');assert(events.indexOf(completed)>events.indexOf(readback));assert.deepEqual(completed.result,evidence.uiResult.result);
  assert(!events.some(e=>/held|failed|uncertain|refused/.test(e.phase)),'Captured save has an unresolved outcome');
 }else{
  const held=one('held');assert.equal(events.at(-1),held);assert.equal(events.at(-2)?.phase,'browser-quiescence-start');assert.equal(events.at(-2)?.boundary,'after-knowledge-preview');
  assert.equal(held.error,'page.waitForLoadState: Timeout 180000ms exceeded.');originalFailure=held.error;
  assert(!events.some(e=>/held|failed|uncertain/.test(e.phase)&&e!==held),'Other unresolved outcomes cannot be recovered by this recipe');
 }
 auditOriginalCompositionReads(before,events);
 const delta=auditHeaderField(before,after,owner,intent.field,intent.value);
 return {status:captured?'CAPTURED_WRITE_EVIDENCE_AUDITED':'SAVED_WRITE_EVIDENCE_AUDITED',originalScenario:captured?'SAVE_READBACK_ONLY':'FAIL',...(originalFailure?{originalFailure}:{}),intent,result:{domain:'content-edit',ref:owner.ref,record},delta,evidenceHashes:hashes,originalSource:provenance.source.head,composer:provenance.composer,stage:provenance.stage};
}

export function auditOriginalCompositionReads(snapshot,events){
 const records=snapshot.project.providers.compositions.find(p=>p.id==='files').records,exchanges=new Map();let pending;
 for(const event of events){
  if(event.phase==='composition-request-before-dispatch'){
   assert(!pending,'Original Composition request never completed');const input=event.input;let exchange;
   if(input.operation==='snapshot'){assert(compositionRead(input));assert.equal(event.observedRequestId,undefined);}
   else{
    assert(Number.isInteger(event.observedRequestId));exchange=exchanges.get(event.observedRequestId);
    if(exchange)exchange.continuation(input);
    else{assert(compositionRead(input));let targetIds=records.map(r=>r.id);if(input.operation==='get'){const record=records.find(r=>r.id===input.id);assert(record);targetIds=[record.id];const source=record.document.binding?.sourceRecordId;if(source&&source!==record.id){assert(records.some(r=>r.id===source));targetIds.unshift(source);}}
     exchange=outputExchange({records,targetIds,input});exchanges.set(event.observedRequestId,exchange);
    }
   }pending={event,exchange};
  }else if(event.phase==='composition-response'){
   assert(pending,'Unmatched original Composition response');assert.equal(event.observedRequestId,pending.event.observedRequestId);assert.deepEqual(event.input,pending.event.input);assert.equal(event.status,200);
   if(pending.exchange)pending.exchange.response(event.body);else assert.equal(event.body.ok,true);pending=undefined;
  }
 }
 assert(!pending,'Original Composition request outcome unresolved');for(const exchange of exchanges.values())assert.equal(exchange.phase,'complete','Original derived challenge unresolved');
}
