import{compactContinuationInputs}from'./continuation-core.mjs';
import {compactBoundaryInputs} from './boundary23-core.mjs';
import {validatePinsEvidence} from './pins-diagnostic.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputHash,readExpectedBytes,mergeExpectedHashes,createExpectedReader} from './expected-hashes.mjs';
export {inputHash} from './expected-hashes.mjs';
/** Capture each external JSON once. Runtime consumes only these captured objects. */
export async function freezeReadInputs(intentPath) {
  const hashes={};
  const read=async (path,lines=false)=>{const bytes=await readExpectedBytes(path,hashes);return lines?bytes.toString('utf8').trim().split('\n').map(line=>JSON.parse(line)):JSON.parse(bytes.toString('utf8'));};
  const intent=await read(intentPath),snapshot=await read(intent.capturePath);
  const headerProof=intent.kind==='header-restart'?await read(intent.forwardProofPath):null;
  let pinsEvidence;
  if(intent.kind==='mapping-pins-diagnostic'){
    const paths=await read(intent.diagnosticEvidencePath);
    assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','events','history','intent','provenance']);
    pinsEvidence={};for(const [key,path]of Object.entries(paths)){assert(path.startsWith('/'));pinsEvidence[key]=await read(path,key==='events');}
    for(const [path,hash]of Object.entries(pinsEvidence.bundle.hashes)){assert.equal(inputHash(await readExpectedBytes(path,hashes)),hash,'Original pin inputs changed');}
    for(const path of pinsEvidence.history)await read(path);
    pinsEvidence.lastProof=await read(pinsEvidence.history.at(-1));
    pinsEvidence.lastCapture=await read(pinsEvidence.lastProof.afterCapture);
    validatePinsEvidence(intent,snapshot,pinsEvidence);
  }

  let savedReference=null;
  if(['header-saved-href','knowledge-saved-reference','knowledge-captured-reference','mapping-saved-create','mapping-saved-binding'].includes(intent.kind)){
    const paths=await read(intent.recoveryEvidencePath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','bundleHash','events','provenance',...(intent.kind==='knowledge-captured-reference'?['uiResult']:[])]);
    savedReference={paths};for(const [key,path] of Object.entries(paths)){assert(path.startsWith('/'));savedReference[key]=await read(path,key==='events');}
    if(['mapping-saved-binding','mapping-saved-create'].includes(intent.kind)){for(const [path,expected]of Object.entries(savedReference.bundle.hashes)){const bytes=await readExpectedBytes(path,hashes);assert.equal(inputHash(bytes),expected,'Original binding input changed');}}
    if(intent.kind==='mapping-saved-create'&&savedReference.bundle.intent.familySourceCreateHandoff){const {dirname,join}=await import('node:path');savedReference.originalInstallation=await read(join(dirname(savedReference.bundle.intent.familySourceCreateHandoff.proofPath),'provenance.json'));}
    savedReference.hashes=['mapping-saved-binding','mapping-saved-create'].includes(intent.kind)?{...hashes}:Object.fromEntries(Object.values(paths).map(path=>[path,hashes[path]]));
  }
  let familyInstallationBridge,familyInstallationSupplement,familySourceRebind,familySourceRebindSuccessor,familySourceCreateHandoff,familySavedCreateHandoff;
  if(intent.familyContinuation){
    const bytes=createExpectedReader(hashes,readFile,{absolute:true}),api=await import('./continuation-loader.mjs');
    const loaded=await api.loadFamilyContinuation({descriptor:intent.familyContinuation,sourceBoundary:intent.familyOperatorSourceBoundary,repo:(await import('./config.mjs')).repoRoot,bytes});
    await api.validateContinuationRuntime({loaded,intent,snapshot,read:bytes,json:async p=>JSON.parse(await bytes(p))});
    mergeExpectedHashes(hashes,loaded.hashes);return compactContinuationInputs({intent,snapshot,hashes,continuation:loaded.continuation,sourceHead:loaded.liveSourceHead});
  }
  if(intent.familySourceBoundary23){
    const bytes=createExpectedReader(hashes,readFile,{absolute:true});
    const loaded=await(await import('./boundary23-loader.mjs')).loadFamilyBoundary23({descriptor:intent.familySourceBoundary23,repo:(await import('./config.mjs')).repoRoot,bytes});
    for(const[k,name]of [['familyInstallationBridge','originalDescriptor'],['familyInstallationSupplement','supplementDescriptor'],['familySourceRebind','parentDescriptor'],['familySourceRebindSuccessor','successorDescriptor'],['familySourceCreateHandoff','createDescriptor'],['familySavedCreateHandoff','descriptor']])assert.deepEqual(intent[k],loaded.descriptors[name]);
    if(intent.sequence.index===23)assert.deepEqual(snapshot,loaded.snapshot);
    await(await import('./boundary23-loader.mjs')).validateBoundary23Runtime({loaded,intent,snapshot,read:bytes,json:async path=>JSON.parse(await bytes(path))});
    mergeExpectedHashes(hashes,loaded.hashes);
    return compactBoundaryInputs({intent,snapshot,hashes,transition:loaded.transition});
  }
  if(intent.familySavedCreateHandoff){
    assert(intent.familySourceCreateHandoff&&intent.familySourceRebindSuccessor&&intent.familySourceRebind&&intent.familyInstallationBridge&&intent.familyInstallationSupplement);
    const chain=await(await import('./source-saved-create-loader.mjs')).loadFamilySavedCreateHandoff({descriptor:intent.familySavedCreateHandoff,createDescriptor:intent.familySourceCreateHandoff,successorDescriptor:intent.familySourceRebindSuccessor,parentDescriptor:intent.familySourceRebind,originalDescriptor:intent.familyInstallationBridge,supplementDescriptor:intent.familyInstallationSupplement,repo:(await import('./config.mjs')).repoRoot});
    familyInstallationBridge=chain.originalBridge;familyInstallationSupplement=chain.supplement;familySourceRebind=chain.rebind;familySourceRebindSuccessor=chain.successor;familySourceCreateHandoff=chain.createHandoff;familySavedCreateHandoff=chain.savedCreateHandoff;
    assert(intent.sequence?.index>=19);if(intent.sequence.index===19)assert.deepEqual(snapshot,familySavedCreateHandoff.snapshot);
    for(const part of [familyInstallationBridge,familyInstallationSupplement,familySourceRebind,familySourceRebindSuccessor,familySourceCreateHandoff,familySavedCreateHandoff])mergeExpectedHashes(hashes,part.hashes);
  }else if(intent.familySourceCreateHandoff){
    assert(intent.familySourceRebindSuccessor&&intent.familySourceRebind&&intent.familyInstallationBridge&&intent.familyInstallationSupplement);
    const chain=await(await import('./source-create-loader.mjs')).loadFamilySourceCreateHandoff({descriptor:intent.familySourceCreateHandoff,successorDescriptor:intent.familySourceRebindSuccessor,parentDescriptor:intent.familySourceRebind,originalDescriptor:intent.familyInstallationBridge,supplementDescriptor:intent.familyInstallationSupplement,repo:(await import('./config.mjs')).repoRoot});
    familyInstallationBridge=chain.originalBridge;familyInstallationSupplement=chain.supplement;familySourceRebind=chain.rebind;familySourceRebindSuccessor=chain.successor;familySourceCreateHandoff=chain.createHandoff;
    assert(intent.sequence?.index>=18);if(intent.sequence.index===18)assert.deepEqual(snapshot,familySourceCreateHandoff.snapshot);
    for(const part of [familyInstallationBridge,familyInstallationSupplement,familySourceRebind,familySourceRebindSuccessor,familySourceCreateHandoff])mergeExpectedHashes(hashes,part.hashes);
  }else if(intent.familySourceRebindSuccessor){
    assert(intent.familySourceRebind&&intent.familyInstallationBridge&&intent.familyInstallationSupplement);
    const chain=await(await import('./source-successor-loader.mjs')).loadFamilySourceSuccessor({descriptor:intent.familySourceRebindSuccessor,parentDescriptor:intent.familySourceRebind,originalDescriptor:intent.familyInstallationBridge,supplementDescriptor:intent.familyInstallationSupplement,repo:(await import('./config.mjs')).repoRoot});
    familyInstallationBridge=chain.originalBridge;familyInstallationSupplement=chain.supplement;familySourceRebind=chain.rebind;familySourceRebindSuccessor=chain.successor;
    assert(intent.sequence?.index>=17);if(intent.sequence.index===17)assert.deepEqual(snapshot,familySourceRebindSuccessor.snapshot);
    for(const part of [familyInstallationBridge,familyInstallationSupplement,familySourceRebind,familySourceRebindSuccessor])mergeExpectedHashes(hashes,part.hashes);
  }else if(intent.familySourceRebind){
    assert(intent.familyInstallationBridge&&intent.familyInstallationSupplement);
    const chain=await(await import('./source-rebind-loader.mjs')).loadFamilySourceRebind({descriptor:intent.familySourceRebind,originalDescriptor:intent.familyInstallationBridge,supplementDescriptor:intent.familyInstallationSupplement,repo:(await import('./config.mjs')).repoRoot});
    familyInstallationBridge=chain.originalBridge;familyInstallationSupplement=chain.supplement;familySourceRebind=chain.rebind;
    assert(intent.sequence?.index>=16);if(intent.sequence.index===16)assert.deepEqual(snapshot,familySourceRebind.snapshot);
    for(const part of [familyInstallationBridge,familyInstallationSupplement,familySourceRebind])mergeExpectedHashes(hashes,part.hashes);
  }else if(intent.familyInstallationSupplement){
    assert(intent.familyInstallationBridge,'Original bridge required');
    const chain=await(await import('./installation-supplement-loader.mjs')).loadFamilyInstallationSupplement({originalDescriptor:intent.familyInstallationBridge,descriptor:intent.familyInstallationSupplement,repo:(await import('./config.mjs')).repoRoot});
    familyInstallationBridge=chain.originalBridge;familyInstallationSupplement=chain.supplement;
    assert(intent.sequence?.index>=13);if(intent.sequence.index===13)assert.equal(snapshot.digest,familyInstallationSupplement.afterDigest);
    mergeExpectedHashes(hashes,familyInstallationBridge.hashes);mergeExpectedHashes(hashes,familyInstallationSupplement.hashes);
  }else if(intent.familyInstallationBridge){
    familyInstallationBridge=await(await import('./installation-bridge.mjs')).loadFamilyInstallationBridge({descriptor:intent.familyInstallationBridge,repo:(await import('./config.mjs')).repoRoot});
    assert(intent.sequence?.index>=familyInstallationBridge.boundary);
    if(intent.sequence.index===familyInstallationBridge.boundary)assert.equal(snapshot.digest,familyInstallationBridge.afterDigest);
    mergeExpectedHashes(hashes,familyInstallationBridge.hashes);
  }
  return {intent,snapshot,headerProof,...(familySavedCreateHandoff?{familySavedCreateHandoff}:{}),...(familySourceCreateHandoff?{familySourceCreateHandoff}:{}),...(familySourceRebindSuccessor?{familySourceRebindSuccessor}:{}),...(familySourceRebind?{familySourceRebind}:{}),...(pinsEvidence?{pinsEvidence}:{}),...(familyInstallationSupplement?{familyInstallationSupplement}:{}),...(familyInstallationBridge?{familyInstallationBridge}:{}),...(savedReference?{savedReference}:{}),hashes};
}
export async function assertInputsUnchanged(hashes) {
  for(const [path,hash] of Object.entries(hashes))assert.equal(inputHash(await readFile(path)),hash,`External acceptance input changed: ${path}`);
}
/** The expected hash is passed by the parent, never trusted from this file itself. */
export async function readFrozenBundle(path,expectedHash) {
  assert.match(expectedHash,/^[a-f0-9]{64}$/);
  const bytes=await readFile(path);assert.equal(inputHash(bytes),expectedHash,'Captured acceptance bundle changed');
  return JSON.parse(bytes.toString('utf8'));
}
