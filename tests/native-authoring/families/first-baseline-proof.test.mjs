import {test} from 'vitest';
import assert from 'node:assert/strict';
import {firstBaselineProof,auditFirstBaseline} from './first-baseline-proof.mjs';
import {baselineSelection,validateBaselineIntent} from './first-baseline-intent.mjs';
function setup(){
 const published={id:'kept',modelId:'note',lifecycle:'published',generation:1,values:{title:'Exact original'}};
 const draft={id:'held',modelId:'note',lifecycle:'draft',generation:2,values:{title:'Excluded'}};
 const snapshot={digest:'a'.repeat(64),workspaceId:'site',tokens:{workspace:1,compositions:'c',mappings:'m',sitemaps:'s',content:2,assets:'a'},project:{id:'site',providers:{compositions:[{id:'files',records:[]}],mappings:[{id:'mapping-filesystem',records:[]}],sitemaps:[{id:'sitemap-filesystem',records:[]}],content:[{id:'content-filesystem',models:[],entries:[draft,published]}]}}};
 const requested=baselineSelection(snapshot).map(ref=>({ref,action:'publish'}));
 const proof=firstBaselineProof({snapshot,requested,expectedActive:null});
 const meta=structuredClone(snapshot.project);for(const domain of Object.keys(meta.providers))meta.providers[domain]=meta.providers[domain].map(({id})=>({id}));
 proof.workspaceRead({id:'site',status:'ready',metadata:meta,mutationToken:1});
 proof.after({operation:'list'},{ok:true,result:{projects:[],active:null,generation:1}});
 const input={protocolVersion:2,operation:'plan',project:snapshot.project,workingPrecondition:{workspaceId:'site',sessionGeneration:1,tokens:{workspace:1,'compositions:files':'c','mappings:mapping-filesystem':'m','sitemaps:sitemap-filesystem':'s','content:content-filesystem':2,'assets:asset-files':'a'}},selection:requested,expectedRevision:null,expectedActive:null};
 const candidate=structuredClone(snapshot.project);candidate.providers.content[0].entries=[structuredClone(published)];
 const plan={workingProject:input.project,workingPrecondition:input.workingPrecondition,selection:requested,expectedActive:null,expectedRevision:null,storeGeneration:1,checks:[],toolchain:{compiler:'test'},candidate,projectRevision:'revision',buildId:'build',planDigest:'digest',publication:[{ref:requested[0].ref,expectedGeneration:1,expectedDigest:'digest',lifecycle:'published'}],assetLock:{}};
 return {snapshot,requested,proof,input,plan};
}
test('exact published first baseline excludes draft and requires public empty catalog',()=>{const{proof,input,plan}=setup();proof.before(input);proof.after(input,{ok:true,result:plan});assert.throws(()=>proof.finish());});
test('first baseline cannot select draft, omit published owner, or accept nonnull active',()=>{const{snapshot,requested}=setup();for(const refs of [[],[...requested,{ref:{providerId:'content-filesystem',modelId:'note',recordId:'held'},action:'publish'}]])assert.throws(()=>firstBaselineProof({snapshot,requested:refs,expectedActive:null}));assert.throws(()=>firstBaselineProof({snapshot,requested,expectedActive:{projectId:'site'}}));});
test('first baseline rejects active release and any staged project',()=>{const{snapshot,requested}=setup();for(const result of [{projects:[],active:{projectId:'site'},generation:1},{projects:[{projectId:'site',head:'staged'}],active:null,generation:1}]){const p=firstBaselineProof({snapshot,requested,expectedActive:null});assert.throws(()=>p.after({operation:'list'},{ok:true,result}));}});
test('candidate rejects value drift and unselected draft',()=>{for(const mutate of [p=>p.candidate.providers.content[0].entries[0].values.title='Changed',p=>p.candidate.providers.content[0].entries.push({id:'extra',modelId:'note',lifecycle:'published'})]){const{proof,input,plan}=setup();mutate(plan);assert.throws(()=>proof.after(input,{ok:true,result:plan}));}});
test('plan refuses changed token, omitted owner and foreign working project',()=>{for(const mutate of [i=>i.workingPrecondition.tokens['content:content-filesystem']++,i=>i.selection=[],i=>i.project.id='foreign']){const{proof,input}=setup();const changed=structuredClone(input);mutate(changed);assert.throws(()=>proof.before(changed));}});
test('activation requires exact staged build, reconciliation and final public candidate readback',()=>{
 const {proof,input,plan}=setup();proof.before(input);proof.after(input,{ok:true,result:plan});
 const staged={schemaVersion:2,projectId:'site',revision:'revision',buildId:'build',assetLock:{},toolchain:plan.toolchain,planDigest:'digest',publication:plan.publication};
 proof.before({protocolVersion:2,operation:'apply',plan});proof.after({operation:'apply'},{ok:true,result:{staged,stageGeneration:2}});
 const identity={projectId:'site',revision:'revision',buildId:'build'};
 proof.before({protocolVersion:2,operation:'build',projectId:'site',buildId:'build'});proof.after({operation:'build'},{ok:true,result:{stage:staged,identity,completionDigest:'complete',files:[],build:{}}});
 assert.throws(()=>proof.before({protocolVersion:2,operation:'activate',...identity,buildId:'foreign',expectedActive:null}));
 proof.before({protocolVersion:2,operation:'activate',...identity,expectedActive:null});
 proof.reconcileChallenge({kind:'reconcile',active:identity,changes:plan.publication,activationGeneration:3});proof.reconcileBefore({activationGeneration:3,reconciliations:plan.publication});proof.reconcileAfter({ok:true,result:{activationGeneration:3,providerId:'content-filesystem',models:[],entries:input.project.providers.content[0].entries,mutationToken:3}});
 proof.after({operation:'activate'},{ok:true,result:{active:identity,reconciliation:'applied',activationGeneration:3}});
 assert.throws(()=>proof.finish());proof.after({operation:'list'},{ok:true,result:{active:identity}});assert.throws(()=>proof.finish());
 proof.after({operation:'get',projectId:'site',revision:'revision'},{ok:true,result:{project:plan.candidate,revision:'revision'}});assert.deepEqual(proof.finish().active,identity);
});
test('intent binds exact capture and full qualified published selection',()=>{const{snapshot}=setup();const intent={kind:'first-baseline',capturePath:'/accepted.json',captureDigest:snapshot.digest,expectedActive:null,refs:baselineSelection(snapshot)};validateBaselineIntent(intent,snapshot);assert.throws(()=>validateBaselineIntent({...intent,refs:[]},snapshot));assert.throws(()=>validateBaselineIntent({...intent,captureDigest:'b'.repeat(64)},snapshot));assert.throws(()=>validateBaselineIntent({...intent,unexpected:true},snapshot));});

test('offline first baseline audit permits only receipt-backed global token increment',()=>{
 const {snapshot}=setup(),after=structuredClone(snapshot);after.digest='b'.repeat(64);after.tokens.content++;
 const release={active:{projectId:'site'},reconciledSnapshot:{mutationToken:after.tokens.content}};
 auditFirstBaseline(snapshot,after,release);
 for(const change of [s=>s.project.providers.content[0].entries[0].values.title='other',s=>s.project.providers.content[0].entries[1].generation++,s=>s.tokens.compositions='changed',s=>s.tokens.content++]){const bad=structuredClone(after);change(bad);assert.throws(()=>auditFirstBaseline(snapshot,bad,release));}
 assert.throws(()=>auditFirstBaseline(snapshot,after,{}));
});
