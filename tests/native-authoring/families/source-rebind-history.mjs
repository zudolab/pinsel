import assert from 'node:assert/strict';
import {dirname,join} from 'node:path';
import {nextFamilyIntent} from './sequence-core.mjs';
import {admitBinding,admitRecordEdit,auditDelta} from './intents.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
import {inputHash} from './expected-hashes.mjs';
/** Original13–15 use their original committed harness and actual original receipt, not current source. */
export async function loadSourceRebindHistory({historyPath,configPath,read,json,chain,oldInstallation}){
 const paths=await json(historyPath),config=await json(configPath);assert.equal(config.kind,'results');assert.equal(paths.length,16);assert.equal(new Set(paths).size,16);
 const history=await Promise.all(paths.map(json));for(let i=0;i<12;i++)assert.deepEqual(history[i],chain.originalBridge.originalHistory[i]);assert.deepEqual(history[12],chain.supplement.recoveryProof);
 let previous=await json(chain.supplement.afterCapture);
 for(let i=13;i<16;i++){
  const proof=history[i],dir=dirname(paths[i]),bundle=await json(join(dir,'accepted-inputs.json')),provenance=await json(join(dir,'runtime-provenance.json')),before=await json(join(dir,'before.json')),after=await json(proof.afterCapture),events=(await read(join(dir,'events.ndjson'))).toString().trim().split('\n').map(JSON.parse);
  assert.deepEqual(before,previous);assert.deepEqual(bundle.snapshot,before);assert.deepEqual(bundle.intent,proof.intent);assert.equal(proof.beforeDigest,before.digest);assert.equal(proof.afterDigest,after.digest);
  assert.equal((await json(join(dir,'accepted-input-sha256.json'))).sha256,inputHash(await read(join(dir,'accepted-inputs.json'))));
  for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);
  assert.equal(provenance.sourceStatus,'');assert.equal(provenance.sourceHead,oldInstallation.source.head);assert.equal(provenance.composer,oldInstallation.composer);assert.equal(provenance.stage,oldInstallation.stage);assert.deepEqual(provenance.installed,oldInstallation.installed);assert.equal(provenance.baselineDigest,before.digest);
  for(const[name,h]of Object.entries(provenance.sourceHashes)){assert(/^[\w.-]+\.mjs$/.test(name));assert.equal(h,oldInstallation.source.hashes['tests/native-authoring/families/'+name]);}
  assert.deepEqual(nextFamilyIntent({config,snapshot:before,history:history.slice(0,i),capturePath:proof.intent.capturePath,expectedActive:null,installationBridge:chain.originalBridge,installationSupplement:chain.supplement}),proof.intent);
  assert(!events.some(e=>/held|failed|uncertain/.test(e.phase)));assert.deepEqual(events.find(e=>e.phase==='begin')?.intent,proof.intent);
  const writes=events.filter(e=>e.phase==='request-before-dispatch'),responses=events.filter(e=>e.phase==='request-response');assert.equal(writes.length,1);assert.equal(responses.length,1);const w=writes[0],r=responses[0];assert.equal(w.endpoint,'/__zudo_composer_mapping_provider');assert.deepEqual(w.input,w.wire);assert.deepEqual(r.input,w.input);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true,result:null});assert(events.indexOf(w)<events.indexOf(r));assert(!events.some(e=>e.phase.startsWith('composition-put')));
  const record=(i===13?admitBinding:admitRecordEdit)(before,proof.intent,w.input);assert.deepEqual(record,proof.result.record);auditDelta(before,after,proof.intent,record);auditOriginalCompositionReads(before,events);
  assert(events.some(e=>e.phase==='post-reload-public-record-response'&&e.status===200&&e.body?.ok===true&&JSON.stringify(e.body.result?.record)===JSON.stringify(record)),'Original exact record readback missing');
  previous=after;
 }
 return{...chain,paths,history,config,snapshot:previous};
}
