import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputHash} from '../families/frozen-inputs.mjs';
import {sequenceState} from './sequence.mjs';
import {prepareIntent} from './prepare-intent.mjs';
export async function readInputs(intentPath){
 const hashes={};const read=async path=>{assert(path?.startsWith('/'));const bytes=await readFile(path);hashes[path]=inputHash(bytes);return JSON.parse(bytes);};
 const intent=await read(intentPath),snapshot=await read(intent.capturePath);assert(Array.isArray(intent.proofPaths));const proofs=[];for(const path of intent.proofPaths)proofs.push(await read(path));const activeProof=await read(intent.activeProofPath);
 return {intent,snapshot,proofs,activeProof,hashes};
}
export async function validateInputs({intent,snapshot,proofs,activeProof},compile){
 assert.equal(snapshot.digest,intent.captureDigest);assert.match(snapshot.digest,/^[a-f0-9]{64}$/);
 assert.equal(activeProof.status,'READ_ONLY_RESTART_VERIFIED');assert.equal(activeProof.intent.kind,'active-identity');assert.equal(activeProof.beforeDigest,activeProof.afterDigest);
 const activeIdentity=activeProof.result.active??activeProof.result;assert.equal(activeIdentity.projectId,snapshot.project.id);assert(activeIdentity.revision&&activeIdentity.buildId);
 const sequence=sequenceState(proofs,snapshot,intent.resources.marker);
 assert.equal(proofs.length?proofs[0].beforeDigest:snapshot.digest,activeProof.afterDigest,'Initial sequence must start at accepted active readback');
 const priorRelease=proofs.filter(p=>p.kind==='copy-publish').at(-1)?.result.release.active??activeIdentity;
 const expected=await prepareIntent({...sequence,snapshot,capturePath:intent.capturePath,activeIdentity:priorRelease,compile});
 assert.deepEqual(intent,{...expected,sequence:sequence.sequence,proofPaths:intent.proofPaths,activeProofPath:intent.activeProofPath});
 return intent;
}
