import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const inputHash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Capture each external JSON once. Runtime consumes only these captured objects. */
export async function freezeReadInputs(intentPath) {
  const hashes={};
  const read=async path=>{const bytes=await readFile(path);hashes[path]=inputHash(bytes);return JSON.parse(bytes.toString('utf8'));};
  const intent=await read(intentPath),snapshot=await read(intent.capturePath);
  const headerProof=intent.kind==='header-restart'?await read(intent.forwardProofPath):null;
  return {intent,snapshot,headerProof,hashes};
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
