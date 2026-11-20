import {test} from 'vitest';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {steps,lifecycleStatus,prepareLifecycleIntent,validateLifecycleIntent,auditLifecycleStep,assertCreateDelta,assertDeleteDelta,assertDeleteRequest,assertDeleteResponse,assertDeleteJournal,absenceListing,presentEntryRead,noWriteEvents,lifecycleState} from './lifecycle.mjs';
const fixture=JSON.parse(await readFile(new URL('../static/fixture.json',import.meta.url),'utf8'));
const base=()=>{const s=structuredClone(fixture);s.digest='a'.repeat(64);s.schemaVersion=1;s.componentPack={digest:'p'};s.renderer={digest:'r'};s.assets=[];s.publicFiles=[];s.tokens={workspace:9,content:102,compositions:'c',sitemaps:'s'};return s;};
const ref={providerId:'content-filesystem',modelId:'page-copy',recordId:'content-entry-lifecycle'};
const values={'page-copy-route':'/lifecycle-988/','page-copy-meta-title':'Lifecycle lifecycle-988','page-copy-meta-description':'Independent static page authoring acceptance','page-copy-order':99};
const record={schemaVersion:1,id:ref.recordId,modelId:'page-copy',createdAt:'t0',updatedAt:'t4',values,lifecycle:'draft',generation:107};
const created=()=>{const s=base();s.digest='b'.repeat(64);s.tokens.content=107;s.project.providers.content[0].entries.push(record);return s;};
const deleted=()=>{const s=created();s.digest='c'.repeat(64);s.tokens.content=108;s.project.providers.content[0].entries=s.project.providers.content[0].entries.filter(e=>e.id!==ref.recordId);return s;};
const proof=(i,before,after,result)=>({status:lifecycleStatus,sequence:i+1,kind:steps[i],marker:'lifecycle-988',beforeDigest:before.digest,afterDigest:after.digest,result});
const createResult={domain:'content',ref,record,commitCount:5};
test('steps chain create, present restart, dialog delete and absent restart from the previous after-capture',()=>{
 const s0=base(),s1=created(),s2=deleted();const i0=prepareLifecycleIntent({snapshot:s0,capturePath:'/c0.json',proofs:[],marker:'lifecycle-988'});assert.equal(i0.kind,'create');assert.equal(i0.route,'/lifecycle-988/');
 const p=[proof(0,s0,s1,createResult)];const i1=prepareLifecycleIntent({snapshot:s1,capturePath:'/c1.json',proofs:p,marker:'lifecycle-988'});assert.deepEqual([i1.kind,i1.record],['inspect-present',record]);
 p.push(proof(1,s1,s1,{kind:'inspect-present',ref,entryReads:1}));assert.equal(prepareLifecycleIntent({snapshot:s1,capturePath:'/c1.json',proofs:p,marker:'lifecycle-988'}).kind,'delete');
 p.push(proof(2,s1,s2,{kind:'delete',ref}));const i3=prepareLifecycleIntent({snapshot:s2,capturePath:'/c2.json',proofs:p,marker:'lifecycle-988'});assert.equal(i3.kind,'inspect-absent');assert(!('record' in i3));
 p.push(proof(3,s2,s2,{}));assert.throws(()=>lifecycleState(p,s2,'lifecycle-988'),/Completed/);
 validateLifecycleIntent({...i1,proofPaths:['/p0.json']},{snapshot:s1,proofs:p.slice(0,1)});for(const alter of [i=>i.kind='delete',i=>i.record={...record,generation:106},i=>i.ref={...ref,recordId:'other'},i=>i.marker='other-marker',i=>i.captureDigest='d'.repeat(64)]){const i={...structuredClone(i1),proofPaths:['/p0.json']};alter(i);assert.throws(()=>validateLifecycleIntent(i,{snapshot:s1,proofs:p.slice(0,1)}));}
});
test('next step refuses a wrong capture, reordered, mismarked or failed prior proof, and a reused marker',()=>{const s0=base(),s1=created(),good=proof(0,s0,s1,createResult);assert.throws(()=>lifecycleState([good],s0,'lifecycle-988'));for(const change of [{status:'FAIL'},{kind:'delete'},{sequence:2},{marker:'other-marker'}])assert.throws(()=>lifecycleState([{...good,...change}],s1,'lifecycle-988'));assert.throws(()=>prepareLifecycleIntent({snapshot:{...s1,digest:'e'.repeat(64)},capturePath:'/c.json',proofs:[],marker:'lifecycle-988'}),/Marker already used/);});
test('create delta: only the one new draft, Content token by commitCount, everything else byte-equal',()=>{
 const before=base(),after=created();assertCreateDelta(before,after,createResult);
 for(const alter of [s=>s.tokens.content=108,s=>s.tokens.sitemaps='x',s=>s.assets=[{id:'new'}],s=>s.project.providers.sitemaps[0].records=[],s=>s.project.providers.content[0].entries[0].values={...s.project.providers.content[0].entries[0].values,foreign:'x'},s=>s.project.providers.content[0].entries.at(-1).lifecycle='published',s=>s.project.providers.content[0].entries.push({...record,id:'second'})]){const a=created();alter(a);assert.throws(()=>assertCreateDelta(before,a,createResult));}
 assert.throws(()=>assertCreateDelta(before,after,{...createResult,commitCount:1}));
});
test('delete delta: exactly that entry removed and Content token plus one',()=>{
 const before=created(),after=deleted();assertDeleteDelta(before,after,ref);
 for(const alter of [s=>s.tokens.content=109,s=>s.project.providers.content[0].entries=[],s=>s.project.providers.content[0].entries.push(record),s=>s.tokens.compositions='x',s=>s.renderer={digest:'other'}]){const a=deleted();alter(a);assert.throws(()=>assertDeleteDelta(before,a,ref));}
 assert.throws(()=>assertDeleteDelta(base(),deleted(),ref),/absent before/);
});
test('delete request and original response bind exactly one delete-entry at the captured token',()=>{
 const before=created(),input={expectedMutationToken:107,operations:[{kind:'delete-entry',id:ref.recordId}]};assertDeleteRequest('transact',input,{ref,before});
 for(const [op,bad] of [['delete-entry',input],['transact',{...input,expectedMutationToken:106}],['transact',{...input,operations:[...input.operations,{kind:'delete-entry',id:'other'}]}],['transact',{...input,operations:[{kind:'delete-model',id:'page-copy'}]}],['transact',{...input,extra:true}]])assert.throws(()=>assertDeleteRequest(op,bad,{ref,before}));
 const ok={status:200,body:{ok:true,result:{providerId:'content-filesystem',mutationToken:108,entries:[]}}};assertDeleteResponse(ok,{ref,before});
 for(const bad of [{...ok,status:409},{status:200,body:{ok:false}},{status:200,body:{ok:true,result:{...ok.body.result,mutationToken:109}}},{status:200,body:{ok:true,result:{...ok.body.result,entries:[record]}}}])assert.throws(()=>assertDeleteResponse(bad,{ref,before}));
});
test('delete journal requires gesture, journaled dispatch, original 200 response and acknowledgement in order',()=>{
 const before=created(),input={expectedMutationToken:107,operations:[{kind:'delete-entry',id:ref.recordId}]},body={ok:true,result:{providerId:'content-filesystem',mutationToken:108,entries:[]}};
 const journal=()=>[{phase:'begin'},{phase:'delete-confirm-before-click',ref},{phase:'request-before-dispatch',endpoint:'/__zudo_composer_content_provider',input,wire:input},{phase:'request-response',input,status:200,body},{phase:'delete-acknowledged',ref,response:{status:200,body}}];
 assertDeleteJournal(journal(),{ref,before});
 for(const alter of [j=>j.splice(1,1),j=>j.splice(3,1),j=>j.push({phase:'request-before-dispatch',endpoint:'/__zudo_composer_content_provider',input,wire:input}),j=>j.push({phase:'request-held',error:'x'}),j=>j.push({phase:'draft-save-before'}),j=>{[j[1],j[2]]=[j[2],j[1]];},j=>{j[2].wire={...input,expectedMutationToken:1};}]){const j=journal();alter(j);assert.throws(()=>assertDeleteJournal(j,{ref,before}));}
});
test('restart readbacks: exact loaded record for presence, complete listing without the id for absence',()=>{
 const get={endpoint:'/__zudo_composer_content_provider',operation:'get-entry',workspace:'pinsel',input:{id:ref.recordId},status:200,body:{ok:true,result:{status:'loaded',record}}};assert(presentEntryRead(ref,record,'pinsel',get));assert.equal(presentEntryRead(ref,record,'pinsel',{...get,input:{id:'x'}}),false);
 for(const bad of [{...get,workspace:'other'},{...get,body:{ok:true,result:{status:'missing'}}},{...get,body:{ok:true,result:{status:'loaded',record:{...record,generation:1}}}}])assert.throws(()=>presentEntryRead(ref,record,'pinsel',bad));
 const scan={endpoint:'/__zudo_composer_content_provider',operation:'scan-entries',input:{modelId:'page-copy'},status:200,body:{ok:true,result:{entries:[{id:'other'}]}}};assert.equal(absenceListing(ref,scan),true);assert.equal(absenceListing(ref,{...scan,operation:'page-entries',body:{ok:true,result:{entries:[],nextCursor:'next'}}}),false);assert.equal(absenceListing(ref,{...scan,input:{modelId:'other'}}),false);assert.throws(()=>absenceListing(ref,{...scan,body:{ok:true,result:{entries:[{id:ref.recordId}]}}}),/listed/);
});
test('read-only steps require an unchanged capture and a write-free journal',()=>{const s=created();auditLifecycleStep({kind:'inspect-present',ref,record},s,structuredClone(s),{kind:'inspect-present',ref,entryReads:1});assert.throws(()=>auditLifecycleStep({kind:'inspect-present',ref,record},s,deleted(),{kind:'inspect-present',ref,entryReads:1}));assert.throws(()=>auditLifecycleStep({kind:'inspect-absent',ref},deleted(),deleted(),{kind:'inspect-absent',ref,completeListings:0}));assert(noWriteEvents([{phase:'read-response',operation:'get-entry'}]));for(const e of [{phase:'read-held'},{phase:'request-before-dispatch'},{phase:'read-before-dispatch',operation:'transact'}])assert(!noWriteEvents([e]));});
