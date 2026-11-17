import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {isDeepStrictEqual} from 'node:util';import {inputHash} from '../families/frozen-inputs.mjs';import {auditPhase} from './audit.mjs';import {phases} from './sequence.mjs';import {record,page} from './intents.mjs';
const recovered=new Set(['COMMITTED_PHASE_RECONCILED_AND_RELOAD_VERIFIED','ACKNOWLEDGED_PHASE_RECOVERED_AFTER_REVIEWED_INSTALLATION','COMMITTED_TITLE_RECONCILED_AND_RESTART_VERIFIED']);
const identityPaths=['digest','componentPack.digest','componentPack.compiler','renderer.digest'];
const contains=(value,target)=>isDeepStrictEqual(value,target)||(value&&typeof value==='object'&&Object.values(value).some(v=>contains(v,target)));
/** Only explicitly witnessed install identities may differ alongside the reviewed domain delta. */
export function auditRetainedPhase(before,after,result,identities){
 const normalized=structuredClone(after),changes=[];
 for(const path of identityPaths){const keys=path.split('.'),key=keys.pop(),a=keys.reduce((o,k)=>o[k],before),b=keys.reduce((o,k)=>o[k],normalized);if(a[key]!==b[key]){changes.push(path);b[key]=a[key];}}
 if(changes.some(p=>p!=='digest')){assert(identities,'Installed public identity evidence required');assert.deepEqual(after.componentPack,identities.componentPack);assert.deepEqual(after.renderer,identities.renderer);}
 auditPhase(before,normalized,result);return changes;
}
export function assertRetainedReceipt(events,result){
 if(result.domain==='compositions'||result.domain==='sitemaps'){
  const receipts=events.filter(e=>e.phase===(result.domain==='compositions'?'composition-put-response':'request-response')&&e.status===200&&e.body?.ok===true&&isDeepStrictEqual(e.input?.record,result.record));assert.equal(receipts.length,1,'One actual successful original record receipt required');if(result.domain==='compositions')assert.equal(receipts[0].body.result.canonical.status,'saved');
 }else if(result.domain==='publication'){
  const proofs=events.filter(e=>e.phase==='release-exact-identity');assert.equal(proofs.length,1);assert.deepEqual(proofs[0].result,result.release);assert(events.some(e=>e.phase==='request-response'&&e.input?.operation==='activate'&&e.status===200&&e.body?.ok===true&&isDeepStrictEqual(e.body.result.active,result.release.active)));
 }else{
  const saves=events.filter(e=>e.phase==='draft-save-after'||(e.phase==='request-response'&&e.input?.record?.id===result.ref.recordId));assert(saves.length>0);assert(saves.every(e=>e.status===200&&e.body?.ok===true),'Original Content responses required');
 }
}
/** Read actual external evidence; never turn recovered failures into native phase PASS. */
export async function loadRetained(manifestPath,{complete=true}={}){
 const hashes={};const bytes=async p=>{assert(p?.startsWith('/'));const b=await readFile(p);hashes[p]=inputHash(b);return b;};const json=async p=>JSON.parse(await bytes(p)),events=async p=>(await bytes(p)).toString().split('\n').filter(Boolean).map(JSON.parse);
 const manifest=await json(manifestPath);assert.equal(manifest.kind,'retained-static-evidence');assert(Array.isArray(manifest.proofPaths));assert(complete?manifest.proofPaths.length===15:manifest.proofPaths.length>0&&manifest.proofPaths.length<=15);const phasesEvidence=[];let previous;
 for(let i=0;i<manifest.proofPaths.length;i++){
  const proofPath=manifest.proofPaths[i],proof=await json(proofPath);assert.equal(proof.kind,phases[i]);assert(proof.status===undefined||recovered.has(proof.status)||proof.status==='STATIC_PHASE_CAPTURE_VERIFIED');
  const recoveredPhase=recovered.has(proof.status),original=proof.originalFailedAttempt??proof.originalFailure??dirname(proofPath),before=await json(join(original,'before.json')),after=await json(proof.afterCapture);assert.equal(before.digest,proof.beforeDigest);assert.equal(after.digest,proof.afterDigest);if(previous)assert.equal(before.digest,previous.afterDigest);
  const journal=await events(join(original,'events.ndjson'));assertRetainedReceipt(journal,proof.result);
  const begins=journal.filter(e=>e.phase==='begin');assert.equal(begins.length,1);const intent=begins[0].intent;assert.equal(intent.kind,proof.kind);assert.equal(intent.captureDigest,before.digest);
  const resources=structuredClone(previous?.resources??{marker:intent.name});
  if(i===0){assert.equal(proof.result.record.document.name,resources.marker);resources.composition=proof.result.ref;}
  if(proof.kind==='section-title')resources.sectionTitle=proof.result.record.document.root[0].props.title;
  if(proof.kind==='page-create'){const old=record(before,'sitemaps',proof.result.ref),oldIds=new Set();const walk=nodes=>nodes.forEach(n=>{oldIds.add(n.id);walk(n.children)});walk(old.document.root);const added=[];const scan=nodes=>nodes.forEach(n=>{if(!oldIds.has(n.id))added.push(n);scan(n.children)});scan(proof.result.record.document.root);assert.equal(added.length,1);resources.pageId=added[0].id;resources.parentId=intent.parentId;assert(page(proof.result.record.document,resources.parentId).children.some(n=>n.id===resources.pageId));}
  if(proof.kind==='copy-create')resources.copy=proof.result.ref;
  if(proof.kind==='navigation-add')resources.navigationId=proof.result.record.document.navigation.primary.at(-1).id;
  if(proof.kind==='reparent')resources.parentId=intent.toParentId;
  assert.deepEqual(proof.resources,resources,'Retained resources differ from acknowledged owner allocations');
  let identities;
  if(recoveredPhase){const dir=dirname(proofPath),recoveryBefore=await json(join(dir,'before.json'));assert.deepEqual(recoveryBefore,after,'Read-only recovery changed complete capture');const readback=await events(join(dir,'events.ndjson'));assert(!readback.some(e=>['request-before-dispatch','composition-put-before-dispatch','draft-save-before','create-request'].includes(e.phase)),'Recovery cannot include canonical write');assert(readback.some(e=>e.status===200&&e.body?.ok===true&&contains(e.body.result,proof.result.record)),'Recovered record requires successful public read');if(proof.identityEvidence)identities=await json(proof.identityEvidence);else if(proof.installationBridge)identities=await json(join(dir,'installed-identities.json'));}
  if(proof.installationBridge){const originalAfter=await json(join(original,'after.json')),bridge=proof.installationBridge;assert.equal(bridge.beforeCaptureDigest,originalAfter.digest);assert.equal(bridge.afterCaptureDigest,after.digest);const expected=structuredClone(originalAfter),changes=[];for(const path of identityPaths){const keys=path.split('.'),key=keys.pop(),a=keys.reduce((o,k)=>o[k],expected),b=keys.reduce((o,k)=>o[k],after);if(a[key]!==b[key]){changes.push({path,before:a[key],after:b[key]});a[key]=b[key];}}assert.deepEqual(after,expected);assert.deepEqual([...bridge.changes].sort((a,b)=>a.path.localeCompare(b.path)),changes.sort((a,b)=>a.path.localeCompare(b.path)));assert.equal(bridge.composerSha,proof.execution.composerSha);assert.equal(bridge.pinselSha,proof.execution.pinselSha);}
  const identityChanges=auditRetainedPhase(before,after,proof.result,identities);phasesEvidence.push({proofPath,originalStatus:proof.status??'external successful phase proof',originalAttempt:original,recovered:recoveredPhase,identityChanges,beforeDigest:before.digest,afterDigest:after.digest});previous=proof;
 }
 const snapshot=await json(manifest.capturePath);assert.deepEqual(snapshot,await json(previous.afterCapture),'Retained final capture differs from accepted chain');return {manifest,snapshot,resources:previous.resources,phasesEvidence,hashes};
}
