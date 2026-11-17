import assert from 'node:assert/strict';
import {admitMappingCreate,auditDelta,getRecord} from './intents.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
/** Narrow acknowledged-create recovery. This never declares the original UI run passed. */
export function validateSavedMapping(snapshot,evidence){
 const {bundle,bundleHash,before,after,events,provenance,hashes,paths}=evidence;
 for(const key of ['bundle','bundleHash','before','after','events','provenance']){assert(paths[key]?.startsWith('/'));assert.match(hashes[paths[key]],/^[a-f0-9]{64}$/);}
 assert.equal(hashes[paths.bundle],bundleHash.sha256);assert.deepEqual(bundle.snapshot,before);assert.deepEqual(after,snapshot);
 const intent=bundle.intent;assert.equal(intent.kind,'mapping-create');assert.equal(intent.domain,'mappings');assert.equal(intent.captureDigest,before.digest);assert(intent.sequence);assert.equal(provenance.baselineDigest,before.digest);assert.equal(provenance.sourceStatus,'');assert.match(provenance.sourceHead,/^[a-f0-9]{40}$/);assert.match(provenance.composer,/^[a-f0-9]{40}$/);
 const one=phase=>{const found=events.filter(e=>e.phase===phase);assert.equal(found.length,1,`Exactly one ${phase} required`);return found[0];};
 assert.deepEqual(one('begin').intent,intent);
 const dispatch=one('request-before-dispatch'),response=one('request-response'),held=one('held');
 assert.equal(dispatch.endpoint,'/__zudo_composer_mapping_provider');assert.deepEqual(dispatch.input,dispatch.wire);assert.deepEqual(response.input,dispatch.input);assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true,result:null});assert(events.indexOf(dispatch)<events.indexOf(response)&&events.indexOf(response)<events.indexOf(held));
 assert.equal(events.at(-1),held);assert.equal(held.error,"Expected values to be strictly equal:\n+ actual - expected\n\n+ null\n- 'mapping-filesystem'\n");
 assert(!events.some(e=>/held|failed|uncertain|refused/.test(e.phase)&&e!==held),'Other unresolved outcomes refuse recovery');
 auditOriginalCompositionReads(before,events);
 const record=admitMappingCreate(before,intent,dispatch.input);assert.deepEqual(getRecord(after,'mappings',{providerId:'mapping-filesystem',recordId:record.id}),record);const delta=auditDelta(before,after,intent,record);
 return{status:'MAPPING_CREATE_EVIDENCE_AUDITED',originalScenario:'FAIL',originalFailure:held.error,intent,result:{domain:'mappings',record},delta,evidenceHashes:hashes,originalSource:provenance.sourceHead,composer:provenance.composer,stage:provenance.stage};
}
export function mappingRecoverySequenceProof(saved,restart){
 assert.equal(saved.status,'MAPPING_CREATE_EVIDENCE_AUDITED');assert.equal(restart.status,'READ_ONLY_RESTART_VERIFIED');assert.equal(restart.intent.kind,'mapping-saved-create');assert.equal(restart.beforeDigest,saved.delta.afterDigest);assert.equal(restart.afterDigest,saved.delta.afterDigest);assert.deepEqual(restart.result.savedMapping,saved);assert.equal(restart.result.publicRecordVerified,true);
 return{status:'MAPPING_CREATE_RECOVERY_VERIFIED',originalScenario:'FAIL',...saved.delta,intent:saved.intent,result:saved.result,afterCapture:restart.afterCapture,savedMapping:saved,restart};
}
