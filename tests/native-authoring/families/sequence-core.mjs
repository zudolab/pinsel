import{assertContinuationBoundary,RECOVERY23}from'./continuation-core.mjs';
import {assertBoundary23,RECOVERY22} from './boundary23-core.mjs';
import {assertSourceSavedCreateBoundary} from './source-saved-create-core.mjs';
import {assertSourceCreateBoundary} from './source-create-core.mjs';
import {assertSourceSuccessorBoundary} from './source-successor-core.mjs';
import {assertSourceRebindBoundary} from './source-rebind-core.mjs';
import {assertFamilySupplementBoundary} from './installation-supplement-boundary.mjs';
import {bindingRecoverySequenceProof} from './binding-recovery.mjs';
import {assertFamilyBridgeBoundary} from './installation-boundary.mjs';
import {mappingRecoverySequenceProof} from './mapping-recovery.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {FAMILY,inspectFamilySource} from './family-graph.mjs';
import {getRecord} from './intents.mjs';
import {assertOperatorRecoveryIdentity,RECOVERY26} from './operator-recovery26.mjs';
export function continuationIntentPlain(intent){const {familyBoundaryHistory,familyOperatorSourceBoundary,...plain}=intent;return plain;}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ref=(domain,id)=>({providerId:domain==='mappings'?'mapping-filesystem':'files',recordId:id});
/** Pure next-step generator. Receipts are caller supplied; no stores/network/private imports. */
export function nextFamilyIntent({config,snapshot,history,expectedActive,capturePath,installationBridge,installationSupplement,sourceRebind,sourceSuccessor,sourceCreate,savedCreate,boundary23,continuation}) {
 if(continuation)assertContinuationBoundary(continuation,boundary23,history,snapshot);
 if(boundary23)assertBoundary23(boundary23,history,snapshot);
 if(savedCreate)assertSourceSavedCreateBoundary(savedCreate,sourceCreate,sourceSuccessor,sourceRebind,installationBridge,installationSupplement,history,snapshot);
 if(sourceCreate)assertSourceCreateBoundary(sourceCreate,sourceSuccessor,sourceRebind,installationBridge,installationSupplement,history,snapshot);
 if(sourceSuccessor)assertSourceSuccessorBoundary(sourceSuccessor,sourceRebind,installationBridge,installationSupplement,history,snapshot);
 if(sourceRebind)assertSourceRebindBoundary(sourceRebind,installationBridge,installationSupplement,history,snapshot);
 if(installationSupplement)assertFamilySupplementBoundary(installationBridge,installationSupplement,history,snapshot);
 if(installationBridge)assertFamilyBridgeBoundary(installationBridge,history,snapshot);
 const spec=FAMILY[config.kind];assert(spec);assert(/^[a-z][a-z0-9-]{4,60}$/.test(config.marker));assert(config.childText&&config.parentTitle&&config.answer);inspectFamilySource(snapshot,config.kind);
 const configHash=hash(config),steps=[];const add=(name,fn)=>steps.push({name,fn});
 const completed=name=>{const p=history.find(p=>p.intent.sequence.step===name);assert(p,`Missing accepted prerequisite ${name}`);return p.result.record;};
 const content=role=>({providerId:'content-filesystem',modelId:role==='parent'?spec.parentModel:spec.childModel,recordId:completed(`${role}-create`).id});
 const composition=role=>ref('compositions',completed(`${role}-duplicate`).id);
 const mapping=role=>ref('mappings',completed(`${role}-mapping`).id);
 const model=id=>snapshot.project.providers.content.find(p=>p.id==='content-filesystem').models.find(m=>m.id===id).document;
 const recordEdit=(domain,owner,edit,action)=>{const document=structuredClone(getRecord(snapshot,domain,owner).document);edit(document);return{kind:'record-edit',domain,owner,document,action};};
 const query=(role,name,edit,action)=>add(`${role}-${name}`,()=>recordEdit('mappings',mapping(role),d=>edit(d.mode.query),action));
 const field=(role,id,value)=>add(`${role}-${id}`,()=>({kind:'content-field',domain:'content',owner:content(role),fieldId:id,value:typeof value==='function'?value():value}));
 for(const role of ['parent','child']) {
  add(`${role}-create`,()=>({kind:'content-create',domain:'content',modelId:role==='parent'?spec.parentModel:spec.childModel}));
  const values=role==='parent'?(config.kind==='results'?{'result-year-label':config.marker,'result-year-declared-count':1,'result-year-order':999}:{'faq-group-title':config.parentTitle,'faq-group-order':999}):(config.kind==='results'?{'result-entry-year':()=>content('parent'),'result-entry-school':config.childText,'result-entry-department':'Acceptance department','result-entry-order':1}:{'faq-item-group':()=>content('parent'),'faq-item-question':config.childText,'faq-item-answer':config.answer,'faq-item-order':1});
  for(const [id,value]of Object.entries(values))field(role,id,value);
 }
 add('publish',()=>{assert(expectedActive,'Accepted active release receipt required');return{kind:'publish',domain:'publication',refs:[content('parent'),content('child')],expectedActive};});
 for(const role of ['parent','child','toc']) {
  add(`${role}-duplicate`,()=>({kind:'duplicate',domain:'compositions',source:ref('compositions',spec[`${role}Template`])}));
  const props=role==='toc'?{number:999,...(config.kind==='faq'?{href:'#'+config.marker}:{})}:config.kind==='faq'?(role==='parent'?{fragmentId:config.marker}:{idPrefix:config.marker,openFirst:false}):{};
  for(const[prop,value]of Object.entries(props))add(`${role}-prop-${prop}`,()=>recordEdit('compositions',composition(role),d=>d.root[0].props[prop]=value,{kind:typeof value==='boolean'?'toggle':'fill',label:({number:'番号',href:'リンク先',fragmentId:'Fragment id',idPrefix:'id 接頭辞',openFirst:'先頭を開く'})[prop],value,treeRoot:true}));
  add(`${role}-mapping`,()=>({kind:'mapping-create',domain:'mappings',name:`${config.marker}-${role}`,contentModel:{providerId:'content-filesystem',recordId:role==='child'?spec.childModel:spec.parentModel},composition:composition(role)}));
  for(const[label,prop]of spec[`${role}Bindings`])add(`${role}-bind-${prop}`,()=>{const f=model(role==='child'?spec.childModel:spec.parentModel).fields.find(f=>f.label===label);assert(f);return{kind:'binding',domain:'mappings',owner:mapping(role),fieldId:f.id,fieldLabel:label,title:role==='toc'?'TOC item':spec[`${role}Title`],target:{nodeId:getRecord(snapshot,'compositions',composition(role)).document.root[0].id,prop}};});
  if(config.kind==='results'&&role==='toc')for(const[kind,value]of [['select','prefix'],['fill','#year-']])add(`toc-href-${kind}`,()=>{const owner=mapping(role),old=getRecord(snapshot,'mappings',owner);const b=old.document.bindings.find(b=>b.target.prop==='href');assert(b);return recordEdit('mappings',owner,d=>d.bindings.find(x=>x.id===b.id).transform={kind:'prefix',prefix:kind==='select'?'':value},{kind,label:`${kind==='select'?'Transform':'Prefix'} for 年度 → TOC item.href`,value});});
  add(`${role}-collection`,()=>recordEdit('mappings',mapping(role),d=>d.mode={kind:'collection',query:{publication:'published-only',conditions:[],sort:[],pins:[],limit:100}},{kind:'select',label:'Mapping mode',value:'collection'}));
  query(role,'limit',q=>q.limit=role==='child'?1000:1,{kind:'fill',label:'Result limit',value:role==='child'?1000:1});
  if(role!=='child')query(role,'pin',q=>q.pins=[content('parent')],{kind:'pins',get ref(){return content('parent');}});
  else {
   query(role,'filter-add',q=>{const f=model(spec.childModel).fields[0];q.conditions=[{fieldId:f.id,operator:f.kind==='reference'?'exists':'equals',...(f.kind==='reference'?{}:{value:f.kind==='number'?0:''})}];},{kind:'button',label:'Add filter'});
   // Current reviewed family models put the qualified reference first. Refuse schema drift.
   add('child-reference-equals',()=>{assert.equal(model(spec.childModel).fields[0].id,spec.referenceField);return recordEdit('mappings',mapping(role),d=>d.mode.query.conditions=[{fieldId:spec.referenceField,operator:'equals',value:content('parent')}],{kind:'query-reference',ref:content('parent')});});
   query(role,'reference-not-equals',q=>q.conditions[0].operator='not-equals',{kind:'select',label:'Filter 1 operator',value:'not-equals'});
   query(role,'reference-equals-again',q=>q.conditions[0].operator='equals',{kind:'select',label:'Filter 1 operator',value:'equals'});
   query(role,'sort-add',q=>{const f=model(spec.childModel).fields.find(f=>f.kind!=='reference');q.sort=[{fieldId:f.id,direction:'asc'}];},{kind:'button',label:'Add sort'});
   query(role,'sort-field',q=>q.sort[0].fieldId=spec.orderField,{kind:'select',label:'Sort 1 field',value:spec.orderField});
  }
 }
 for(const role of ['body','toc'])add(`${role}-group`,()=>({kind:'group',domain:'compositions',owner:ref('compositions',role==='body'?spec.page:spec.tocOwner),parentId:role==='body'?'archive':getRecord(snapshot,'compositions',ref('compositions',spec.tocOwner)).document.root[0].id,slotId:role==='body'?'body':'items'}));
 for(const role of ['child','parent','toc'])add(`${role}-attach`,()=>{const owner=role==='child'?composition('parent'):ref('compositions',role==='parent'?spec.page:spec.tocOwner);let nodeId;if(role==='child')nodeId=getRecord(snapshot,'compositions',owner).document.root[0].id;else{const doc=completed(`${role==='parent'?'body':'toc'}-group`).document;const find=nodes=>nodes.flatMap(n=>[n,...find(Object.values(n.slots).flat())]);const groupProof=history.find(p=>p.intent.sequence.step===`${role==='parent'?'body':'toc'}-group`);const parent=find(doc.root).find(n=>n.id===groupProof.intent.parentId);const group=parent.slots[groupProof.intent.slotId].at(-1);assert.equal(group.componentId,'pinsel.group');nodeId=group.id;}return{kind:'attachment',domain:'workspace',owner,mapping:mapping(role),target:{nodeId,slotId:'items'}};});
 assert(history.length<=steps.length);for(let i=0;i<history.length;i++){const p=history[i];if(p.status===RECOVERY23){assert(continuation&&i===23);assert.deepEqual(p,continuation.history[23]);}if(p.status===RECOVERY22){assert(boundary23&&i===22);assert.deepEqual(p,boundary23.history[22]);}if(p.status==='MAPPING_BINDING_RECOVERY_VERIFIED')assert.deepEqual(p,bindingRecoverySequenceProof(p.savedBinding,p.restart));if(p.status==='MAPPING_CREATE_RECOVERY_VERIFIED')assert.deepEqual(p,mappingRecoverySequenceProof(p.savedMapping,p.restart));if(p.status===RECOVERY26){assert(continuation&&i===26,'Operator recovery belongs only at index 26');assertOperatorRecoveryIdentity(p,history[i-1],continuation.descriptor);}assert.equal(p.intent.sequence.configHash,configHash);assert.equal(p.intent.sequence.index,i);assert.equal(p.intent.sequence.step,steps[i].name);assert.equal(p.intent.captureDigest,p.beforeDigest);if(i)assert.equal(p.beforeDigest,installationSupplement&&i===installationSupplement.boundary?installationSupplement.afterDigest:installationBridge&&i===installationBridge.boundary?installationBridge.afterDigest:history[i-1].afterDigest);assert(p.result&&p.afterDigest&&p.afterCapture);}
 if(history.length)assert.equal(snapshot.digest,installationSupplement&&history.length===installationSupplement.boundary?installationSupplement.afterDigest:installationBridge&&history.length===installationBridge.boundary?installationBridge.afterDigest:history.at(-1).afterDigest,'Fresh capture must equal accepted final proof');
 if(history.length===steps.length)return{complete:true,configHash,steps:steps.length,content:{parent:content('parent'),child:content('child')},compositions:Object.fromEntries(['parent','child','toc'].map(role=>[role,getRecord(snapshot,'compositions',composition(role))])),mappings:Object.fromEntries(['parent','child','toc'].map(role=>[role,getRecord(snapshot,'mappings',mapping(role))])),placements:Object.fromEntries(['body','toc'].map(role=>{const p=history.find(p=>p.intent.sequence.step===`${role}-group`);const find=nodes=>nodes.flatMap(n=>[n,...find(Object.values(n.slots).flat())]);return [role,find(p.result.record.document.root).find(n=>n.id===p.intent.parentId).slots[p.intent.slotId].at(-1)];})),oldFragment:config.kind==='results'?'year-'+getRecord(snapshot,'content',{providerId:'content-filesystem',modelId:spec.parentModel,recordId:spec.sourceParent}).values['result-year-label']:getRecord(snapshot,'compositions',ref('compositions',spec.parentTemplate)).document.root[0].props.fragmentId,marker:config.marker,childText:config.childText};
 const step=steps[history.length],intent=step.fn();return{...intent,...(continuation?{familyContinuation:continuation.descriptor}:{}),...(boundary23?{familySourceBoundary23:boundary23.descriptor}:{}),...(savedCreate?{familySavedCreateHandoff:savedCreate.descriptor}:{}),...(sourceCreate?{familySourceCreateHandoff:sourceCreate.descriptor}:{}),...(sourceSuccessor?{familySourceRebindSuccessor:sourceSuccessor.descriptor}:{}),...(sourceRebind?{familySourceRebind:sourceRebind.descriptor}:{}),...(installationSupplement?{familyInstallationSupplement:installationSupplement.descriptor}:{}),...(installationBridge?{familyInstallationBridge:installationBridge.descriptor}:{}),family:config.kind,capturePath,captureDigest:snapshot.digest,sequence:{configHash,index:history.length,step:step.name,total:steps.length}};
}
