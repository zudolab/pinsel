import {createExpectedReader} from './expected-hashes.mjs';
import assert from 'node:assert/strict';
import {dirname,join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {inputHash} from './frozen-inputs.mjs';
import {nextFamilyIntent} from './sequence-core.mjs';
import {admitContentCreate,admitContentField,admitDuplicate,auditDelta} from './intents.mjs';
import {outputExchange} from './composition-output.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
import {releaseProof} from './release-proof.mjs';
import {validateSavedMapping,mappingRecoverySequenceProof} from './mapping-recovery.mjs';
const exec=promisify(execFile);
export const familyConsumers=['apps/editor','apps/authoring-worker','packages/pinsel-content','packages/pinsel-ui'];
export function assertFourInstallEvidence(installed){
 assert.deepEqual(installed.installedRoots.map(x=>x.consumer).sort(),[...familyConsumers].sort());
 assert.equal(new Set(installed.installedRoots.map(x=>x.packageManifestSha256)).size,1,'Four installed manifests must agree');
 assert.match(installed.installedLockSha256,/^[a-f0-9]{64}$/);
 for(const x of installed.installedRoots){assert(x.installedRoot.includes('/node_modules/.pnpm/zudo-composer@'));assert.match(x.packageManifestSha256,/^[a-f0-9]{64}$/);}
}
export function auditHistoricalWrite(before,after,proof,events){
 assert(!events.some(e=>/held|failed|uncertain/.test(e.phase)),'Accepted original phase has unresolved failure');
 assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,proof.intent);
 const intent=proof.intent;
 if(intent.kind!=='duplicate')assert(!events.some(e=>e.phase.startsWith('composition-put')));
 if(intent.kind==='duplicate')assert(!events.some(e=>e.phase==='request-before-dispatch'));
 if(intent.kind!=='duplicate')auditOriginalCompositionReads(before,events);
 if(intent.kind==='publish'){
  const release=releaseProof({snapshot:before,requested:intent.refs.map(ref=>({ref,action:'publish'})),expectedActive:intent.expectedActive});
  for(const e of events){
   if(e.phase==='public-workspace-token')release.workspaceRead(e.record);
   if(e.phase==='request-before-dispatch'){
    if(e.endpoint==='/__zudo-release'){assert.deepEqual(e.input,e.wire.request);assert(e.wire.clientId&&e.wire.requestId);release.before(e.input);}
    else if(e.endpoint==='/__zudo_composer_content_provider'){assert.deepEqual(e.input,e.wire);release.reconcileChallenge(e.releaseChallenge);release.reconcileBefore(e.input);}
    else assert.fail('Unexpected publication write endpoint');
   }
   if(e.phase==='request-response'){
    assert.equal(e.status,200);
    if(e.input.protocolVersion===2)release.after(e.input,e.body);else release.reconcileAfter(e.body);
   }
  }
  assert.deepEqual(release.finish(),proof.result.release);
  const expected=structuredClone(before);expected.digest=after.digest;expected.tokens.content++;
  for(const ref of intent.refs){const e=expected.project.providers.content.find(p=>p.id===ref.providerId).entries.find(e=>e.id===ref.recordId&&e.modelId===ref.modelId);assert.equal(e.lifecycle,'draft');e.lifecycle='published';e.generation=expected.tokens.content;}
  assert.deepEqual(after,expected);return;
 }
 let proposed;
 if(intent.kind==='duplicate'){
  const puts=events.filter(e=>e.phase==='composition-put-before-dispatch'),responses=events.filter(e=>e.phase==='composition-put-response');assert(puts.length&&puts.length===responses.length);
  proposed=admitDuplicate(before,intent,puts[0].input);
  const records=before.project.providers.compositions.find(p=>p.id==='files').records.concat(proposed);
  const exchange=outputExchange({records,targetIds:records.map(r=>r.id),input:puts[0].input});
  for(let i=0;i<puts.length;i++){if(i)exchange.continuation(puts[i].input);assert.deepEqual(responses[i].input,puts[i].input);assert.equal(responses[i].status,200);assert(events.indexOf(puts[i])<events.indexOf(responses[i]));exchange.response(responses[i].body);}
  auditOriginalCompositionReads(before,events.slice(0,events.indexOf(puts[0])));auditOriginalCompositionReads(after,events.slice(events.indexOf(responses.at(-1))+1));
  assert.equal(exchange.phase,'complete');assert.equal(responses.at(-1).body.result.canonical.status,'saved');
 }else{
  assert(['content-create','content-field'].includes(intent.kind),'Only original Results prefix is supported');
  const dispatch=events.filter(e=>e.phase==='request-before-dispatch'),responses=events.filter(e=>e.phase==='request-response');assert.equal(dispatch.length,1);assert.equal(responses.length,1);assert.equal(dispatch[0].endpoint,'/__zudo_composer_content_provider');assert.deepEqual(dispatch[0].input,dispatch[0].wire);assert.deepEqual(responses[0].input,dispatch[0].input);assert(events.indexOf(dispatch[0])<events.indexOf(responses[0]));assert.equal(responses[0].status,200);assert.deepEqual(responses[0].body,{ok:true,result:null});
  proposed=(intent.kind==='content-create'?admitContentCreate:admitContentField)(before,intent,dispatch[0].input);
 }
 assert.deepEqual(proposed,proof.result.record);auditDelta(before,after,intent,proposed);
}
/** Read original evidence; never reinterpret original source hashes as current source. */
export async function loadOriginalFamilyHistory({historyPath,configPath,repo,bytes=readFile}){
 const hashes={};const read=createExpectedReader(hashes,bytes,{absolute:true});const json=async p=>JSON.parse(await read(p));const events=async p=>(await read(p)).toString().trim().split('\n').map(JSON.parse);
 const paths=await json(historyPath),config=await json(configPath);assert.equal(config.kind,'results');assert.equal(paths.length,12,'Bridge supports the reviewed retained Results00–11 boundary only');assert.equal(new Set(paths).size,paths.length);
 const history=[],evidence=[];let previous,originalComposer,stage;
 for(let i=0;i<paths.length;i++){
  const proof=await json(paths[i]),dir=dirname(paths[i]),bundle=await json(join(dir,'accepted-inputs.json')),provenance=await json(join(dir,'runtime-provenance.json')),before=await json(join(dir,'before.json')),after=await json(proof.afterCapture);
  assert.equal(provenance.sourceStatus,'');assert.match(provenance.sourceHead,/^[a-f0-9]{40}$/);assert.match(provenance.composer,/^[a-f0-9]{40}$/);assertFourInstallEvidence(provenance.installed);
  originalComposer??=provenance.composer;stage??=provenance.stage;assert.equal(provenance.composer,originalComposer);assert.equal(provenance.stage,stage);assert.equal(provenance.baselineDigest,before.digest);assert.deepEqual(bundle.snapshot,before);assert.equal(provenance.intentSha256,bundle.hashes[Object.keys(bundle.hashes).find(p=>bundle.hashes[p]===provenance.intentSha256)]);
  for(const [p,hash]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),hash,'Original phase input changed');
  for(const consumer of familyConsumers){const {stdout}=await exec('git',['show',`${provenance.sourceHead}:${consumer}/package.json`],{cwd:repo,encoding:'utf8'});assert.equal(JSON.parse(stdout).dependencies['zudo-composer'],`git+https://github.com/Takazudo/zudo-composer.git#${provenance.composer}`);}
  for(const [name,hash]of Object.entries(provenance.sourceHashes)){assert(/^[a-zA-Z0-9_.-]+\.mjs$/.test(name));const {stdout}=await exec('git',['show',`${provenance.sourceHead}:tests/native-authoring/families/${name}`],{cwd:repo,encoding:'buffer',maxBuffer:4*1024*1024});assert.equal(inputHash(stdout),hash,'Original committed harness identity changed');}
  if(i===11){
   assert.equal(proof.status,'MAPPING_CREATE_RECOVERY_VERIFIED');const saved=validateSavedMapping(after,bundle.savedReference);assert.deepEqual(proof,mappingRecoverySequenceProof(saved,proof.restart));assert.deepEqual(proof.restart,await json(join(dir,'proof.json')));assert.deepEqual(before,after);assert.equal(proof.restart.bundleHash,inputHash(await read(join(dir,'accepted-inputs.json'))));
   for(const[p,hash]of Object.entries(saved.evidenceHashes))assert.equal(inputHash(await read(p)),hash);
   const recoveryEvents=await events(join(dir,'events.ndjson'));assert(!recoveryEvents.some(e=>['request-before-dispatch','composition-put-before-dispatch','read-held','held'].includes(e.phase)));auditOriginalCompositionReads(after,recoveryEvents);const publicRead=recoveryEvents.filter(e=>e.phase==='post-reload-public-record-response');assert(publicRead.some(e=>e.status===200&&e.body?.ok===true&&e.body.result?.status==='loaded'&&JSON.stringify(e.body.result.record)===JSON.stringify(saved.result.record)),'Original recovery public readback required');
   const originalBefore=bundle.savedReference.before;assert.deepEqual(originalBefore,previous);assert.deepEqual(nextFamilyIntent({config,snapshot:originalBefore,history,expectedActive:null,capturePath:proof.intent.capturePath}),proof.intent);
  }else{
   const digest=await json(join(dir,'accepted-input-sha256.json'));assert.equal(digest.sha256,inputHash(await read(join(dir,'accepted-inputs.json'))));assert.deepEqual(bundle.intent,proof.intent);if(previous)assert.deepEqual(before,previous);assert.equal(proof.beforeDigest,before.digest);assert.equal(proof.afterDigest,after.digest);
   assert.deepEqual(nextFamilyIntent({config,snapshot:before,history,expectedActive:proof.intent.expectedActive??null,capturePath:proof.intent.capturePath}),proof.intent);
   auditHistoricalWrite(before,after,proof,await events(join(dir,'events.ndjson')));
  }
  assert.equal(proof.afterDigest,after.digest);history.push(proof);previous=after;evidence.push({proofPath:paths[i],source:provenance.sourceHead,composer:provenance.composer,stage:provenance.stage,beforeDigest:proof.beforeDigest,afterDigest:proof.afterDigest});
 }
 return {paths,history,config,snapshot:previous,hashes,evidence,originalComposer,stage};
}
