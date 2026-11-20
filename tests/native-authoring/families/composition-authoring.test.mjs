import {familyPrewriteReadiness,compositionWriteAdmission} from './prewrite-readiness.mjs';
import { test } from 'vitest';import assert from'node:assert/strict';import{compositionAuthoringGate}from'./composition-authoring.mjs';
const old={id:'home',document:{root:[]}},next={id:'new',document:{root:[]}},records=[old,next];const input={operation:'put',record:next,outputsById:{}};const challenge={ok:'needs-output',request:{records,sourceOutcomes:records.map(record=>({id:record.id,outcome:{status:'loaded',record}})),targetIds:records.map(r=>r.id)}};const continuation={...input,outputsById:Object.fromEntries(records.map(r=>[r.id,{status:'generated',code:'JSX '+r.id}]))};
function fixture(persist=async()=>{}){let sends=0,accepted=0;const snapshot={workspaceId:'pinsel',project:{providers:{compositions:[{id:'files',records:[old]}]}}};const page={url:()=> 'http://127.0.0.1:4194/composer'};const gate=compositionAuthoringGate({page,snapshot,persist,admit:wire=>{assert.deepEqual(wire.record,next);return next;},accept:()=>accepted++});const route=(wire,body,lose=false)=>{const req={postDataJSON:()=>wire,url:()=> 'http://127.0.0.1:4194/__zudo_composer_file_provider',headers:()=>({origin:'http://127.0.0.1:4194','x-zudo-composer-workspace':'pinsel'}),method:()=> 'POST',redirectedFrom:()=>null,redirectedTo:()=>null,response:async()=>{if(lose)throw Error('lost response');return{request:()=>req,url:()=>req.url(),status:()=>200,finished:async()=>null,json:async()=>body};}};return{request:()=>req,continue:async()=>sends++,abort:async()=>{}};};return{gate,route,snapshot,get sends(){return sends;},get accepted(){return accepted;}};}
test('one reviewed logical put waits challenge continuation before counting commit',async()=>{const f=fixture();await f.gate.handle(f.route(input,challenge));assert.equal(f.gate.committed,false);assert.equal(f.accepted,0);await f.gate.handle(f.route(continuation,{ok:true,result:{canonical:{status:'saved'}}}));await f.gate.drain();assert.equal(f.gate.committed,true);assert.equal(f.accepted,1);assert.equal(f.sends,2);assert.deepEqual(f.snapshot.project.providers.compositions[0].records,[old]);await f.gate.handle(f.route(input,{ok:true}));await assert.rejects(f.gate.drain());assert.equal(f.sends,2);});
test('changed record or extra outputs refuse before continuation dispatch',async()=>{for(const changed of [{...continuation,record:{...next,id:'foreign'}},{...continuation,outputsById:{...continuation.outputsById,extra:{status:'generated',code:''}}}]){const f=fixture();await f.gate.handle(f.route(input,challenge));await f.gate.handle(f.route(changed,{ok:true}));await assert.rejects(f.gate.drain());assert.equal(f.sends,1);assert.equal(f.accepted,0);}});
test('response loss does not authorize automatic replay or next put',async()=>{const f=fixture();await f.gate.handle(f.route(input,challenge,true));await f.gate.handle(f.route(input,challenge));await assert.rejects(f.gate.drain(),/lost response/);assert.equal(f.sends,1);assert.equal(f.accepted,0);});

function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
async function earlyFixture(){
 const durable=deferred(),observed=deferred(),events=[];
 const f=fixture(async e=>{if(e.phase==='composition-put-response'&&e.body.ok==='needs-output'){observed.resolve();await durable.promise;}events.push(e);});
 const first=f.gate.handle(f.route(input,challenge));await observed.promise;
 return{f,first,durable,events};
}

test('early continuation joins actual prior response fsync then reclassifies without waiting its own challenge',async()=>{
 const {f,first,durable,events}=await earlyFixture();assert.equal(f.gate.awaitingWriteOutput,false);
 let held;const readiness=familyPrewriteReadiness({composition:f.gate,check:()=>f.gate.check(),hold:e=>held=e,persist:async e=>events.push(e)});
 const options=compositionWriteAdmission(f.gate,continuation);assert.equal(options.writeContinuation(),false);
 const route=f.route(continuation,{ok:true,result:{canonical:{status:'saved'}}});const second=readiness.admit(route,()=>f.gate.handle(route),options);
 await Promise.resolve();assert.equal(f.sends,1);assert.equal(f.accepted,0);durable.resolve();await Promise.all([first,second]);await readiness.drain();await f.gate.drain();assert.equal(held,undefined);assert.equal(f.sends,2);assert.equal(f.accepted,1);
 const response=events.findIndex(e=>e.phase==='composition-put-response'&&e.body.ok==='needs-output'),classified=events.findIndex(e=>e.phase==='family-prewrite-admission-classified');assert(response<classified);assert.equal(events[classified].continuation,true);assert.equal(events[classified].readiness.outstanding,1);
});
for(const [name,wire]of [['wrong record',{...continuation,record:{...next,id:'foreign'}}],['extra output',{...continuation,outputsById:{...continuation.outputsById,extra:{status:'generated',code:'bad'}}}],['missing output',{...continuation,outputsById:{home:continuation.outputsById.home}}]])test(`early ${name} still reaches exact gate validation and never dispatches`,async()=>{
 const {f,first,durable}=await earlyFixture();const readiness=familyPrewriteReadiness({composition:f.gate,check:()=>f.gate.check(),hold:()=>{},persist:async()=>{}});const route=f.route(wire,{ok:true});const waiting=readiness.admit(route,()=>f.gate.handle(route),compositionWriteAdmission(f.gate,wire));durable.resolve();await Promise.all([first,waiting]);await assert.rejects(f.gate.drain());assert.equal(f.sends,1);assert.equal(f.accepted,0);
});
test('failure persisting original response holds early continuation and never replays',async()=>{
 const durable=deferred(),observed=deferred();const f=fixture(async e=>{if(e.phase==='composition-put-response'){observed.resolve();await durable.promise;throw Error('journal fsync failed');}});const first=f.gate.handle(f.route(input,challenge));await observed.promise;let held;const readiness=familyPrewriteReadiness({composition:f.gate,check:()=>f.gate.check(),hold:e=>held=e,persist:async()=>{}});const route=f.route(continuation,{ok:true});const waiting=readiness.admit(route,()=>f.gate.handle(route),compositionWriteAdmission(f.gate,continuation));durable.resolve();await Promise.all([first,waiting]);await assert.rejects(readiness.drain(),/journal fsync failed/);await assert.rejects(f.gate.drain(),/journal fsync failed/);assert(held);assert.equal(f.sends,1);
});
test('prior response join resolves with an outstanding challenge and no canonical commit',async()=>{
 const {f,first,durable}=await earlyFixture();const prior=f.gate.joinPriorResponse();durable.resolve();await first;await prior;assert.equal(f.gate.awaitingWriteOutput,true);assert.equal(f.gate.committed,false);
});
test('completed canonical put cannot admit another logical write through the join',async()=>{
 const f=fixture();await f.gate.handle(f.route(input,{ok:true,result:{canonical:{status:'saved'}}}));
 const readiness=familyPrewriteReadiness({composition:f.gate,check:()=>f.gate.check(),hold:()=>{},persist:async()=>{}}),route=f.route(input,{ok:true});
 await readiness.admit(route,()=>f.gate.handle(route),compositionWriteAdmission(f.gate,input));await assert.rejects(f.gate.drain(),/Second canonical put/);assert.equal(f.sends,1);assert.equal(f.accepted,1);
});
test('close during earlier response bookkeeping refuses continuation after joining it',async()=>{
 const {f,first,durable}=await earlyFixture();let closing=false;
 const readiness=familyPrewriteReadiness({composition:f.gate,check:()=>{if(closing)throw Error('Family closing');f.gate.check();},hold:()=>{},persist:async()=>{}}),route=f.route(continuation,{ok:true});
 const waiting=readiness.admit(route,()=>f.gate.handle(route),compositionWriteAdmission(f.gate,continuation));closing=true;durable.resolve();await Promise.all([first,waiting]);await assert.rejects(readiness.drain(),/Family closing/);assert.equal(f.sends,1);assert.equal(f.accepted,0);
});
