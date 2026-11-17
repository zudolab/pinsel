import assert from 'node:assert/strict';
import {assertReviewedHarnessDelta} from './source-rebind-core.mjs';
import {assertSourceSuccessorBoundary} from './source-successor-core.mjs';
/** Fixed boundary18 only, after the genuine accepted phase17 duplicate. */
export function sourceCreateProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath}){
 assert.equal(chain.successor.status,'FAMILY_SOURCE_SUCCESSOR_VERIFIED');assert.equal(chain.successor.boundary,17);
 assert.equal(chain.history.length,18);assert.equal(chain.history[17].intent.sequence.step,'child-duplicate');assert.deepEqual(chain.history[17].intent.familySourceRebindSuccessor,chain.successor.descriptor);
 assert.deepEqual(before,chain.snapshot);assert.deepEqual(after,before);assert.equal(oldInstallation.source.head,chain.successor.source);assert.equal(oldInstallation.composer,'c5ffd410f74ba4b3aa003da068efeeae6e663c37');assert.equal(installation.composer,oldInstallation.composer);assert.equal(installation.stage,oldInstallation.stage);assert.deepEqual(installation.installed,oldInstallation.installed);assert.deepEqual(installation.identities,oldInstallation.identities);
 const changes=assertReviewedHarnessDelta(oldInstallation.source,installation.source,reviewed);assert(inputsPath.startsWith('/'));
 return{schemaVersion:1,kind:'family-source-create-handoff',boundary:18,parentBoundary:17,parentDescriptor:chain.successor.descriptor,composer:installation.composer,stage:installation.stage,oldSource:oldInstallation.source.head,source:installation.source.head,captureDigest:after.digest,changes,inputsPath};
}
export function assertSourceCreateBoundary(handoff,successor,parent,bridge,supplement,history,snapshot){
 assert.equal(handoff.status,'FAMILY_SOURCE_CREATE_VERIFIED');assert.equal(handoff.boundary,18);assert.equal(handoff.parentBoundary,17);assert.deepEqual(handoff.parentDescriptor,successor.descriptor);assert(history.length>=18);assertSourceSuccessorBoundary(successor,parent,bridge,supplement,history,snapshot);
 for(let i=0;i<18;i++)assert.deepEqual(history[i],handoff.history[i]);if(history.length===18)assert.deepEqual(snapshot,handoff.snapshot);
 for(let i=18;i<history.length;i++)assert.deepEqual(history[i].intent.familySourceCreateHandoff,handoff.descriptor);
}
