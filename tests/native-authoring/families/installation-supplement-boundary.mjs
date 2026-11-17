import assert from 'node:assert/strict';
import {bindingRecoverySequenceProof} from './binding-recovery.mjs';
export function assertFamilySupplementBoundary(originalBridge,supplement,history,snapshot){
 assert.equal(originalBridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(originalBridge.boundary,12);assert.equal(supplement.status,'FAMILY_INSTALLATION_SUPPLEMENT_VERIFIED');assert.equal(supplement.boundary,13);assert.deepEqual(supplement.originalDescriptor,originalBridge.descriptor);assert(history.length>=13);for(let i=0;i<12;i++)assert.deepEqual(history[i],originalBridge.originalHistory[i]);assert.deepEqual(history[12],supplement.recoveryProof);assert.deepEqual(history[12],bindingRecoverySequenceProof(history[12].savedBinding,history[12].restart));assert.equal(history[12].beforeDigest,originalBridge.afterDigest);assert.equal(history[12].afterDigest,supplement.beforeDigest);assert.equal(history[12].afterCapture,supplement.beforeCapture);
 if(history.length===13)assert.equal(snapshot.digest,supplement.afterDigest);else assert.equal(history[13].beforeDigest,supplement.afterDigest);
}
