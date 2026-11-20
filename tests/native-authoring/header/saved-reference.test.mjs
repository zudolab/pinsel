import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {knowledgeOwner} from './owner.mjs';
import {validateSavedReference,validateCapturedReference} from './saved-reference.mjs';
const source=JSON.parse(await readFile(new URL('./fixture.json',import.meta.url),'utf8'));
function fixture(){
 const before=structuredClone(source),p=before.project.providers.content.find(p=>p.id==='content-filesystem'),entry=p.entries.find(e=>e.modelId==='knowledge-card'),ref={providerId:p.id,modelId:entry.modelId,recordId:entry.id},owner=knowledgeOwner(before,ref),note=p.entries.find(e=>e.modelId==='note'&&e.lifecycle==='published'&&e.id!==entry.values['knowledge-card-note'].recordId),value={providerId:p.id,modelId:'note',recordId:note.id};
 const intent={kind:'knowledge-reference',field:'knowledge-card-note',direction:'forward',captureDigest:before.digest,ref,owner,value};
 const input={record:{...structuredClone(entry),updatedAt:'2026-12-01T00:00:00Z',values:{...entry.values,'knowledge-card-note':value}}};
 const after=structuredClone(before);after.digest='a'.repeat(64);after.tokens.content++;const record=after.project.providers.content.find(p=>p.id===ref.providerId).entries.find(e=>e.id===ref.recordId&&e.modelId===ref.modelId);Object.assign(record,input.record,{generation:after.tokens.content});
 const paths=Object.fromEntries(['bundle','bundleHash','before','after','events','provenance'].map(k=>[k,'/original/'+k])),hashes=Object.fromEntries(Object.values(paths).map(p=>[p,'b'.repeat(64)]));
 const evidence={paths,hashes,bundleHash:{sha256:'b'.repeat(64)},bundle:{snapshot:before,intent},before,after,provenance:{beforeDigest:before.digest,source:{head:'c'.repeat(40)},composer:'d'.repeat(40)},events:[{phase:'begin',intent},{phase:'header-before-dispatch',ref,input,beforeToken:before.tokens.content},{phase:'header-response',status:200,body:{ok:true,result:null}},{phase:'header-readback-verified',ref,record,token:after.tokens.content},{phase:'browser-quiescence-start',boundary:'after-knowledge-preview'},{phase:'held',error:'page.waitForLoadState: Timeout 180000ms exceeded.'}]};return{after,evidence};
}
test('saved acknowledgement + full capture yields audit only, never full prior PASS',()=>{const{after,evidence}=fixture();const result=validateSavedReference(after,evidence);assert.equal(result.status,'SAVED_WRITE_EVIDENCE_AUDITED');assert.equal(result.originalScenario,'FAIL');assert.deepEqual(result.result.record,evidence.events[3].record);});
for(const [label,change] of Object.entries({hash:e=>e.bundleHash.sha256='wrong',response:e=>e.events[2].status=500,duplicate:e=>e.events.splice(2,0,e.events[1]),readback:e=>e.events[3].token++,wrongFailure:e=>e.events.at(-1).error='uncertain original write',wrongBoundary:e=>e.events.at(-2).boundary='before-header-edit',unresolvedRead:e=>e.events.splice(-2,0,{phase:'composition-request-before-dispatch',input:{operation:'snapshot'}}),collateral:e=>e.after.project.name='changed'}))test(`saved recovery refuses ${label}`,()=>{const{after,evidence}=fixture();change(evidence);assert.throws(()=>validateSavedReference(after,evidence));});

test('ordinary captured save uses separate audit and refuses a failed UI stage',()=>{
 const {after,evidence}=fixture();const result={domain:'content-edit',ref:evidence.bundle.intent.ref,record:evidence.events[3].record};evidence.events.splice(-2,2,{phase:'knowledge-save-readback-only',result});evidence.paths.uiResult='/original/ui-result';evidence.hashes[evidence.paths.uiResult]='e'.repeat(64);evidence.uiResult={stage:'SAVE_READBACK_ONLY',result};
 const audited=validateCapturedReference(after,evidence);assert.equal(audited.status,'CAPTURED_WRITE_EVIDENCE_AUDITED');assert.equal(audited.originalScenario,'SAVE_READBACK_ONLY');assert.throws(()=>validateSavedReference(after,evidence));evidence.uiResult.stage='FAILED';assert.throws(()=>validateCapturedReference(after,evidence));
});

test('completed recovery can support exact inverse without relabeling original failure',async()=>{
 const {recoveredKnowledgeForward}=await import('./recovery-forward.mjs'),{validateIntent}=await import('./driver-proof.mjs');const {after,evidence}=fixture(),saved=validateSavedReference(after,evidence),source={head:'f'.repeat(40),hashes:{source:'a'.repeat(64)}};
 const note=after.project.providers.content.find(p=>p.id===saved.intent.value.providerId).entries.find(e=>e.id===saved.intent.value.recordId&&e.modelId==='note'),route='/notes/'+note.values['note-slug'];
 const proof={status:'SAVED_REFERENCE_RECOVERY_VERIFIED',originalScenario:'FAIL',captureDigest:after.digest,savedWrite:saved,source,composer:saved.composer,restart:{status:'READ_ONLY_RESTART_VERIFIED',source,intent:{kind:'knowledge-saved-reference',captureDigest:after.digest},beforeDigest:after.digest,afterDigest:after.digest,result:{savedWrite:saved,terminalSettlement:'AUTHORITATIVE_READS_AND_CLOSE_FENCE'}},build:{buildEvidenceHash:'b'.repeat(64),routes:[route]},rendered:{snapshotDigest:after.digest,knowledgeReferenceVerified:true,htmlSha256:'c'.repeat(64)},target:{route,verifiedH1:note.values['note-title'],htmlSha256:'d'.repeat(64)}};
 const accepted=recoveredKnowledgeForward(after,proof);assert.equal(accepted.status,'SAVED_REFERENCE_RECOVERY_VERIFIED');
 const inverse={...saved.intent,direction:'inverse',captureDigest:after.digest,owner:knowledgeOwner(after,saved.intent.ref),value:accepted.beforeValue,forwardProof:proof};validateIntent(after,inverse);
 for(const mutate of [p=>delete p.restart,p=>p.captureDigest='foreign',p=>p.target.verifiedH1='wrong',p=>p.restart.result.terminalSettlement='unverified',p=>p.originalScenario='PASS',p=>p.build.routes=[]]){const bad=structuredClone(proof);mutate(bad);assert.throws(()=>recoveredKnowledgeForward(after,bad));}
});
