import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {historicalGitBatch} from './historical-git-batch.mjs';
import {inputHash,readExpectedBytes,mergeExpectedHashes} from './expected-hashes.mjs';
import {loadFamilyInstallationBridge,currentFamilyInstallation} from './installation-bridge.mjs';
import {familyInstallationSupplementProof,validateBindingRestartEvidence} from './installation-supplement.mjs';
import {familyConsumers} from './installation-history.mjs';
/** Verify historical committed bytes, without reading current install as the old one. */
export async function assertHistoricalFamilySource(repo,installation){
 const {source,composer}=installation;assert.match(source.head,/^[a-f0-9]{40}$/);assert.match(composer,/^[a-f0-9]{40}$/);
 const entries=await historicalGitBatch(repo,source.head),paths=entries.map(e=>e.path).sort();assert.deepEqual(Object.keys(source.hashes).sort(),paths,'Historical full source inventory changed');
 for(const entry of entries)assert.equal(inputHash(entry.bytes),source.hashes[entry.path],`Historical source bytes changed: ${entry.path}`);
 for(const consumer of familyConsumers){const manifest=entries.find(e=>e.path===`${consumer}/package.json`);assert(manifest);assert.equal(JSON.parse(manifest.bytes).dependencies['zudo-composer'],`git+https://github.com/Takazudo/zudo-composer.git#${composer}`);}
}
export async function loadHistoricalFamilyBridge({descriptor,repo,bytes=readFile}){
 const hashes={},read=path=>readExpectedBytes(path,hashes,bytes),json=async path=>JSON.parse(await read(path));
 const proof=await json(descriptor.proofPath),installation=await json(proof.provenancePath);await assertHistoricalFamilySource(repo,installation);
 const bridge=await loadFamilyInstallationBridge({descriptor,repo,installation,bytes:read});mergeExpectedHashes(hashes,bridge.hashes);return {...bridge,hashes,historical:true};
}
export async function loadBindingRestartArtifacts({manifestPath,repo,bytes=readFile}){
 const hashes={},read=path=>readExpectedBytes(path,hashes,bytes),json=async path=>JSON.parse(await read(path));const paths=await json(manifestPath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','events','proof','provenance','restart']);
 const evidence={paths,hashes};for(const[key,path]of Object.entries(paths)){assert(path.startsWith('/'));const b=await read(path);evidence[key]=key==='events'?b.toString().trim().split('\n').map(JSON.parse):JSON.parse(b);}
 for(const[path,hash]of Object.entries(evidence.bundle.hashes)){assert.equal(inputHash(await read(path)),hash,'Recovery frozen input changed');}
 // The original save bundle is nested, but its entire frozen input set is still mandatory.
 for(const[path,hash]of Object.entries(evidence.bundle.savedReference.bundle.hashes))assert.equal(inputHash(await read(path)),hash);
 validateBindingRestartEvidence(evidence);await assertHistoricalFamilySource(repo,{source:evidence.restart.source,composer:evidence.provenance.composer});
 for(const[path,hash]of Object.entries(hashes))assert.equal(inputHash(await bytes(path)),hash);return evidence;
}
export async function loadFamilyInstallationSupplement({originalDescriptor,descriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={},read=path=>{assert(path.startsWith('/'));return readExpectedBytes(path,hashes,bytes);},json=async path=>JSON.parse(await read(path));const frozenBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(frozenBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(frozenBytes);
 for(const[path,hash]of Object.entries(frozen)){assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(inputHash(await read(path)),hash,'Frozen supplement dependency changed');}
 const proof=await json(descriptor.proofPath);assert.equal(proof.kind,'family-installation-supplement');assert.equal(proof.boundary,13);assert.deepEqual(proof.originalDescriptor,originalDescriptor);assert.deepEqual(await json(proof.originalDescriptorPath),originalDescriptor);
 const originalBridge=await loadHistoricalFamilyBridge({descriptor:originalDescriptor,repo,bytes:read}),recoveryEvidence=await loadBindingRestartArtifacts({manifestPath:proof.recoveryManifestPath,repo,bytes:read});
 const historicalHashes={};mergeExpectedHashes(historicalHashes,originalBridge.hashes);mergeExpectedHashes(historicalHashes,recoveryEvidence.hashes);for(const[path,hash]of Object.entries(historicalHashes))assert.equal(frozen[path],hash,'Historical dependency not frozen by supplement');
 for(const path of [descriptor.proofPath,proof.originalDescriptorPath,proof.beforeCapture,proof.afterCapture,proof.provenancePath,proof.identitiesPath])assert(Object.hasOwn(frozen,path),'Unfrozen supplement dependency');
 const before=await json(proof.beforeCapture),after=await json(proof.afterCapture);installation??=await currentFamilyInstallation(repo,proof.composer,proof.stage);assert.deepEqual(await json(proof.provenancePath),installation);assert.deepEqual(await json(proof.identitiesPath),installation.identities);
 assert.deepEqual(proof,familyInstallationSupplementProof({originalBridge,recoveryEvidence,before,after,installation,originalDescriptorPath:proof.originalDescriptorPath,recoveryManifestPath:proof.recoveryManifestPath,afterPath:proof.afterCapture,artifacts:proof.provenancePath.slice(0,-'/provenance.json'.length)}));
 for(const[path,hash]of Object.entries(frozen))assert.equal(inputHash(await read(path)),hash);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return {originalBridge,supplement:{status:'FAMILY_INSTALLATION_SUPPLEMENT_VERIFIED',descriptor,originalDescriptor,boundary:13,beforeDigest:before.digest,afterDigest:after.digest,beforeCapture:proof.beforeCapture,afterCapture:proof.afterCapture,recoveryProof:recoveryEvidence.proof,composer:proof.composer,stage:proof.stage,source:proof.source,hashes,qualification:'Two explicit installation transitions only; original failed phase remains FAIL with separate genuine read-only recovery.'}};
}
