import {test} from 'vitest';
import assert from 'node:assert/strict';
import {orderedPinsChoose,mappingPinsReadiness} from './pins-readiness.mjs';
function fixture(){
 const state={shell:false,enabled:false,mode:'collection',url:'http://localhost/mapping?provider=mapping-filesystem&mapping=m',pending:1};
 const node={getAttribute:key=>key==='data-state'?'saved':null,matches:()=>!state.enabled,value:state.mode};
 const target={isVisible:async()=>state.shell,evaluateAll:async f=>f(state.shell?[node]:[])};
 const page={url:()=>state.url,getByRole:(role,options)=>{assert.equal(role,'heading');assert.deepEqual(options,{name:'Ordered pins Choose',exact:true});return{getByRole:(role,options)=>{assert.equal(role,'button');assert.deepEqual(options,{name:'Choose',exact:true});return target;}};},getByLabel:()=>({evaluateAll:async f=>f(state.shell?[{value:state.mode}]:[])}),locator:selector=>selector==='.cms-topbar__status'?{evaluateAll:async f=>f(state.shell?[node]:[])}:{getByText:()=>({count:async()=>Number(state.shell),isVisible:async()=>state.shell})}};
 const composition={check(){},assertSettled(){assert.equal(state.pending,0);},get readiness(){return{pending:state.pending,outstanding:0};}};
 const events=[],expect={poll:(fn,options)=>{assert.equal(options.timeout,180000);return{toBe:async expected=>{assert.equal(await fn(),false);Object.assign(state,{shell:true,enabled:true,pending:0});assert.equal(await fn(),expected);}};}};
 return{state,page,target,composition,expect,ref:{providerId:'mapping-filesystem',recordId:'m'},record:{id:'m',document:{name:'Parent',mode:{kind:'collection'}}},check(){},persist:async e=>events.push(e),events};
}
test('exact action belongs to exact heading, no ancestor section union',()=>{const f=fixture();assert.equal(orderedPinsChoose(f.page),f.target);});
test('delayed shell resolves under180s qualified readiness without actions',async()=>{const f=fixture();assert.equal(await mappingPinsReadiness(f),f.target);assert.equal(f.events.at(-1).phase,'mapping-pins-readiness-verified');});
test('wrong owner URL fails qualified readiness',async()=>{const f=fixture();f.state.url='http://localhost/mapping?provider=foreign&mapping=m';await assert.rejects(mappingPinsReadiness(f));});
test('noncollection mode and pending reads cannot admit Choose',async()=>{for(const kind of ['mode','pending']){const f=fixture();f.expect={poll:fn=>({toBe:async()=>{Object.assign(f.state,{shell:true,enabled:true,pending:kind==='pending'?1:0,mode:kind==='mode'?'single':'collection'});assert.equal(await fn(),false);throw Error('held');}})};await assert.rejects(mappingPinsReadiness(f),/held/);}});
