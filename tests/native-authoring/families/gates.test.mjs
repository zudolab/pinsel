import { test } from 'vitest';
import assert from 'node:assert/strict';
import {requestGate} from './original-request.mjs';
import {releaseProof} from './release-proof.mjs';
const parent={providerId:'content-filesystem',modelId:'faq-group',recordId:'parent'},child={providerId:'content-filesystem',modelId:'faq-item',recordId:'child'};
const snapshot={project:{providers:{content:[{id:'content-filesystem',entries:[{id:'child',modelId:'faq-item',values:{'faq-item-group':parent}}]}]}}};
test('family release refuses foreign owner, wrong relationship and extra selected record',()=>{
 const requested=[{ref:parent,action:'publish'},{ref:child,action:'publish'}];assert.doesNotThrow(()=>releaseProof({snapshot,requested}));
 assert.throws(()=>releaseProof({snapshot,requested:[...requested,requested[0]]}));
 assert.throws(()=>releaseProof({snapshot,requested:[{...requested[0],ref:{...parent,providerId:'foreign'}},requested[1]]}));
 assert.throws(()=>releaseProof({snapshot,requested:[{...requested[0],ref:{...parent,recordId:'different'}},requested[1]]}));
});
test('concurrent extra request refuses dispatch and leaves first response drained but phase held',async()=>{
 let release,dispatches=0,aborts=0;const wait=new Promise(r=>release=r),events=[];
 const route=()=>{const req={url:()=> 'http://127.0.0.1:4194/__zudo_composer_content_provider',headers:()=>({origin:'http://127.0.0.1:4194'}),method:()=> 'POST',postDataJSON:()=>({record:{id:'x'}}),redirectedFrom:()=>null,redirectedTo:()=>null,response:async()=>{await wait;return{request:()=>req,url:req.url,finished:async()=>null,status:()=>200,json:async()=>({ok:true})};}};return{request:()=>req,continue:async()=>{dispatches++;},abort:async()=>{aborts++;}};};
 const gate=requestGate({page:{url:()=> 'http://127.0.0.1:4194/content'},persist:async e=>events.push(e),validate:()=>{},accept:()=>{}});
 const first=gate.handle(route());await Promise.resolve();await gate.handle(route());assert.equal(dispatches,1);release();await first;await assert.rejects(gate.drain(),/concurrent/);assert(events.some(e=>e.phase==='request-response'));assert(events.some(e=>e.phase==='request-held'));assert.equal(aborts,1);
});
test('a concurrent-reads gate dispatches overlapping reads and still validates each response',async()=>{
 for(const bad of [false,true]){let release,dispatches=0,aborts=0,accepted=0;const wait=new Promise(r=>release=r),events=[];
 const route=body=>{const req={url:()=> 'http://127.0.0.1:4194/__zudo_composer_workspace_provider',headers:()=>({origin:'http://127.0.0.1:4194'}),method:()=> 'POST',postDataJSON:()=>({id:'pinsel'}),redirectedFrom:()=>null,redirectedTo:()=>null,response:async()=>{await wait;return{request:()=>req,url:req.url,finished:async()=>null,status:()=>200,json:async()=>body};}};return{request:()=>req,continue:async()=>{dispatches++;},abort:async()=>{aborts++;}};};
 const gate=requestGate({page:{url:()=> 'http://127.0.0.1:4194/composer'},persist:async e=>events.push(e),concurrentReads:true,validate:()=>{},accept:(_,body)=>{assert.equal(body.ok,true);accepted++;}});
 const first=gate.handle(route({ok:true})),second=gate.handle(route({ok:!bad}));await Promise.resolve();await Promise.resolve();assert.equal(dispatches,2);release();await Promise.all([first,second]);
 if(bad){await assert.rejects(gate.drain());assert.equal(accepted,1);assert(events.some(e=>e.phase==='request-held'));}else{await gate.drain();assert.equal(accepted,2);assert.equal(aborts,0);}}
});
