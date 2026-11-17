import assert from 'node:assert/strict';
import {validateSavedBinding,bindingRecoverySequenceProof} from './binding-recovery.mjs';
import {auditOriginalCompositionReads} from '../header/saved-reference.mjs';
import {assertInstalledIdentities} from './installed-identity.mjs';
import {assertFourInstallEvidence} from './installation-history.mjs';
import {assertInstallationOnly,installationIdentityPaths} from '../static/final-installation-bridge.mjs';
/** Validate actual completed read-only recovery artifacts, not a declared status alone. */
export function validateBindingRestartEvidence(evidence){
 const {paths,hashes,bundle,before,after,events,provenance,restart,proof}=evidence;
 for(const key of ['bundle','before','after','events','provenance','restart','proof']){assert(paths[key]?.startsWith('/'));assert.match(hashes[paths[key]],/^[a-f0-9]{64}$/);}
 assert.equal(restart.bundleHash,hashes[paths.bundle]);assert.deepEqual(before,after);assert.deepEqual(bundle.snapshot,before);assert.equal(bundle.intent.kind,'mapping-saved-binding');assert.deepEqual(restart.intent,bundle.intent);assert.equal(restart.beforeDigest,before.digest);assert.equal(restart.afterDigest,after.digest);assert.equal(restart.afterCapture,paths.after);assert.equal(provenance.sourceStatus,'');assert.equal(provenance.sourceHead,restart.source.head);assert.equal(provenance.baselineDigest,before.digest);
 for(const[p,h]of Object.entries(bundle.hashes))assert.equal(hashes[p],h,'Recovery frozen input changed');
 const saved=validateSavedBinding(after,bundle.savedReference);assert.equal(provenance.composer,saved.composer);assert.equal(provenance.stage,saved.stage);assert.deepEqual(proof,bindingRecoverySequenceProof(saved,restart));assertFourInstallEvidence(provenance.installed);
 assert(!events.some(e=>['held','read-held','request-before-dispatch','composition-put-before-dispatch'].includes(e.phase)),'Recovery contains a write or failed read');auditOriginalCompositionReads(after,events);
 const reads=events.filter(e=>e.phase==='post-reload-public-record-response');assert(reads.length,'Actual restarted original public record read required');for(const e of reads){assert.equal(e.domain,'mappings');assert.equal(e.workspaceId,after.workspaceId);assert.deepEqual(e.ref,saved.intent.owner);assert.equal(e.input.id,saved.result.record.id);assert.equal(e.status,200);assert.equal(e.body.ok,true);assert.equal(e.body.result.status,'loaded');assert.deepEqual(e.body.result.record,saved.result.record);}
 assert(events.some(e=>e.phase==='terminal-read-settlement-complete'),'Actual new read settlement required');
 return {saved,proof,restart,snapshot:after,hashes,paths};
}
/** Exactly one second installation gap: after genuine recovered phase12, before13. */
export function familyInstallationSupplementProof({originalBridge,recoveryEvidence,before,after,installation,originalDescriptorPath,recoveryManifestPath,afterPath,artifacts}){
 assert.equal(originalBridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(originalBridge.boundary,12);assert.equal(originalBridge.originalHistory.length,12);
 const recovery=validateBindingRestartEvidence(recoveryEvidence),saved=recovery.saved;
 assert.deepEqual(saved.intent.familyInstallationBridge,originalBridge.descriptor);assert.equal(saved.delta.beforeDigest,originalBridge.afterDigest);assert.equal(saved.originalSource,originalBridge.source);assert.equal(saved.composer,originalBridge.composer);assert.equal(saved.stage,originalBridge.stage);assert.deepEqual(before,recovery.snapshot);
 assert.notEqual(installation.composer,saved.composer,'Second bridge requires actual different immutable package');assert.equal(installation.stage,saved.stage);assert.match(installation.composer,/^[a-f0-9]{40}$/);assert.match(installation.source.head,/^[a-f0-9]{40}$/);assertFourInstallEvidence(installation.installed);assertInstalledIdentities(after,installation.identities);
 const get=(o,p)=>p.split('.').reduce((v,k)=>v[k],o),changes=installationIdentityPaths.filter(p=>get(before,p)!==get(after,p)).map(path=>({path,before:get(before,path),after:get(after,path)}));assertInstallationOnly(before,after,changes);
 return {schemaVersion:1,kind:'family-installation-supplement',boundary:13,originalDescriptorPath,originalDescriptor:originalBridge.descriptor,recoveryManifestPath,recoveryProofPath:recovery.paths.proof,beforeCapture:recovery.paths.after,afterCapture:afterPath,beforeDigest:before.digest,afterDigest:after.digest,changes,originalComposer:saved.composer,composer:installation.composer,stage:installation.stage,source:installation.source.head,identitiesPath:artifacts+'/public-identities.json',provenancePath:artifacts+'/provenance.json',originalScenario:'FAIL',recoveryStatus:recovery.proof.status};
}
export function assertFamilySupplementBoundary(originalBridge,supplement,history,snapshot){
 assert.equal(originalBridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(originalBridge.boundary,12);assert.equal(supplement.status,'FAMILY_INSTALLATION_SUPPLEMENT_VERIFIED');assert.equal(supplement.boundary,13);assert.deepEqual(supplement.originalDescriptor,originalBridge.descriptor);assert(history.length>=13);for(let i=0;i<12;i++)assert.deepEqual(history[i],originalBridge.originalHistory[i]);assert.deepEqual(history[12],supplement.recoveryProof);assert.deepEqual(history[12],bindingRecoverySequenceProof(history[12].savedBinding,history[12].restart));assert.equal(history[12].beforeDigest,originalBridge.afterDigest);assert.equal(history[12].afterDigest,supplement.beforeDigest);assert.equal(history[12].afterCapture,supplement.beforeCapture);
 if(history.length===13)assert.equal(snapshot.digest,supplement.afterDigest);else assert.equal(history[13].beforeDigest,supplement.afterDigest);
}
