import assert from 'node:assert/strict';
import {dirname,join} from 'node:path';
import {inputHash} from './expected-hashes.mjs';
import {nextFamilyIntent} from './sequence-core.mjs';
import {admitRecordEdit,admitDuplicate,auditDelta} from './intents.mjs';
import {outputExchange} from './composition-output.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
export function assertSuccessorProvenance(provenance,bundle,before,installation){
 assert.equal(provenance.sourceStatus,'');assert.equal(provenance.sourceHead,installation.source.head);assert.equal(provenance.composer,installation.composer);assert.equal(provenance.stage,installation.stage);assert.deepEqual(provenance.installed,installation.installed);assert.equal(provenance.baselineDigest,before.digest);assert.deepEqual(bundle.snapshot,before);
 assert(Object.values(bundle.hashes).includes(provenance.intentSha256));assert.equal(bundle.hashes[bundle.intent.capturePath],provenance.baselineFileSha256);
 const prefix='tests/native-authoring/families/';const expectedNames=Object.keys(installation.source.hashes).filter(p=>p.startsWith(prefix)&&!p.slice(prefix.length).includes('/')&&p.endsWith('.mjs')&&!p.endsWith('.test.mjs')).map(p=>p.slice(prefix.length)).sort();assert.deepEqual(Object.keys(provenance.sourceHashes).sort(),expectedNames,'Full original family harness inventory required');
 for(const[name,h]of Object.entries(provenance.sourceHashes)){assert(/^[\w.-]+\.mjs$/.test(name));assert.equal(h,installation.source.hashes['tests/native-authoring/families/'+name]);}
}
/** Reconstruct the actual accepted pin transaction, never reinterpret failed17 as an accepted step. */
export function auditAcceptedPin({before,after,proof,bundle,events,parent,config}){
 assert.equal(proof.intent.sequence.index,16);assert.equal(proof.intent.sequence.step,'parent-pin');assert.equal(proof.intent.kind,'record-edit');assert.equal(proof.intent.domain,'mappings');assert.equal(proof.intent.action.kind,'pins');
 assert.deepEqual(proof.intent.familySourceRebind,parent.rebind.descriptor);assert(!proof.intent.familySourceRebindSuccessor);assert.deepEqual(bundle.intent,proof.intent);
 assert.deepEqual(before,parent.snapshot);assert.deepEqual(nextFamilyIntent({config,snapshot:before,history:parent.history,expectedActive:null,capturePath:proof.intent.capturePath,installationBridge:parent.originalBridge,installationSupplement:parent.supplement,sourceRebind:parent.rebind}),proof.intent);
 assert(!events.some(e=>/held|failed|uncertain/.test(e.phase)));assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,proof.intent);
 const writes=events.filter(e=>e.phase==='request-before-dispatch'),responses=events.filter(e=>e.phase==='request-response');assert.equal(writes.length,1);assert.equal(responses.length,1);const w=writes[0],r=responses[0];assert.equal(w.endpoint,'/__zudo_composer_mapping_provider');assert.deepEqual(w.input,w.wire);assert.deepEqual(r.input,w.input);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true,result:null});assert(events.indexOf(w)<events.indexOf(r));assert(!events.some(e=>e.phase.startsWith('composition-put')));
 const record=admitRecordEdit(before,proof.intent,w.input);auditDelta(before,after,proof.intent,record);assert.deepEqual(proof.result.record,record);assert.equal(proof.beforeDigest,before.digest);assert.equal(proof.afterDigest,after.digest);auditOriginalCompositionReads(before,events);
 assert(events.some(e=>e.phase==='post-reload-public-record-response'&&e.domain==='mappings'&&e.workspaceId===before.workspaceId&&JSON.stringify(e.ref)===JSON.stringify(proof.intent.owner)&&e.input?.id===record.id&&e.status===200&&e.body?.ok===true&&e.body.result?.status==='loaded'&&JSON.stringify(e.body.result.record)===JSON.stringify(record)));
 assert(events.some(e=>e.phase==='browser-quiescence-settled'&&e.boundary==='after-family-reload'&&e.readiness.pending===0&&e.readiness.outstanding===0));
}
export async function loadSuccessorHistory({historyPath,read,json,parent,oldInstallation}){
 const paths=await json(historyPath);assert.equal(paths.length,17);assert.equal(new Set(paths).size,17);assert.deepEqual(paths.slice(0,16),parent.paths);
 const history=await Promise.all(paths.map(json));for(let i=0;i<16;i++)assert.deepEqual(history[i],parent.history[i]);
 const proof=history[16],dir=dirname(paths[16]),bundlePath=join(dir,'accepted-inputs.json'),bundle=await json(bundlePath),before=await json(join(dir,'before.json')),after=await json(proof.afterCapture),provenance=await json(join(dir,'runtime-provenance.json')),events=(await read(join(dir,'events.ndjson'))).toString().trim().split('\n').map(JSON.parse);
 assert.equal((await json(join(dir,'accepted-input-sha256.json'))).sha256,inputHash(await read(bundlePath)));for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);
 assertSuccessorProvenance(provenance,bundle,before,oldInstallation);auditAcceptedPin({before,after,proof,bundle,events,parent,config:parent.config});
 return{...parent,history,paths,snapshot:after};
}
/** Original FAIL stays a pending output challenge; absence of commit alone never proves state. */
export function auditFailedDuplicate({before,after,bundle,events,log,chain}){
 assert.deepEqual(before,after);assert.deepEqual(before,chain.snapshot);assert.deepEqual(bundle.snapshot,before);const intent=bundle.intent;assert.equal(intent.sequence.index,17);assert.equal(intent.sequence.step,'child-duplicate');assert.equal(intent.kind,'duplicate');assert(!intent.familySourceRebindSuccessor);
 assert.deepEqual(nextFamilyIntent({config:chain.config,snapshot:before,history:chain.history,expectedActive:null,capturePath:intent.capturePath,installationBridge:chain.originalBridge,installationSupplement:chain.supplement,sourceRebind:chain.rebind}),intent);
 return auditPendingDuplicate({before,after,intent,events,log});
}
export function auditPendingDuplicate({before,after,intent,events,log}){
 assert.deepEqual(before,after);
 assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,intent);assert(events.some(e=>e.phase==='held'));assert(log.includes('verdict=FAIL exit=1'));
 assert(!events.some(e=>['request-before-dispatch','request-response'].includes(e.phase)));
 const writes=events.filter(e=>e.phase==='composition-put-before-dispatch'),responses=events.filter(e=>e.phase==='composition-put-response');assert.equal(writes.length,1);assert.equal(responses.length,1);const w=writes[0],r=responses[0];assert.deepEqual(w.input,r.input);assert.equal(r.status,200);assert.equal(r.body.ok,'needs-output');assert(events.indexOf(w)<events.indexOf(r));
 const proposed=admitDuplicate(before,intent,w.input);const records=before.project.providers.compositions.find(p=>p.id==='files').records.concat(proposed);const exchange=outputExchange({records,targetIds:records.map(r=>r.id),input:w.input});exchange.response(r.body);assert.equal(exchange.phase,'challenged');
 assert(!after.project.providers.compositions.some(p=>p.records.some(record=>record.id===proposed.id)));auditOriginalCompositionReads(before,events.slice(0,events.indexOf(w)));
 return{originalStatus:'FAIL',proposedId:proposed.id,pendingChallenge:true,fullCaptureUnchanged:true};
}
