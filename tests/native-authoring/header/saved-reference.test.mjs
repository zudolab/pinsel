import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {knowledgeOwner} from './owner.mjs';
import {validateSavedReference} from './saved-reference.mjs';
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
