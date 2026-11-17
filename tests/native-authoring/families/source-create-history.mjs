import assert from 'node:assert/strict';
import {dirname,join} from 'node:path';
import {inputHash} from './expected-hashes.mjs';
import {nextFamilyIntent} from './sequence-core.mjs';
import {admitDuplicate,auditDelta} from './intents.mjs';
import {outputExchange} from './composition-output.mjs';
import {compositionRead} from './composition-read.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
import {assertSuccessorProvenance} from './source-successor-history.mjs';
const expectedIntent=(chain,before,intent)=>nextFamilyIntent({config:chain.config,snapshot:before,history:chain.history,expectedActive:null,capturePath:intent.capturePath,installationBridge:chain.originalBridge,installationSupplement:chain.supplement,sourceRebind:chain.rebind,sourceSuccessor:chain.successor});
export function auditAcceptedDuplicate({before,after,proof,bundle,events,parent}){
 assert.equal(proof.intent.sequence.index,17);assert.equal(proof.intent.sequence.step,'child-duplicate');assert.equal(proof.intent.kind,'duplicate');assert(!proof.intent.familySourceCreateHandoff);assert.deepEqual(bundle.intent,proof.intent);assert.deepEqual(before,parent.snapshot);assert.deepEqual(expectedIntent(parent,before,proof.intent),proof.intent);
 assert(!events.some(e=>/held|failed|uncertain/.test(e.phase)));assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,proof.intent);assert(!events.some(e=>['request-before-dispatch','request-response'].includes(e.phase)));
 const record=auditDuplicateTransport({before,after,proof,events});const writes=events.filter(e=>e.phase==='composition-put-before-dispatch'),responses=events.filter(e=>e.phase==='composition-put-response');
 auditOriginalCompositionReads(before,events.slice(0,events.indexOf(writes[0])));auditOriginalCompositionReads(after,events.slice(events.indexOf(responses.at(-1))+1));
 assert(events.some(e=>e.phase==='post-reload-public-record-response'&&e.domain==='compositions'&&e.workspaceId===before.workspaceId&&e.ref?.providerId==='files'&&e.ref.recordId===record.id&&e.input?.id===record.id&&e.status===200&&e.body?.ok===true&&e.body.result?.status==='loaded'&&JSON.stringify(e.body.result.record)===JSON.stringify(record)));
 assert(events.some(e=>e.phase==='browser-quiescence-settled'&&e.boundary==='after-family-reload'&&e.readiness.pending===0&&e.readiness.outstanding===0));
}
export function auditDuplicateTransport({before,after,proof,events}){
 const writes=events.filter(e=>e.phase==='composition-put-before-dispatch'),responses=events.filter(e=>e.phase==='composition-put-response');assert(writes.length>=1&&writes.length<=2);assert.equal(responses.length,writes.length);
 const record=admitDuplicate(before,proof.intent,writes[0].input),records=before.project.providers.compositions.find(p=>p.id==='files').records.concat(record),exchange=outputExchange({records,targetIds:records.map(r=>r.id),input:writes[0].input});
 for(let i=0;i<writes.length;i++){const w=writes[i],r=responses[i];assert.equal(w.continuation,i>0);assert.deepEqual(w.input,r.input);assert.equal(r.status,200);assert(events.indexOf(w)<events.indexOf(r));if(i){assert(events.indexOf(responses[i-1])<events.indexOf(w));exchange.continuation(w.input);}exchange.response(r.body);}
 assert.equal(exchange.phase,'complete');assert.equal(responses.at(-1).body.result?.canonical?.status,'saved');auditDelta(before,after,proof.intent,record);assert.deepEqual(proof.result.record,record);assert.equal(proof.beforeDigest,before.digest);assert.equal(proof.afterDigest,after.digest);
 return record;
}
export async function loadCreateHistory({historyPath,read,json,parent,oldInstallation}){
 const paths=await json(historyPath);assert.equal(paths.length,18);assert.equal(new Set(paths).size,18);assert.deepEqual(paths.slice(0,17),parent.paths);const history=await Promise.all(paths.map(json));for(let i=0;i<17;i++)assert.deepEqual(history[i],parent.history[i]);
 const proof=history[17],dir=dirname(paths[17]),bundlePath=join(dir,'accepted-inputs.json'),bundle=await json(bundlePath),before=await json(join(dir,'before.json')),after=await json(proof.afterCapture),provenance=await json(join(dir,'runtime-provenance.json')),events=(await read(join(dir,'events.ndjson'))).toString().trim().split('\n').map(JSON.parse);
 assert.equal((await json(join(dir,'accepted-input-sha256.json'))).sha256,inputHash(await read(bundlePath)));for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);assertSuccessorProvenance(provenance,bundle,before,oldInstallation);auditAcceptedDuplicate({before,after,proof,bundle,events,parent});return{...parent,paths,history,snapshot:after};
}
/** Validate original no-write failure without asserting that interrupted reads settled. */
export function auditFailedCreate({before,after,bundle,events,log,chain}){
 assert.deepEqual(before,after);assert.deepEqual(before,chain.snapshot);assert.deepEqual(bundle.snapshot,before);const intent=bundle.intent;assert.equal(intent.sequence.index,18);assert.equal(intent.sequence.step,'child-mapping');assert.equal(intent.kind,'mapping-create');assert(!intent.familySourceCreateHandoff);assert.deepEqual(expectedIntent(chain,before,intent),intent);
 return auditUnwrittenCreate({before,after,intent,events,log});
}
export function auditUnwrittenCreate({before,after,intent,events,log}){
 assert.deepEqual(before,after);
 assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,intent);assert(events.some(e=>e.phase==='browser-quiescence-start'&&e.boundary==='before-family-mapping-create'));assert(events.some(e=>e.phase==='held'&&e.error==='page.waitForLoadState: Timeout 180000ms exceeded.'));assert(log.includes('verdict=FAIL exit=1'));assert(!events.some(e=>/put/.test(e.phase)||['request-before-dispatch','request-response'].includes(e.phase)));
 assert(events.some(e=>e.phase==='composition-request-before-dispatch'));
 const records=before.project.providers.compositions.find(p=>p.id==='files').records,exchanges=new Map();let pending;
 for(const e of events){if(e.phase==='composition-request-before-dispatch'){assert(!pending);const input=e.input;let exchange;if(input.operation==='snapshot'){assert(compositionRead(input));assert.equal(e.observedRequestId,undefined);}else{assert(Number.isInteger(e.observedRequestId));exchange=exchanges.get(e.observedRequestId);if(exchange)exchange.continuation(input);else{assert(compositionRead(input));let targetIds=records.map(r=>r.id);if(input.operation==='get'){const record=records.find(r=>r.id===input.id);assert(record);targetIds=[record.id];const source=record.document.binding?.sourceRecordId;if(source&&source!==record.id){assert(records.some(r=>r.id===source));targetIds.unshift(source);}}exchange=outputExchange({records,targetIds,input});exchanges.set(e.observedRequestId,exchange);}}pending={e,exchange};}else if(e.phase==='composition-response'){assert(pending);assert.equal(e.observedRequestId,pending.e.observedRequestId);assert.deepEqual(e.input,pending.e.input);assert.equal(e.status,200);if(pending.exchange)pending.exchange.response(e.body);else assert.equal(e.body.ok,true);pending=null;}}
 assert(!pending,'Original response unresolved');return{originalStatus:'FAIL',canonicalWrites:0,fullCaptureUnchanged:true,unsettledReadChallenges:[...exchanges.values()].filter(e=>e.phase!=='complete').length};
}
