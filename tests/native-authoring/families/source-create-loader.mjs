import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {readExpectedBytes,inputHash,mergeExpectedHashes} from './expected-hashes.mjs';
import {assertGitModes} from './source-rebind-loader.mjs';
import {loadFamilySourceSuccessor} from './source-successor-loader.mjs';
import {assertHistoricalFamilySource} from './installation-supplement-loader.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
import {sourceCreateProof} from './source-create-core.mjs';
import {loadCreateHistory,auditFailedCreate} from './source-create-history.mjs';
import {assertSuccessorProvenance} from './source-successor-history.mjs';
export async function loadCreateFailure({manifestPath,chain,oldInstallation,read,json}){
 const paths=await json(manifestPath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','bundleHash','events','extra','log','provenance']);assert(Array.isArray(paths.extra));assert.equal(new Set(paths.extra).size,paths.extra.length);
 const before=await json(paths.before),after=await json(paths.after),bundle=await json(paths.bundle),events=(await read(paths.events)).toString().trim().split('\n').map(JSON.parse),provenance=await json(paths.provenance),log=(await read(paths.log)).toString();
 assert.equal((await json(paths.bundleHash)).sha256,inputHash(await read(paths.bundle)));for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);
 assertSuccessorProvenance(provenance,bundle,before,oldInstallation);const result=auditFailedCreate({before,after,bundle,events,log,chain});for(const p of paths.extra)await read(p);return result;
}
/** Historical boundary17 is verified at its original Git source, never rebound implicitly. */
export async function loadHistoricalSuccessor({successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json}){
 const proof=await json(successorDescriptor.proofPath);assert.equal(proof.kind,'family-source-rebind-successor');assert.equal(proof.boundary,17);
 const oldInstallation=await json(join(dirname(successorDescriptor.proofPath),'provenance.json'));assert.equal(oldInstallation.source.head,proof.source);await assertHistoricalFamilySource(repo,oldInstallation);
 const parent=await loadFamilySourceSuccessor({descriptor:successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation:oldInstallation,bytes:read});return{parent,oldInstallation};
}
export async function readSourceCreateInputs({inputsPath,repo,installation,bytes=readFile}){
 const hashes={},read=p=>{assert(p.startsWith('/'));return readExpectedBytes(p,hashes,bytes);},json=async p=>JSON.parse(await read(p));
 const paths=await json(inputsPath);assert.deepEqual(Object.keys(paths).sort(),['afterPath','beforePath','expectedSourceHead','failurePath','historyPath','originalDescriptorPath','parentDescriptorPath','reviewedChangesPath','successorDescriptorPath','supplementDescriptorPath']);
 const originalDescriptor=await json(paths.originalDescriptorPath),supplementDescriptor=await json(paths.supplementDescriptorPath),parentDescriptor=await json(paths.parentDescriptorPath),successorDescriptor=await json(paths.successorDescriptorPath);
 const {parent,oldInstallation}=await loadHistoricalSuccessor({successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json});mergeExpectedHashes(hashes,parent.successor.hashes);
 const chain=await loadCreateHistory({historyPath:paths.historyPath,read,json,parent,oldInstallation});const failure=await loadCreateFailure({manifestPath:paths.failurePath,chain,oldInstallation,read,json});
 const before=await json(paths.beforePath),after=await json(paths.afterPath),reviewed=await json(paths.reviewedChangesPath);assert.notEqual(paths.beforePath,paths.afterPath);
 installation??=await currentFamilyInstallation(repo,oldInstallation.composer,oldInstallation.stage);assert.match(paths.expectedSourceHead,/^[a-f0-9]{40}$/);assert.equal(installation.source.head,paths.expectedSourceHead);
 await assertGitModes(repo,oldInstallation.source.head,installation.source.head,reviewed);
 const proof=sourceCreateProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath});
 return{hashes,chain,oldInstallation,installation,before,after,proof,failure,originalDescriptor,supplementDescriptor,parentDescriptor,successorDescriptor};
}
export async function loadFamilySourceCreateHandoff({descriptor,successorDescriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={},read=p=>{assert(p.startsWith('/'));return readExpectedBytes(p,hashes,bytes);},json=async p=>JSON.parse(await read(p));const freezeBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(freezeBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(freezeBytes);for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);
 const proof=await json(descriptor.proofPath);assert.equal(proof.kind,'family-source-create-handoff');assert.equal(proof.boundary,18);assert.equal(proof.parentBoundary,17);assert(Object.hasOwn(frozen,descriptor.proofPath));
 const loaded=await readSourceCreateInputs({inputsPath:proof.inputsPath,repo,installation,bytes:read});assert.deepEqual(proof,loaded.proof);assert.deepEqual(successorDescriptor,loaded.successorDescriptor);assert.deepEqual(parentDescriptor,loaded.parentDescriptor);assert.deepEqual(originalDescriptor,loaded.originalDescriptor);assert.deepEqual(supplementDescriptor,loaded.supplementDescriptor);
 for(const[p,h]of Object.entries(loaded.hashes))assert.equal(frozen[p],h,'Unfrozen successor dependency');const provenancePath=join(dirname(descriptor.proofPath),'provenance.json');assert(Object.hasOwn(frozen,provenancePath));assert.deepEqual(await json(provenancePath),loaded.installation);
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return{...loaded.chain,createHandoff:{status:'FAMILY_SOURCE_CREATE_VERIFIED',boundary:18,parentBoundary:17,descriptor,parentDescriptor:successorDescriptor,source:proof.source,composer:proof.composer,stage:proof.stage,snapshot:loaded.after,history:loaded.chain.history,hashes}};
}
