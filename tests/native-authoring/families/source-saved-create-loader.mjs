import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {readExpectedBytes,inputHash,mergeExpectedHashes} from './expected-hashes.mjs';
import {assertGitModes} from './source-rebind-loader.mjs';
import {loadFamilySourceCreateHandoff} from './source-create-loader.mjs';
import {assertHistoricalFamilySource} from './installation-supplement-loader.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
import {sourceSavedCreateProof} from './source-saved-create-core.mjs';
import {loadPendingSavedCreate,loadSavedCreateRestart} from './source-saved-create-history.mjs';
import {assertSuccessorProvenance} from './source-successor-history.mjs';
export async function loadHistoricalCreate({createDescriptor,successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json}){
 const proof=await json(createDescriptor.proofPath);assert.equal(proof.kind,'family-source-create-handoff');assert.equal(proof.boundary,18);const oldInstallation=await json(join(dirname(createDescriptor.proofPath),'provenance.json'));assert.equal(oldInstallation.source.head,proof.source);await assertHistoricalFamilySource(repo,oldInstallation);const parent=await loadFamilySourceCreateHandoff({descriptor:createDescriptor,successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation:oldInstallation,bytes:read});return{parent,oldInstallation};
}
export async function readSourceSavedCreateInputs({inputsPath,repo,installation,bytes=readFile}){
 const hashes={},read=p=>{assert(p.startsWith('/'));return readExpectedBytes(p,hashes,bytes);},json=async p=>JSON.parse(await read(p));
 const paths=await json(inputsPath);assert.deepEqual(Object.keys(paths).sort(),['afterPath','beforePath','createDescriptorPath','expectedSourceHead','failurePath','historyPath','originalDescriptorPath','parentDescriptorPath','recoveryPath','reviewedChangesPath','successorDescriptorPath','supplementDescriptorPath']);
 const originalDescriptor=await json(paths.originalDescriptorPath),supplementDescriptor=await json(paths.supplementDescriptorPath),parentDescriptor=await json(paths.parentDescriptorPath),successorDescriptor=await json(paths.successorDescriptorPath),createDescriptor=await json(paths.createDescriptorPath);
 const {parent,oldInstallation}=await loadHistoricalCreate({createDescriptor,successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json});mergeExpectedHashes(hashes,parent.createHandoff.hashes);
 const historyPaths=await json(paths.historyPath);assert.deepEqual(historyPaths,parent.paths);assert.equal(historyPaths.length,18);for(let i=0;i<18;i++)assert.deepEqual(await json(historyPaths[i]),parent.history[i]);let chain=await loadPendingSavedCreate({manifestPath:paths.failurePath,parent,oldInstallation,read,json});
 const before=await json(paths.beforePath),after=await json(paths.afterPath),reviewed=await json(paths.reviewedChangesPath);assert.notEqual(paths.beforePath,paths.afterPath);
 installation??=await currentFamilyInstallation(repo,oldInstallation.composer,oldInstallation.stage);assert.match(paths.expectedSourceHead,/^[a-f0-9]{40}$/);assert.equal(installation.source.head,paths.expectedSourceHead);
 await assertGitModes(repo,oldInstallation.source.head,installation.source.head,reviewed);
 const recovered=await loadSavedCreateRestart({recoveryPath:paths.recoveryPath,chain,installation,read,json});chain={...chain,pending:recovered.pending};const proof=sourceSavedCreateProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath,recovery:recovered.recovery});
 return{hashes,chain,oldInstallation,installation,before,after,proof,recovered,originalDescriptor,supplementDescriptor,parentDescriptor,successorDescriptor,createDescriptor};
}
export async function loadFamilySavedCreateHandoff({descriptor,createDescriptor,successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={},read=p=>{assert(p.startsWith('/'));return readExpectedBytes(p,hashes,bytes);},json=async p=>JSON.parse(await read(p));const freezeBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(freezeBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(freezeBytes);for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);
 const proof=await json(descriptor.proofPath);assert.equal(proof.kind,'family-saved-create-handoff');assert.equal(proof.boundary,19);assert.equal(proof.parentBoundary,18);assert(Object.hasOwn(frozen,descriptor.proofPath));
 const loaded=await readSourceSavedCreateInputs({inputsPath:proof.inputsPath,repo,installation,bytes:read});assert.deepEqual(proof,loaded.proof);assert.deepEqual(createDescriptor,loaded.createDescriptor);assert.deepEqual(successorDescriptor,loaded.successorDescriptor);assert.deepEqual(parentDescriptor,loaded.parentDescriptor);assert.deepEqual(originalDescriptor,loaded.originalDescriptor);assert.deepEqual(supplementDescriptor,loaded.supplementDescriptor);
 for(const[p,h]of Object.entries(loaded.hashes))assert.equal(frozen[p],h,'Unfrozen successor dependency');const provenancePath=join(dirname(descriptor.proofPath),'provenance.json');assert(Object.hasOwn(frozen,provenancePath));assert.deepEqual(await json(provenancePath),loaded.installation);
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return{...loaded.chain,savedCreateHandoff:{status:'FAMILY_SAVED_CREATE_VERIFIED',boundary:19,parentBoundary:18,pendingIndex:18,descriptor,parentDescriptor:createDescriptor,source:proof.source,composer:proof.composer,stage:proof.stage,snapshot:loaded.after,history:[...loaded.chain.history,loaded.recovered.recovery],hashes}};
}
