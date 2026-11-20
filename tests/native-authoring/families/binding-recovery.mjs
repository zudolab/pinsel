import assert from 'node:assert/strict';
import {admitBinding,auditDelta,getRecord} from './intents.mjs';
import {compositionRead} from './composition-read.mjs';
import {outputExchange} from './composition-output.mjs';
const failurePattern=/^expect\(locator\)\.toHaveAttribute\(expected\) failed\n\nLocator:  locator\('\.cms-topbar__status'\)\nExpected: "saved"\nReceived: "saving"\nTimeout:  180000ms\n/;
/** Original close may abandon a no-commit derived-output challenge. Never call it settled. */
export function auditBindingReadClosure(snapshot,events){
 const records=snapshot.project.providers.compositions.find(p=>p.id==='files').records,exchanges=new Map();let pending;const abandoned=[];
 for(const event of events){
  if(event.phase==='composition-request-before-dispatch'){
   assert(!pending,'Original read dispatch has no response');const input=event.input;let exchange;
   if(input.operation==='snapshot'){assert(compositionRead(input));assert.equal(event.observedRequestId,undefined);}
   else{assert(Number.isInteger(event.observedRequestId));exchange=exchanges.get(event.observedRequestId);if(exchange)exchange.continuation(input);else{assert(compositionRead(input),'Only canonical reads or exact challenged output continuation');let targets=records.map(r=>r.id);if(input.operation==='get'){const record=records.find(r=>r.id===input.id);assert(record);targets=[record.id];const source=record.document.binding?.sourceRecordId;if(source&&source!==record.id){assert(records.some(r=>r.id===source));targets.unshift(source);}}exchange=outputExchange({records,targetIds:targets,input});exchanges.set(event.observedRequestId,exchange);}}
   pending={event,exchange};
  }else if(event.phase==='composition-response'){
   assert(pending);assert.deepEqual(event.input,pending.event.input);assert.equal(event.observedRequestId,pending.event.observedRequestId);assert.equal(event.status,200);if(pending.exchange)pending.exchange.response(event.body);else assert.equal(event.body.ok,true);pending=undefined;
  }
 }
 assert(!pending,'Unacknowledged original read cannot be reclassified');
 for(const[id,exchange]of exchanges){assert(['complete','challenged'].includes(exchange.phase));if(exchange.phase==='challenged')abandoned.push(id);}
 return {acknowledgedReadExchanges:exchanges.size,abandonedDerivedChallengeIds:abandoned,qualification:'Unsubmitted derived-output continuations remain abandoned; no canonical Composition write or successful settlement is claimed.'};
}
export function validateSavedBinding(snapshot,evidence){
 const {bundle,bundleHash,before,after,events,provenance,hashes,paths}=evidence;
 for(const key of ['bundle','bundleHash','before','after','events','provenance']){assert(paths[key]?.startsWith('/'));assert.match(hashes[paths[key]],/^[a-f0-9]{64}$/);}
 assert.equal(hashes[paths.bundle],bundleHash.sha256);assert.deepEqual(bundle.snapshot,before);assert.deepEqual(after,snapshot);
 const intent=bundle.intent;assert.equal(intent.kind,'binding');assert.equal(intent.domain,'mappings');assert.equal(intent.owner.providerId,'mapping-filesystem');assert.equal(intent.sequence?.index,12);assert.equal(intent.sequence?.step,'parent-bind-label');assert.equal(intent.family,'results');assert.equal(intent.fieldId,'result-year-label');assert.equal(intent.target.prop,'label');assert.equal(intent.captureDigest,before.digest);
 const old=getRecord(before,'mappings',intent.owner);assert.equal(old.document.bindings.length,0);assert.deepEqual(old.document.contentModel,{providerId:'content-filesystem',recordId:'result-year'});const composition=getRecord(before,'compositions',old.document.composition);assert.equal(composition.document.root.length,1);assert.equal(composition.document.root[0].componentId,'pinsel.year-section');assert.equal(intent.target.nodeId,composition.document.root[0].id);
 assert.equal(provenance.baselineDigest,before.digest);assert.equal(provenance.sourceStatus,'');assert.match(provenance.sourceHead,/^[a-f0-9]{40}$/);assert.match(provenance.composer,/^[a-f0-9]{40}$/);
 const bridge=bundle.familyInstallationBridge;assert.equal(bridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(bridge.boundary,12);assert.equal(bridge.afterDigest,before.digest);assert.equal(bridge.composer,provenance.composer);assert.equal(bridge.source,provenance.sourceHead);assert.equal(bridge.stage,provenance.stage);assert.deepEqual(bridge.descriptor,intent.familyInstallationBridge);assert.equal(bridge.originalHistory.length,12);
 for(const[p,h]of Object.entries(bundle.hashes))assert.equal(hashes[p],h,'Original frozen input changed');
 for(const[p,h]of Object.entries(bridge.hashes))assert.equal(hashes[p],h,'Original installation evidence changed');
 const one=phase=>{const xs=events.filter(e=>e.phase===phase);assert.equal(xs.length,1,`Exactly one ${phase} required`);return xs[0];};assert.deepEqual(one('begin').intent,intent);
 const dispatch=one('request-before-dispatch'),response=one('request-response'),held=one('held');assert.equal(dispatch.endpoint,'/__zudo_composer_mapping_provider');assert.deepEqual(dispatch.input,dispatch.wire);assert.deepEqual(response.input,dispatch.input);assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true,result:null});assert(events.indexOf(dispatch)<events.indexOf(response)&&events.indexOf(response)<events.indexOf(held));assert.match(held.error,failurePattern);
 const allowed=new Set(['begin','mapping-binding-readiness-start','mapping-binding-readiness-verified','composition-request-before-dispatch','composition-response','browser-quiescence-start','browser-quiescence-settled','request-before-dispatch','request-response','held','composition-after-held-refused']);
 for(const e of events){assert(allowed.has(e.phase),`Unreviewed event ${e.phase}`);if(e.phase==='composition-after-held-refused'){assert(events.indexOf(e)>events.indexOf(held));assert.equal(e.path,'/__zudo_composer_file_provider');}}
 assert(events.indexOf(one('mapping-binding-readiness-verified'))<events.indexOf(dispatch));
 const reads=auditBindingReadClosure(before,events),record=admitBinding(before,intent,dispatch.input);assert.deepEqual(getRecord(after,'mappings',intent.owner),record);const delta=auditDelta(before,after,intent,record);
 return {status:'MAPPING_BINDING_EVIDENCE_AUDITED',originalScenario:'FAIL',originalFailure:held.error,intent,result:{domain:'mappings',record},delta,reads,evidenceHashes:hashes,originalSource:provenance.sourceHead,composer:provenance.composer,stage:provenance.stage};
}
export function bindingRecoverySequenceProof(saved,restart){
 assert.equal(saved.status,'MAPPING_BINDING_EVIDENCE_AUDITED');assert.equal(saved.originalScenario,'FAIL');assert.equal(restart.status,'READ_ONLY_RESTART_VERIFIED');assert.equal(restart.intent.kind,'mapping-saved-binding');assert.equal(restart.beforeDigest,saved.delta.afterDigest);assert.equal(restart.afterDigest,saved.delta.afterDigest);assert.deepEqual(restart.result.savedMapping,saved);assert.equal(restart.result.publicRecordVerified,true);
 return {status:'MAPPING_BINDING_RECOVERY_VERIFIED',originalScenario:'FAIL',...saved.delta,intent:saved.intent,result:saved.result,afterCapture:restart.afterCapture,savedBinding:saved,restart};
}
