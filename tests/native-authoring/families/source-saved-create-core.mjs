import assert from 'node:assert/strict';
import {assertReviewedHarnessDelta} from './source-rebind-core.mjs';
import {assertSourceCreateBoundary} from './source-create-core.mjs';
import {mappingRecoverySequenceProof} from './mapping-recovery.mjs';
/** Fixed19 follows a saved-but-failed18 and genuine read-only recovery. */
export function sourceSavedCreateProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath,recovery}){
 assert.equal(chain.createHandoff.status,'FAMILY_SOURCE_CREATE_VERIFIED');assert.equal(chain.createHandoff.boundary,18);assert.equal(chain.history.length,18);assert.equal(chain.pending.intent.sequence.index,18);assert.equal(chain.pending.originalScenario,'FAIL');assert.equal(chain.pending.failureKind,'saved-create-before-reload-quiescence');
 assert.deepEqual(before,chain.snapshot);assert.deepEqual(after,before,'Only source changes across pending saved state');assert.equal(before.digest,chain.pending.delta.afterDigest);assert.equal(oldInstallation.source.head,chain.createHandoff.source);assert.equal(oldInstallation.composer,'c5ffd410f74ba4b3aa003da068efeeae6e663c37');assert.equal(installation.composer,oldInstallation.composer);assert.equal(installation.stage,oldInstallation.stage);assert.deepEqual(installation.installed,oldInstallation.installed);assert.deepEqual(installation.identities,oldInstallation.identities);
 assert.deepEqual(recovery,mappingRecoverySequenceProof(chain.pending,recovery.restart));assert.deepEqual(recovery.restart.source,installation.source);assert.equal(recovery.restart.beforeDigest,before.digest);assert.equal(recovery.restart.afterDigest,before.digest);
 const changes=assertReviewedHarnessDelta(oldInstallation.source,installation.source,reviewed);assert(inputsPath.startsWith('/'));return{schemaVersion:1,kind:'family-saved-create-handoff',boundary:19,pendingIndex:18,parentBoundary:18,parentDescriptor:chain.createHandoff.descriptor,composer:installation.composer,stage:installation.stage,oldSource:oldInstallation.source.head,source:installation.source.head,captureDigest:after.digest,pendingBeforeDigest:chain.pending.delta.beforeDigest,changes,inputsPath};
}
export function assertSourceSavedCreateBoundary(handoff,create,successor,parent,bridge,supplement,history,snapshot){
 assert.equal(handoff.status,'FAMILY_SAVED_CREATE_VERIFIED');assert.equal(handoff.boundary,19);assert.equal(handoff.pendingIndex,18);assert.deepEqual(handoff.parentDescriptor,create.descriptor);assert(history.length>=19);assertSourceCreateBoundary(create,successor,parent,bridge,supplement,history,snapshot);
 for(let i=0;i<19;i++)assert.deepEqual(history[i],handoff.history[i]);if(history.length===19)assert.deepEqual(snapshot,handoff.snapshot);for(let i=19;i<history.length;i++)assert.deepEqual(history[i].intent.familySavedCreateHandoff,handoff.descriptor);
}
