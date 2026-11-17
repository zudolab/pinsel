import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {inputHash,createExpectedReader,mergeExpectedHashes} from './expected-hashes.mjs';
import {assertHistoricalFamilySource,loadFamilyInstallationSupplement} from './installation-supplement-loader.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
import {loadSourceRebindHistory} from './source-rebind-history.mjs';
import {sourceRebindProof} from './source-rebind-core.mjs';
const exec=promisify(execFile);
export async function assertGitModes(repo,oldHead,newHead,reviewed){
 const modes=async head=>{const {stdout}=await exec('git',['ls-tree','-r','-z',head],{cwd:repo,maxBuffer:16*1024*1024});return Object.fromEntries(stdout.split('\0').filter(Boolean).map(row=>{const [meta,path]=row.split('\t');return[path,meta.split(' ')[0]];}));};
 const old=await modes(oldHead),current=await modes(newHead);for(const[path,mode]of Object.entries(current))if(old[path])assert.equal(mode,old[path],'Source file mode changed');
 for(const {path}of reviewed){if(old[path])assert.equal(old[path],'100644');if(current[path])assert.equal(current[path],'100644');}
}
export async function assertFailureEvidence({manifest,snapshot,read,json,oldInstallation,repo}){
 assert.deepEqual(Object.keys(manifest).sort(),['diagnostic','extra','pin']);assert(Array.isArray(manifest.extra));assert.equal(new Set(manifest.extra).size,manifest.extra.length);
 for(const[k,keys]of [['pin',['after','before','bundle','events','log','provenance']],['diagnostic',['after','before','bundle','dom','events','log','provenance','screenshot','verified']]]){
  const paths=manifest[k];assert.deepEqual(Object.keys(paths).sort(),keys.sort());const bundle=await json(paths.bundle),events=(await read(paths.events)).toString().trim().split('\n').map(JSON.parse),provenance=await json(paths.provenance);
  assert.deepEqual(await json(paths.before),snapshot);assert.deepEqual(await json(paths.after),snapshot);assert.deepEqual(bundle.snapshot,snapshot);
  for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);
  assert.equal(provenance.composer,oldInstallation.composer);assert.equal(provenance.stage,oldInstallation.stage);assert.deepEqual(provenance.installed,oldInstallation.installed);assert.equal(provenance.sourceStatus,'');
  for(const[name,h]of Object.entries(provenance.sourceHashes)){assert(/^[\w.-]+\.mjs$/.test(name));const{stdout}=await exec('git',['show',`${provenance.sourceHead}:tests/native-authoring/families/${name}`],{cwd:repo,encoding:'buffer',maxBuffer:16*1024*1024});assert.equal(inputHash(stdout),h);}
  assert(!events.some(e=>['request-before-dispatch','request-response','composition-put-before-dispatch','composition-put-response'].includes(e.phase)),'Failure contained a canonical attempt');
  const log=(await read(paths.log)).toString();assert(log.includes('verdict=FAIL exit=1'),'Retain original failed status');
  if(k==='pin'){assert.equal(bundle.intent.sequence.index,16);assert.equal(bundle.intent.sequence.step,'parent-pin');assert(events.some(e=>e.phase==='held'));}
  else{assert.equal(bundle.intent.kind,'mapping-pins-diagnostic');assert(log.includes('Exact captured host preview response required'));assert(events.some(e=>e.phase==='mapping-pins-diagnostic-result'));assert(events.some(e=>e.phase==='terminal-read-settlement-complete'));for(const key of ['dom','screenshot','verified'])assert((await read(paths[key])).length);}
 }
 for(const path of manifest.extra)await read(path);
}
export async function readSourceRebindInputs({inputsPath,repo,installation,bytes=readFile}){
 const hashes={},read=createExpectedReader(hashes,bytes,{absolute:true}),json=async path=>JSON.parse(await read(path));
 const paths=await json(inputsPath);assert.deepEqual(Object.keys(paths).sort(),['afterPath','beforePath','configPath','expectedSourceHead','failuresPath','historyPath','originalDescriptorPath','reviewedChangesPath','supplementDescriptorPath']);
 const originalDescriptor=await json(paths.originalDescriptorPath),supplementDescriptor=await json(paths.supplementDescriptorPath),supplementProof=await json(supplementDescriptor.proofPath),oldInstallation=await json(supplementProof.provenancePath);
 await assertHistoricalFamilySource(repo,oldInstallation);
 const originalChain=await loadFamilyInstallationSupplement({originalDescriptor,descriptor:supplementDescriptor,repo,installation:oldInstallation,bytes:read});mergeExpectedHashes(hashes,originalChain.originalBridge.hashes);mergeExpectedHashes(hashes,originalChain.supplement.hashes);
 const chain=await loadSourceRebindHistory({historyPath:paths.historyPath,configPath:paths.configPath,read,json,chain:originalChain,oldInstallation});
 const before=await json(paths.beforePath),after=await json(paths.afterPath),reviewed=await json(paths.reviewedChangesPath);assert.notEqual(paths.beforePath,paths.afterPath);
 await assertFailureEvidence({manifest:await json(paths.failuresPath),snapshot:chain.snapshot,read,json,oldInstallation,repo});
 installation??=await currentFamilyInstallation(repo,oldInstallation.composer,oldInstallation.stage);
 assert.match(paths.expectedSourceHead,/^[a-f0-9]{40}$/);assert.equal(installation.source.head,paths.expectedSourceHead,'Reviewed current source SHA required');
 await assertGitModes(repo,oldInstallation.source.head,installation.source.head,reviewed);
 const proof=sourceRebindProof({chain,before,after,oldInstallation,installation,reviewed,paths:{inputsPath}});
 return{hashes,chain,oldInstallation,installation,before,after,proof,originalDescriptor,supplementDescriptor};
}
export async function loadFamilySourceRebind({descriptor,originalDescriptor,supplementDescriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={},read=createExpectedReader(hashes,bytes),json=async path=>JSON.parse(await read(path));const freezeBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(freezeBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(freezeBytes);
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);
 const proof=await json(descriptor.proofPath);assert.equal(proof.kind,'family-source-rebind');assert(Object.hasOwn(frozen,descriptor.proofPath));
 const loaded=await readSourceRebindInputs({inputsPath:proof.inputsPath,repo,installation,bytes:read});assert.deepEqual(proof,loaded.proof);assert.deepEqual(originalDescriptor,loaded.originalDescriptor);assert.deepEqual(supplementDescriptor,loaded.supplementDescriptor);
 for(const[p,h]of Object.entries(loaded.hashes))assert.equal(frozen[p],h,'Unfrozen rebind dependency');
 const provenancePath=descriptor.proofPath.slice(0,-'/bridge.json'.length)+'/provenance.json';assert(Object.hasOwn(frozen,provenancePath));assert.deepEqual(await json(provenancePath),loaded.installation);
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return{...loaded.chain,rebind:{status:'FAMILY_SOURCE_REBIND_VERIFIED',boundary:16,descriptor,originalDescriptor,supplementDescriptor,source:proof.source,composer:proof.composer,stage:proof.stage,snapshot:loaded.after,history:loaded.chain.history,hashes}};
}
