import {test} from 'vitest';
import assert from 'node:assert/strict';
import {bindingDiagnosticSample,observeBindingDiagnostic,validateBindingDiagnostic} from './binding-diagnostic.mjs';
import {classifyRead} from './readonly-proof.mjs';
const ref={providerId:'mapping-filesystem',recordId:'m'},record={id:'m',document:{name:'Parent',composition:{providerId:'files',recordId:'c'}}};
function fixture(){
 const state={url:'http://localhost/mapping?provider=mapping-filesystem&mapping=m',shell:false,name:false,target:false,enabled:false,pending:1,outstanding:1};
 const names={count:async()=>Number(state.name),isVisible:async()=>state.name};
 const target={evaluateAll:async fn=>fn(state.target?[{matches:()=>!state.enabled,getAttribute:()=>null}]:[]),isVisible:async()=>state.target};
 const page={url:()=>state.url,locator:selector=>selector==='.cms-topbar__status'?{evaluateAll:async fn=>fn(state.shell?[{getAttribute:()=> 'saved'}]:[])}:{getByText:()=>names}};
 const composition={check(){},get readiness(){return{pending:state.pending,outstanding:state.outstanding};}};
 return{state,page,target,composition,ref,record};
}
test('missing shell records every predicate without implicit locator waits',async()=>{
 const f=fixture(),s=await bindingDiagnosticSample(f);assert.equal(s.status.count,0);assert.deepEqual(s.predicates,{qualified:true,saved:false,nameVisible:false,targetVisible:false,targetEnabled:false,compositionSettled:false});
});
test('resolved target remains distinguishable from global pending reads',async()=>{
 const f=fixture();Object.assign(f.state,{shell:true,name:true,target:true,enabled:true});const s=await bindingDiagnosticSample(f);assert(s.predicates.targetVisible&&s.predicates.saved);assert(!s.predicates.compositionSettled);assert(!s.ready);
});
test('samples delayed target and terminates only after all predicates hold',async()=>{
 const f=fixture(),events=[];let clock=0;const result=await observeBindingDiagnostic({...f,check(){},persist:async e=>events.push(e),now:()=>clock,pause:async ms=>{clock+=ms;Object.assign(f.state,{shell:true,name:true,target:true,enabled:true,pending:0,outstanding:0});}});assert.equal(events.length,2);assert(result.ready);assert.equal(result.elapsedMs,1000);
});
test('unchanged missing target ends at180seconds as observation, never sequence PASS',async()=>{
 const f=fixture();let clock=0;const result=await observeBindingDiagnostic({...f,check(){},persist:async()=>{},now:()=>clock,pause:async ms=>{clock+=ms;}});assert.equal(result.elapsedMs,180000);assert.equal(result.samples,181);assert.equal(result.ready,false);assert.equal(result.status,'MAPPING_BINDING_DIAGNOSTIC_OBSERVED');
});
test('held provider stops diagnostic, without masking its failure',async()=>{
 const f=fixture();await assert.rejects(observeBindingDiagnostic({...f,check(){throw Error('held');},persist:async()=>{}}),/held/);
});
test('qualified target validation rejects unrelated composition and root',()=>{
 const snapshot={project:{providers:{mappings:[{id:ref.providerId,records:[record]}],compositions:[{id:'files',records:[{id:'c',document:{root:[{id:'root',componentId:'pinsel.year-section'}]}}]}]}}};
 const intent={kind:'mapping-binding-diagnostic',owner:ref,title:'Results year',target:{nodeId:'root',prop:'label'}};
 assert.equal(validateBindingDiagnostic(intent,snapshot),record);assert.throws(()=>validateBindingDiagnostic({...intent,target:{nodeId:'wrong',prop:'label'}},snapshot));assert.throws(()=>validateBindingDiagnostic({...intent,title:'Other'},snapshot));
});
test('diagnostic keeps existing readonly transport mutation refusal',()=>{
 const headers={'x-zudo-composer-capability':'cap','x-zudo-composer-workspace':'w','x-zudo-composer-operation':'put'};
 assert.throws(()=>classifyRead('/__zudo_composer_mapping_provider',headers,{record},'w'),/mutation/);
});
