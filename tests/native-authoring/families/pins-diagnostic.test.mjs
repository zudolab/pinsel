import {test} from 'vitest';
import assert from 'node:assert/strict';
import {pinsDiagnosticSample,observePinsDiagnostic,validatePinsEvidence} from './pins-diagnostic.mjs';
import {classifyRead} from './readonly-proof.mjs';
const ref={providerId:'mapping-filesystem',recordId:'m'};
const record={id:'m',document:{name:'Parent',mode:{kind:'collection'},contentModel:{providerId:'content-filesystem',recordId:'result-year'},composition:{providerId:'files',recordId:'c'}}};
function fixture(){
 const state={shell:false,exact:false,withAction:false,pending:1,unavailable:false};
 const node={value:'collection',textContent:'Ordered pins Choose',getAttribute:key=>key==='data-state'?'saved':null,matches:()=>false};
 const loc=present=>({count:async()=>Number(present()),isVisible:async()=>present(),evaluateAll:async fn=>fn(present()?[node]:[])});
 const target=loc(()=>state.exact),sections={...loc(()=>state.exact),getByRole:()=>target};
 const page={url:()=> 'http://localhost/mapping?provider=mapping-filesystem&mapping=m',locator:selector=>selector==='section'?{filter:()=>sections}:selector==='.cms-topbar__status'?loc(()=>state.shell):selector==='h3'?loc(()=>state.shell):{getByText:()=>loc(()=>state.shell)},getByLabel:()=>loc(()=>state.shell),getByText:()=>loc(()=>state.unavailable),getByRole:(role,{name})=>loc(()=>name==='Ordered pins'?state.exact:name==='Ordered pins Choose'?state.withAction:state.shell)};
 const composition={check(){},get readiness(){return{pending:state.pending,outstanding:0};}};
 return{state,page,ref,record,composition};
}
test('missing shell produces nonwaiting counts without a click method',async()=>{const f=fixture();const s=await pinsDiagnosticSample(f);assert.equal(s.status.count,0);assert.equal(s.sectionCount,0);assert.equal(s.ready,false);});
test('exact-heading mismatch remains distinct from loaded query and action',async()=>{const f=fixture();Object.assign(f.state,{shell:true,withAction:true,pending:0});const s=await pinsDiagnosticSample(f);assert.equal(s.originalHeadingCount,0);assert.equal(s.headingWithActionCount,1);assert.equal(s.allChooseCount,1);assert.equal(s.predicates.collectionMode,true);assert.equal(s.ready,false);assert.equal(s.headings[0].text,'Ordered pins Choose');});
test('source unavailable is recorded separately',async()=>{const f=fixture();Object.assign(f.state,{shell:true,unavailable:true});const s=await pinsDiagnosticSample(f);assert(s.sourceUnavailable.visible);assert(!s.ready);});
test('delayed shell resolves within original180second bound',async()=>{const f=fixture();let clock=0;const r=await observePinsDiagnostic({...f,check(){},persist:async()=>{},now:()=>clock,pause:async ms=>{clock+=ms;Object.assign(f.state,{shell:true,exact:true,pending:0});}});assert(r.ready);assert.equal(r.samples,2);assert.equal(r.elapsedMs,1000);});
test('persistent exact-selector mismatch ends with readyfalse, no action',async()=>{const f=fixture();Object.assign(f.state,{shell:true,withAction:true,pending:0});let clock=0;const r=await observePinsDiagnostic({...f,check(){},persist:async()=>{},now:()=>clock,pause:async ms=>clock+=ms});assert.equal(r.elapsedMs,180000);assert.equal(r.ready,false);assert.equal(r.status,'MAPPING_PINS_DIAGNOSTIC_OBSERVED');});
test('original fail must be prewrite with full identical state',()=>{
 const snapshot={digest:'a'.repeat(64),project:{providers:{mappings:[{id:ref.providerId,records:[record]}],compositions:[{id:'files',records:[{id:'c',document:{root:[{componentId:'pinsel.year-section'}]}}]}]}}};
 const intent={kind:'mapping-pins-diagnostic',owner:ref,diagnosticEvidencePath:'/e'};
 const failed={kind:'record-edit',owner:ref,sequence:{index:16,step:'parent-pin'},action:{kind:'pins'},captureDigest:snapshot.digest};
 const evidence={before:snapshot,after:snapshot,intent:failed,bundle:{intent:failed},history:Array(16).fill('/proof'),lastProof:{intent:{sequence:{index:15}},afterDigest:snapshot.digest},lastCapture:snapshot,events:[{phase:'held'}]};
 assert(validatePinsEvidence(intent,snapshot,evidence));
 assert.throws(()=>validatePinsEvidence(intent,snapshot,{...evidence,events:[...evidence.events,{phase:'request-before-dispatch'}]}));
 assert.throws(()=>validatePinsEvidence(intent,snapshot,{...evidence,after:{...snapshot,digest:'b'.repeat(64)}}));
});
test('canonical Mapping writes remain refused by original readonly transport',()=>{assert.throws(()=>classifyRead('/__zudo_composer_mapping_provider',{'x-zudo-composer-capability':'c','x-zudo-composer-workspace':'w','x-zudo-composer-operation':'put'},{},'w'),/mutation/);});
