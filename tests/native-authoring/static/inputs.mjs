import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputHash} from '../families/frozen-inputs.mjs';
import {sequenceState} from './sequence.mjs';
import {prepareIntent} from './prepare-intent.mjs';
import {metadataRecoveryStatus,verifyMetadataRecovery} from './metadata-recovery.mjs';
import {join} from 'node:path';
/** Each recovered phase is re-verified from its frozen original and recovery artifacts; every byte read is hash-bound. */
export async function verifyRecoveredProofs({proofPaths,proofs,recoveryFreezeManifests={},bytes}){
 const json=async p=>JSON.parse(await bytes(p)),events=async p=>(await bytes(p)).toString().split('\n').filter(Boolean).map(JSON.parse),recovered=new Set();
 for(let i=0;i<proofs.length;i++){const proof=proofs[i];if(proof.status!==metadataRecoveryStatus){assert(!Object.hasOwn(recoveryFreezeManifests,proofPaths[i]),'Freeze mapping for a non-recovered proof');continue;}
  const original=proof.originalFailure;assert(original?.startsWith('/'));const before=await json(join(original,'before.json')),after=await json(proof.afterCapture);assert.equal(proof.beforeDigest,before.digest,'Recovered proof beforeDigest differs from the held attempt before-capture');assert.equal(proof.afterDigest,after.digest,'Recovered proof afterDigest differs from its after-capture');await verifyMetadataRecovery({index:i,proofPath:proofPaths[i],proof,manifest:{recoveryFreezeManifests},before,after,original,journal:await events(join(original,'events.ndjson')),bytes,json,events});recovered.add(i);}
 assert.deepEqual(Object.keys(recoveryFreezeManifests).filter(p=>!proofPaths.includes(p)),[],'Freeze mapping outside the proof chain');return recovered;
}
export async function readInputs(intentPath){
 const hashes={};const read=async path=>{assert(path?.startsWith('/'));const bytes=await readFile(path);hashes[path]=inputHash(bytes);return JSON.parse(bytes);};
 const intent=await read(intentPath),snapshot=await read(intent.capturePath);assert(Array.isArray(intent.proofPaths));const proofs=[];for(const path of intent.proofPaths)proofs.push(await read(path));const activeProof=await read(intent.activeProofPath);
 const bytes=async path=>{assert(path?.startsWith('/'));const b=await readFile(path);if(Object.hasOwn(hashes,path))assert.equal(inputHash(b),hashes[path],`Evidence changed on repeated read: ${path}`);else hashes[path]=inputHash(b);return b;};
 const recovered=[...await verifyRecoveredProofs({proofPaths:intent.proofPaths,proofs,recoveryFreezeManifests:intent.recoveryFreezeManifests,bytes})];
 return {intent,snapshot,proofs,activeProof,hashes,recovered};
}
export async function validateInputs({intent,snapshot,proofs,activeProof,recovered=[]},compile){
 assert.equal(snapshot.digest,intent.captureDigest);assert.match(snapshot.digest,/^[a-f0-9]{64}$/);
 assert.equal(activeProof.status,'READ_ONLY_RESTART_VERIFIED');assert.equal(activeProof.intent.kind,'active-identity');assert.equal(activeProof.beforeDigest,activeProof.afterDigest);
 const activeIdentity=activeProof.result.active??activeProof.result;assert.equal(activeIdentity.projectId,snapshot.project.id);assert(activeIdentity.revision&&activeIdentity.buildId);
 const sequence=sequenceState(proofs,snapshot,intent.resources.marker,{recovered:new Set(recovered)});assert.equal(Object.hasOwn(intent,'recoveryFreezeManifests'),recovered.length>0,'Recovered proofs require exactly their reviewed freeze mapping');
 assert.equal(proofs.length?proofs[0].beforeDigest:snapshot.digest,activeProof.afterDigest,'Initial sequence must start at accepted active readback');
 const priorRelease=proofs.filter(p=>p.kind==='copy-publish').at(-1)?.result.release.active??activeIdentity;
 const expected=await prepareIntent({...sequence,snapshot,capturePath:intent.capturePath,activeIdentity:priorRelease,compile});
 assert.deepEqual(intent,{...expected,sequence:sequence.sequence,proofPaths:intent.proofPaths,activeProofPath:intent.activeProofPath,...(recovered.length?{recoveryFreezeManifests:intent.recoveryFreezeManifests}:{})});
 return intent;
}
