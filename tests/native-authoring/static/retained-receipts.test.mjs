import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assertContentReceipt,assertRecoveryRead} from './retained-receipts.mjs';
import {loadRetained} from './retained.mjs';
const ref={providerId:'content-filesystem',modelId:'page-copy',recordId:'copy'};
const before={tokens:{content:3}};
function edit(){const input={record:{id:'copy',modelId:'page-copy',generation:3,values:{title:'Actual'}}};return {result:{domain:'content-edit',ref,record:{...input.record,generation:4}},events:[{phase:'request-before-dispatch',endpoint:'/__zudo_composer_content_provider',wire:input,input},{phase:'request-response',input,status:200,body:{ok:true,result:null}}]};}
test('retained Content edit binds exact request values, owner, endpoint and paired acknowledgement',()=>{
 const valid=edit();assertContentReceipt(valid.events,valid.result,before);
 for(const alter of [x=>x.result.record.values={title:'Unacknowledged'},x=>x.result.ref={...ref,providerId:'foreign'},x=>x.result.record.modelId='foreign',x=>x.events[0].endpoint='/wrong',x=>x.events.shift(),x=>x.events.reverse(),x=>x.events[1].input={record:{id:'copy',values:{title:'Other'}}}]){const x=structuredClone(edit());alter(x);assert.throws(()=>assertContentReceipt(x.events,x.result,before));}
});
function creation(){const record={id:'copy',modelId:'page-copy',generation:0,lifecycle:'draft',updatedAt:'now',values:{}};const first={...record,generation:4,values:{route:'/new/'}},last={...first,values:{route:'/new/',title:'Actual'}};const events=[{phase:'create-request',ref,input:{record}},{phase:'create-response',ref,status:200,body:{ok:true}}];for(const r of [first,last])events.push({phase:'draft-save-before',operation:'put-entry',input:{record:r}},{phase:'draft-save-after',operation:'put-entry',status:200,body:{ok:true}});return {events,result:{domain:'content',ref,record:{...last,generation:6},commitCount:3}};}
test('retained creation requires exact allocation and every ordered monotonic save',()=>{
 const valid=creation();assertContentReceipt(valid.events,valid.result,before);
 for(const alter of [x=>x.events.splice(2,1),x=>x.events.splice(3,1),x=>x.events[0].ref={...ref,recordId:'other'},x=>x.result.record.values={...x.result.record.values,title:'Invented'},x=>x.result.commitCount=2,x=>x.events[4].input.record.values={title:'Actual'},x=>x.events[3].body.ok=false]){const x=structuredClone(creation());alter(x);assert.throws(()=>assertContentReceipt(x.events,x.result,before));}
});
function read(){const result={domain:'compositions',ref:{providerId:'files',recordId:'c'},record:{id:'c',document:{title:'Actual'}}};const input={operation:'get',id:'c',outputsById:{}};return {result,events:[{phase:'composition-request-before-dispatch',observedRequestId:2,input},{phase:'composition-response',observedRequestId:2,input,status:200,body:{ok:true,result:{status:'loaded',record:result.record}}}]};}
test('recovered record must be the exact paired public get for its qualified owner',()=>{
 const valid=read();assertRecoveryRead(valid.events,valid.result);
 for(const alter of [x=>x.events[1].phase='UNRELATED',x=>x.events[1].endpoint='/wrong',x=>x.events[1].body.result={unrelated:x.result.record},x=>x.events.shift(),x=>x.events[0].observedRequestId=9,x=>x.events[0].input={operation:'get',id:'other'},x=>x.result.ref.providerId='foreign',x=>x.events[1].body.ok='needs-output']){const x=structuredClone(read());alter(x);assert.throws(()=>assertRecoveryRead(x.events,x.result));}
});
test('recovered manifest refuses absent original outcome or original committed capture',async()=>{
 const root=await mkdtemp(join(tmpdir(),'static-provenance-'));try{
 const original=join(root,'original'),recovery=join(root,'recovery');await mkdir(original);await mkdir(recovery);const json=(path,value)=>writeFile(path,JSON.stringify(value));
 const record={id:'c',document:{name:'marker',root:[]}},result={domain:'compositions',ref:{providerId:'files',recordId:'c'},record},resources={marker:'marker',composition:result.ref};const before={digest:'before'},after={digest:'after'};
 const proof={status:'COMMITTED_PHASE_RECONCILED_AND_RELOAD_VERIFIED',kind:'composition-create',beforeDigest:'before',afterDigest:'after',originalFailedAttempt:original,afterCapture:join(recovery,'after.json'),result,resources};
 await json(join(original,'before.json'),before);await json(join(recovery,'before.json'),after);await json(join(recovery,'after.json'),after);await json(join(recovery,'proof.json'),proof);await json(join(root,'manifest.json'),{kind:'retained-static-evidence',proofPaths:[join(recovery,'proof.json')],capturePath:join(recovery,'after.json')});
 const events=[{phase:'begin',intent:{kind:'composition-create',captureDigest:'before',name:'marker'}},{phase:'composition-put-response',input:{record},status:200,body:{ok:true,result:{canonical:{status:'saved'}}}},{phase:'held',error:'Observed original failure'}];await writeFile(join(original,'events.ndjson'),events.map(JSON.stringify).join('\n'));
 await assert.rejects(loadRetained(join(root,'manifest.json'),{complete:false}),/committed-reconciliation/);
 await json(join(original,'committed-reconciliation.json'),{status:'EXACT_COMMITTED_DELTA_VERIFIED_RELOAD_PENDING',beforeDigest:'before',afterDigest:'after',ref:result.ref,record});
 await assert.rejects(loadRetained(join(root,'manifest.json'),{complete:false}),/original\/after.json/);
 events.pop();await writeFile(join(original,'events.ndjson'),events.map(JSON.stringify).join('\n'));await assert.rejects(loadRetained(join(root,'manifest.json'),{complete:false}),/Original failed journal/);
 }finally{await rm(root,{recursive:true});}
});
