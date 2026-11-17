import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mappingBindingReadiness} from './binding-readiness.mjs';

function fixture(progress=()=>{}) {
  const ref={providerId:'mapping-filesystem',recordId:'actual-mapping'};
  const state={url:'http://host/mapping?provider=mapping-filesystem&mapping=actual-mapping',shell:true,statusCount:1,targetCount:1,vanish:false,saved:true,name:true,visible:false,enabled:true,pending:0,outstanding:0,held:null};
  const events=[],polls=[];
  const page={url:()=>state.url,locator(selector){return selector==='.cms-topbar__status'?{evaluateAll:async read=>read(state.shell?Array.from({length:state.statusCount},()=>({getAttribute:name=>{assert.equal(name,'data-state');return state.saved?'saved':'dirty';}})):[])}:{getByText(name,options){assert.equal(name,'Actual Mapping');assert.deepEqual(options,{exact:true});return{isVisible:async()=>state.name};}};}};
  const composition={check(){if(state.held)throw state.held;},get readiness(){return{pending:state.pending,outstanding:state.outstanding};},assertSettled(){assert.equal(state.pending+state.outstanding,0);}};
  const expect={poll(read,options){assert.equal(options.timeout,180000);return{async toBe(value){assert.equal(value,true);for(let step=0;step<8;step++){await progress(state,step);const ready=await read();polls.push(ready);if(ready)return;}throw Error('Bounded target readiness exhausted');}};}};
  return {state,events,polls,run:()=>mappingBindingReadiness({page,expect,ref,record:{id:ref.recordId,document:{name:'Actual Mapping'}},target:{isVisible:async()=>state.visible,evaluateAll:async read=>read(state.visible&&!state.vanish?Array.from({length:state.targetCount},()=>({matches:selector=>{assert.equal(selector,':disabled');return !state.enabled;},getAttribute:name=>{assert.equal(name,'aria-disabled');return null;}})):[])},composition,check:()=>composition.check(),persist:async e=>events.push(e)})};
}

test('absent Mapping shell is a nonwaiting poll result until the exact editor mounts',async()=>{
  const f=fixture((state,step)=>{state.visible=true;state.shell=step>=4;});await f.run();assert.deepEqual(f.polls,[false,false,false,false,true]);
});
test('target disappearing after visibility probe remains a false sample, never a locator wait',async()=>{
  const f=fixture((state,step)=>{state.visible=true;state.vanish=step<3;});await f.run();assert.deepEqual(f.polls,[false,false,false,true]);
});
test('DOM probes reject duplicate status or target nodes',async()=>{
  for(const patch of [{statusCount:2},{targetCount:2}]){const f=fixture(state=>Object.assign(state,{visible:true},patch));await assert.rejects(f.run(),/exhausted/);assert.equal(f.events.length,1);}
});

test('selected Saved Mapping may have no target until its asynchronous Composition definition resolves',async()=>{
  let resolveDefinition;const definition=new Promise(r=>resolveDefinition=r);
  const f=fixture(async(state,step)=>{if(step===1){state.pending=1;state.outstanding=1;}if(step===3){resolveDefinition();await definition;state.visible=true;state.pending=0;}if(step===5)state.outstanding=0;});
  await f.run();assert.deepEqual(f.polls,[false,false,false,false,false,true]);assert.equal(f.events.at(-1).phase,'mapping-binding-readiness-verified');
});
test('visible target cannot authorize a different qualified Mapping',async()=>{
  const f=fixture(state=>{state.visible=true;state.url='http://host/mapping?provider=foreign&mapping=actual-mapping';});
  await assert.rejects(f.run(),/exhausted/);assert.equal(f.events.length,1);
});
test('dirty, wrong-name or disabled targets never satisfy readiness',async()=>{
  for(const patch of [{saved:false},{name:false},{enabled:false}]){const f=fixture(state=>Object.assign(state,{visible:true},patch));await assert.rejects(f.run(),/exhausted/);assert.equal(f.events.length,1);}
});
test('held original read prevents target admission even if the UI is visible',async()=>{
  const f=fixture(state=>{state.visible=true;state.held=Error('Original read uncertain');});await assert.rejects(f.run(),/uncertain/);assert.equal(f.events.length,1);
});
test('unresolved challenge stays bounded and produces no verified marker',async()=>{
  const f=fixture(state=>{state.visible=true;state.outstanding=1;});await assert.rejects(f.run(),/exhausted/);assert.equal(f.events.length,1);
});
test('driver waits for exact binding target before opening it and retains original writing gate',()=>{
  const source=readFileSync(new URL('./browser-driver.mjs',import.meta.url),'utf8');
  assert(source.includes('record:getRecord(snapshot,\'mappings\',intent.owner),target,composition,check:prewriteCheck,persist});await target.click()'));
  assert(source.includes("await beforeWrite('before-family-binding')"));
  assert(source.includes('return readiness.admit(route,()=>gate.handle(route))'));
});
