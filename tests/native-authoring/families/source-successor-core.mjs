import assert from 'node:assert/strict';
import {assertReviewedHarnessDelta,assertSourceRebindBoundary} from './source-rebind-core.mjs';
/** One fixed successor to the accepted boundary16 source qualification, never arbitrary recursion. */
export function sourceSuccessorProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath}){
 assert.equal(chain.rebind.status,'FAMILY_SOURCE_REBIND_VERIFIED');assert.equal(chain.rebind.boundary,16);
 assert.equal(chain.history.length,17);assert.equal(chain.history[16].intent.sequence.step,'parent-pin');
 assert.deepEqual(chain.history[16].intent.familySourceRebind,chain.rebind.descriptor);
 assert.deepEqual(before,chain.snapshot);assert.deepEqual(after,before,'Successor cannot change any public state');
 assert.equal(oldInstallation.source.head,chain.rebind.source);assert.equal(oldInstallation.composer,'c5ffd410f74ba4b3aa003da068efeeae6e663c37');
 assert.equal(installation.composer,oldInstallation.composer);assert.equal(installation.stage,oldInstallation.stage);
 assert.deepEqual(installation.installed,oldInstallation.installed);assert.deepEqual(installation.identities,oldInstallation.identities);
 const changes=assertReviewedHarnessDelta(oldInstallation.source,installation.source,reviewed);
 assert(inputsPath.startsWith('/'));
 return{schemaVersion:1,kind:'family-source-rebind-successor',boundary:17,parentBoundary:16,parentDescriptor:chain.rebind.descriptor,composer:installation.composer,stage:installation.stage,oldSource:oldInstallation.source.head,source:installation.source.head,captureDigest:after.digest,changes,inputsPath};
}
export function assertSourceSuccessorBoundary(successor,parent,bridge,supplement,history,snapshot){
 assert.equal(successor.status,'FAMILY_SOURCE_SUCCESSOR_VERIFIED');assert.equal(successor.boundary,17);assert.equal(successor.parentBoundary,16);
 assert.deepEqual(successor.parentDescriptor,parent.descriptor);assert(history.length>=17);
 assertSourceRebindBoundary(parent,bridge,supplement,history,snapshot);
 for(let i=0;i<17;i++)assert.deepEqual(history[i],successor.history[i],'Accepted prefix through phase16 changed');
 if(history.length===17)assert.deepEqual(snapshot,successor.snapshot);
 for(let i=17;i<history.length;i++)assert.deepEqual(history[i].intent.familySourceRebindSuccessor,successor.descriptor,'Missing exact successor qualification');
}
