import {test} from 'vitest';import assert from 'node:assert/strict';
import {validateSavedMapping,mappingRecoverySequenceProof} from './mapping-recovery.mjs';
const h='a'.repeat(64);
function fixture(){
 const before={digest:h,workspaceId:'site',schemaVersion:1,componentPack:{},renderer:{},assets:[],publicFiles:[],tokens:{mappings:'old',content:1},project:{providers:{mappings:[{id:'mapping-filesystem',records:[]}]}}};
 const intent={kind:'mapping-create',domain:'mappings',name:'Created',contentModel:{providerId:'content-filesystem',recordId:'year'},composition:{providerId:'files',recordId:'parent'},captureDigest:h,sequence:{index:11}};
 const record={id:'mapping-new',createdAt:'2026-11-17T13:31:00.876Z',updatedAt:'2026-11-17T13:31:00.876Z',document:{schemaVersion:2,id:'mapping-new',name:intent.name,contentModel:intent.contentModel,composition:intent.composition,mode:{kind:'single'},bindings:[]}};
 before.project.providers.compositions=[{id:'files',records:[]}];const after=structuredClone(before);after.digest='b'.repeat(64);after.tokens.mappings='new';after.project.providers.mappings[0].records.push(record);
 const input={record},events=[{phase:'begin',intent},{phase:'request-before-dispatch',endpoint:'/__zudo_composer_mapping_provider',input,wire:input},{phase:'request-response',input,status:200,body:{ok:true,result:null}},{phase:'held',error:"Expected values to be strictly equal:\n+ actual - expected\n\n+ null\n- 'mapping-filesystem'\n"}];
 const paths=Object.fromEntries(['bundle','bundleHash','before','after','events','provenance'].map(k=>[k,'/evidence/'+k]));
 return{snapshot:after,evidence:{before,after,bundle:{intent,snapshot:before},bundleHash:{sha256:h},events,provenance:{baselineDigest:h,sourceStatus:'',sourceHead:'a'.repeat(40),composer:'b'.repeat(40),stage:'notes-v1'},paths,hashes:Object.fromEntries(Object.values(paths).map(p=>[p,h]))}};
}
test('one exact acknowledged create and full capture yield audited FAIL, not a successful UI proof',()=>{const f=fixture(),saved=validateSavedMapping(f.snapshot,f.evidence);assert.equal(saved.originalScenario,'FAIL');assert.equal(saved.status,'MAPPING_CREATE_EVIDENCE_AUDITED');const restart={status:'READ_ONLY_RESTART_VERIFIED',intent:{kind:'mapping-saved-create'},beforeDigest:f.snapshot.digest,afterDigest:f.snapshot.digest,afterCapture:'/new/after.json',result:{savedMapping:saved,publicRecordVerified:true}};const p=mappingRecoverySequenceProof(saved,restart);assert.equal(p.status,'MAPPING_CREATE_RECOVERY_VERIFIED');assert.equal(p.beforeDigest,f.evidence.before.digest);assert.equal(p.afterDigest,f.snapshot.digest);assert.equal(p.originalScenario,'FAIL');});
test('unacknowledged, replayed, unrelated delta, foreign record, altered sealed input and other errors refuse',()=>{for(const mutate of[
 f=>f.evidence.events[2].status=500,
 f=>f.evidence.events.splice(2,0,structuredClone(f.evidence.events[1])),
 f=>f.snapshot.project.unrelated=true,
 f=>f.evidence.events[1].input.record.document.name='Other',
 f=>f.evidence.bundleHash.sha256='c'.repeat(64),
 f=>f.evidence.events.at(-1).error='unknown timeout',
 f=>f.evidence.events.splice(3,0,{phase:'request-held',error:'uncertain'}),
 f=>f.evidence.events[2].body.result={invented:true},
 f=>f.evidence.provenance.sourceStatus=' M changed',
 ]){const f=fixture();mutate(f);assert.throws(()=>validateSavedMapping(f.snapshot,f.evidence));}});
test('sequence recovery requires unchanged actual restarted public read and exact recovered evidence',()=>{const f=fixture(),saved=validateSavedMapping(f.snapshot,f.evidence);const r={status:'READ_ONLY_RESTART_VERIFIED',intent:{kind:'mapping-saved-create'},beforeDigest:f.snapshot.digest,afterDigest:f.snapshot.digest,result:{savedMapping:saved,publicRecordVerified:true}};for(const change of[x=>x.afterDigest='c'.repeat(64),x=>x.result.publicRecordVerified=false,x=>x.result.savedMapping.result.record.id='wrong',x=>x.status='FAIL']){const next=structuredClone(r);change(next);assert.throws(()=>mappingRecoverySequenceProof(saved,next));}});
test('readonly recovery wires real reload readback and terminal close before distinct proof',async()=>{
 const {readFile}=await import('node:fs/promises');const browser=await readFile(new URL('./readonly-browser.mjs',import.meta.url),'utf8'),runner=await readFile(new URL('./run-readonly.mjs',import.meta.url),'utf8');
 assert(browser.includes('mappingReadback.beginReload({ref,record})'));assert(browser.includes('mappingReadback.documentCommitted(response)'));assert(browser.includes('mappingReadback.verified'));assert(browser.includes('await mappingReadback.drain()'));assert(browser.includes('mappingReadback?.dispose()'));assert(browser.indexOf('mappingReadback.verified')<browser.indexOf("result={kind:intent.kind,savedMapping,publicRecordVerified:true}"));
 assert(runner.indexOf("assert.deepEqual(after,before,'Read-only restart changed public capture')")<runner.indexOf("'recovery-sequence-proof.json'"));
});
