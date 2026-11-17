import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputHash,readExpectedBytes,mergeExpectedHashes} from './expected-hashes.mjs';
export {inputHash} from './expected-hashes.mjs';
/** Capture each external JSON once. Runtime consumes only these captured objects. */
export async function freezeReadInputs(intentPath) {
  const hashes={};
  const read=async (path,lines=false)=>{const bytes=await readExpectedBytes(path,hashes);return lines?bytes.toString('utf8').trim().split('\n').map(line=>JSON.parse(line)):JSON.parse(bytes.toString('utf8'));};
  const intent=await read(intentPath),snapshot=await read(intent.capturePath);
  const headerProof=intent.kind==='header-restart'?await read(intent.forwardProofPath):null;
  let savedReference=null;
  if(['knowledge-saved-reference','knowledge-captured-reference','mapping-saved-create'].includes(intent.kind)){
    const paths=await read(intent.recoveryEvidencePath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','bundleHash','events','provenance',...(intent.kind==='knowledge-captured-reference'?['uiResult']:[])]);
    savedReference={paths};for(const [key,path] of Object.entries(paths)){assert(path.startsWith('/'));savedReference[key]=await read(path,key==='events');}
    savedReference.hashes=Object.fromEntries(Object.values(paths).map(path=>[path,hashes[path]]));
  }
  let familyInstallationBridge;
  if(intent.familyInstallationBridge){
    familyInstallationBridge=await(await import('./installation-bridge.mjs')).loadFamilyInstallationBridge({descriptor:intent.familyInstallationBridge,repo:(await import('./config.mjs')).repoRoot});
    assert(intent.sequence?.index>=familyInstallationBridge.boundary);
    if(intent.sequence.index===familyInstallationBridge.boundary)assert.equal(snapshot.digest,familyInstallationBridge.afterDigest);
    mergeExpectedHashes(hashes,familyInstallationBridge.hashes);
  }
  return {intent,snapshot,headerProof,...(familyInstallationBridge?{familyInstallationBridge}:{}),...(savedReference?{savedReference}:{}),hashes};
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
