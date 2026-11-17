import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mappingControlReadiness} from './control-readiness.mjs';
function fixture(progress=()=>{},draft=false){
 const ref={providerId:'mapping-filesystem',recordId:'actual'},state={url:'http://host/mapping?provider=mapping-filesystem&mapping=actual',status:draft?'unsaved':'saved',name:true,mode:'collection',visible:true,enabled:true,count:1,options:['expected'],value:'expected',pending:0,outstanding:0,error:null},events=[],samples=[];
 const target={isVisible:async()=>state.visible,evaluateAll:async(fn,args)=>fn(Array.from({length:state.count},()=>({matches:()=>!state.enabled,getAttribute:()=>null,value:state.value,options:state.options.map(value=>({value,disabled:false}))})),args)};
 const page={url:()=>state.url,locator:s=>s==='.cms-topbar__status'?{evaluateAll:async fn=>fn([{getAttribute:()=>state.status}])}:{getByText:(name,options)=>{assert.equal(name,'Actual');assert.deepEqual(options,{exact:true});return{isVisible:async()=>state.name};}},getByLabel:(label,options)=>{assert.equal(label,'Mapping mode');assert.deepEqual(options,{exact:true});return{evaluateAll:async fn=>fn([{value:state.mode}])};}};
 const check=()=>{if(state.error)throw state.error;},composition={check,get readiness(){return{pending:state.pending,outstanding:state.outstanding};},assertSettled(){assert.equal(state.pending+state.outstanding,0);}};
 const expect={poll:(fn,options)=>{assert.equal(options.timeout,180000);return({toBe:async value=>{assert.equal(value,true);for(let i=0;i<8;i++){await progress(state,i);const result=await fn();samples.push(result);if(result)return;}throw Error('Readiness timeout');}});}};
 const run=()=>mappingControlReadiness({page,expect,ref,record:{id:'actual',document:{name:'Actual',mode:{kind:'collection'}}},controls:[{target,option:'expected',value:'expected'}],composition,check,persist:async e=>events.push(e),draft,collection:true,boundary:'test'});
 return{state,events,samples,run};
}
test('delayed option/control and original reads all settle before readiness',async()=>{const f=fixture((s,i)=>{s.enabled=i>=2;s.options=i>=4?['expected']:[];s.pending=i<5?1:0;s.outstanding=i<6?1:0;});await f.run();assert.deepEqual(f.samples,[false,false,false,false,false,false,true]);});
for(const [name,patch]of Object.entries({wrongOwner:{url:'http://host/mapping?provider=foreign&mapping=actual'},wrongName:{name:false},disabled:{enabled:false},missingOption:{options:['foreign']},duplicateOption:{options:['expected','expected']},wrongSelectedTarget:{value:'default-target'},duplicateControl:{count:2},wrongMode:{mode:'single'},pending:{pending:1},challenge:{outstanding:1},dirtyInitial:{status:'unsaved'}}))test(`refuses ${name} without verified evidence`,async()=>{const f=fixture(s=>Object.assign(s,patch));await assert.rejects(f.run(),/timeout/);assert.equal(f.events.length,1);});
test('second local reference gesture permits dirty without an intervening save',async()=>{const f=fixture((s,i)=>{s.options=i>=3?['expected']:[];},true);await f.run();assert.equal(f.state.status,'unsaved');assert.equal(f.events.at(-1).draft,true);assert.equal(f.samples.length,4);});
test('a saved shell cannot impersonate the intended dirty intermediate draft',async()=>{const f=fixture(s=>s.status='saved',true);await assert.rejects(f.run(),/timeout/);});
test('provider error and held original request fail without ignoring uncertainty',async()=>{for(const patch of [{status:'failed'},{error:Error('original uncertain')}]){const f=fixture(s=>Object.assign(s,patch));await assert.rejects(f.run(),/error|uncertain/);assert.equal(f.events.length,1);}});
test('wrong owner, missing option and stale source stop the gesture continuation',async()=>{
 for(const patch of [{url:'http://host/mapping?provider=foreign&mapping=actual'},{options:[]},{error:Error('Stale captured source')}]){
  let gestures=0;const f=fixture(s=>Object.assign(s,patch));const action=async()=>{await f.run();gestures++;};await assert.rejects(action());assert.equal(gestures,0);assert(!f.events.some(e=>e.phase.endsWith('-verified')));
 }
});
