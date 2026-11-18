import{assertContinuationAuthority}from'./continuation-core.mjs';
import assert from 'node:assert/strict';
import {admitBinding,admitRecordEdit,auditDelta} from './intents.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
export const RECOVERY22='MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED';
export const SOURCE19='d03e953d7f5e40fb09d69d1f427186f7dcf77eb6';
export function auditBoundaryMapping({before,after,intent,result,events,index}){
 assert(index>=19&&index<=22);assert.equal(intent.family,'results');assert.equal(intent.sequence.index,index);assert.equal(intent.sequence.total,45);assert.equal(intent.domain,'mappings');assert.equal(intent.owner.providerId,'mapping-filesystem');assert.equal(intent.kind,index===22?'record-edit':'binding');
 assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,intent);assert(!events.some(e=>/held|failed|uncertain|cleanup-error/.test(e.phase)||e.phase.startsWith('composition-put')));
 const writes=events.filter(e=>e.phase==='request-before-dispatch'),responses=events.filter(e=>e.phase==='request-response');assert.equal(writes.length,1);assert.equal(responses.length,1);const w=writes[0],r=responses[0];assert.equal(w.endpoint,'/__zudo_composer_mapping_provider');assert.deepEqual(w.input,w.wire);assert.deepEqual(w.input,r.input);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true,result:null});assert(events.indexOf(w)<events.indexOf(r));
 const record=(index===22?admitRecordEdit:admitBinding)(before,intent,w.input);assert.deepEqual(record,result.record);const delta=auditDelta(before,after,intent,record);auditOriginalCompositionReads(before,events);
 const reload=events.filter(e=>e.phase==='post-reload-public-record-response');assert.equal(reload.length,1);const e=reload[0];assert.equal(e.domain,'mappings');assert.equal(e.workspaceId,before.workspaceId);assert.deepEqual(e.ref,intent.owner);assert.equal(e.input.id,record.id);assert.equal(e.status,200);assert.equal(e.body.ok,true);assert.equal(e.body.result.status,'loaded');assert.deepEqual(e.body.result.record,record);assert(events.indexOf(e)>events.indexOf(r));
 assert(events.some(x=>x.phase==='browser-quiescence-settled'&&x.boundary==='after-family-reload'&&x.readiness.pending===0&&x.readiness.outstanding===0&&events.indexOf(x)>events.indexOf(e)));
 return delta;
}
export function recordEditRecovery22({before,after,intent,result,events,recoveryCapturePath,evidence}){
 assert.equal(intent.sequence.step,'child-collection');assert.deepEqual(intent.action,{kind:'select',label:'Mapping mode',value:'collection'});assert.deepEqual(intent.document.mode,{kind:'collection',query:{publication:'published-only',conditions:[],sort:[],pins:[],limit:100}});
 const delta=auditBoundaryMapping({before,after,intent,result,events,index:22});assert.equal(typeof recoveryCapturePath,'string');assert(recoveryCapturePath.startsWith('/'));assert.equal(evidence.originalRuntime,'FAIL');assert.equal(evidence.originalAfter,'ABSENT');assert.equal(evidence.originalProof,'ABSENT');assert.equal(evidence.rawInventoryTiming,'LATER_MEASURED');assert(evidence.manifestPath?.startsWith('/'));assert.match(evidence.manifestSha256,/^[a-f0-9]{64}$/);
 return{status:RECOVERY22,originalScenario:'FAIL',originalAfterCapture:'ABSENT',originalProof:'ABSENT',recoveryKind:'saved-record-edit-original-reload-public-capture',terminalQualification:'Original browser saved/reloaded; original outer runtime failed before after capture. Separately authorized lease recovery/public capture; later raw inventory is not backdated.',...delta,afterCapture:recoveryCapturePath,intent,result,evidence};
}
export function assertBoundary23(transition,history,snapshot){
 assert.equal(transition.status,'FAMILY_BOUNDARY23_VERIFIED');assert.equal(transition.boundary,23);assert.equal(transition.parentBoundary,19);assert.equal(transition.oldSource,SOURCE19);assert.equal(transition.history.length,23);assert.equal(transition.history[22].status,RECOVERY22);assert(history.length>=23&&history.length<=45);
 for(let i=0;i<23;i++)assert.deepEqual(history[i],transition.history[i],'Boundary23 original prefix changed');if(history.length===23)assert.deepEqual(snapshot,transition.snapshot);
 for(let i=23;i<history.length;i++)assert.deepEqual(history[i].intent.familySourceBoundary23,transition.descriptor,'Missing boundary23 qualification');
}
export function compactBoundaryInputs({intent,snapshot,hashes,transition}){
 assert.equal(transition.status,'FAMILY_BOUNDARY23_VERIFIED');assert.equal(transition.boundary,23);assert.equal(intent.family,'results');assert(intent.sequence.index>=23&&intent.sequence.index<45);assert.equal(intent.captureDigest,snapshot.digest);assert.deepEqual(intent.familySourceBoundary23,transition.descriptor);
 assert.deepEqual(Object.keys(intent.familyBoundaryHistory??{}).sort(),['path','sha256']);assert.equal(hashes[intent.familyBoundaryHistory.path],intent.familyBoundaryHistory.sha256);
 assert.equal(hashes[intent.capturePath]?.length,64);for(const h of Object.values(hashes))assert.match(h,/^[a-f0-9]{64}$/);
 return{schemaVersion:2,kind:'family-runtime-view',intent,snapshot,hashes,authority:{composer:transition.composer,stage:transition.stage,sourceHead:transition.source,boundary:23,descriptor:transition.descriptor}};
}
export function assertCompactAuthority(inputs,{composer,stage,sourceHead}){
 if(inputs.schemaVersion===3)return assertContinuationAuthority(inputs,{composer,stage,sourceHead});
 assert.deepEqual(Object.keys(inputs).sort(),['schemaVersion','kind','intent','snapshot','hashes','authority'].sort());assert.equal(inputs.schemaVersion,2);assert.equal(inputs.kind,'family-runtime-view');assert.deepEqual(inputs.authority,{composer,stage,sourceHead,boundary:23,descriptor:inputs.intent.familySourceBoundary23});assert.equal(inputs.intent.family,'results');assert(inputs.intent.sequence.index>=23&&inputs.intent.sequence.index<45);assert.equal(inputs.intent.captureDigest,inputs.snapshot.digest);
}
