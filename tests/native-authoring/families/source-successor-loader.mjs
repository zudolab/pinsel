import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {createExpectedReader,inputHash,mergeExpectedHashes} from './expected-hashes.mjs';
import {loadFamilySourceRebind,assertGitModes} from './source-rebind-loader.mjs';
import {assertHistoricalFamilySource} from './installation-supplement-loader.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
import {sourceSuccessorProof} from './source-successor-core.mjs';
import {loadSuccessorHistory,auditFailedDuplicate,assertSuccessorProvenance} from './source-successor-history.mjs';
export async function loadSuccessorFailure({manifestPath,chain,oldInstallation,read,json}){
 const paths=await json(manifestPath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','bundleHash','events','extra','log','provenance']);assert(Array.isArray(paths.extra));assert.equal(new Set(paths.extra).size,paths.extra.length);
 const before=await json(paths.before),after=await json(paths.after),bundle=await json(paths.bundle),events=(await read(paths.events)).toString().trim().split('\n').map(JSON.parse),provenance=await json(paths.provenance),log=(await read(paths.log)).toString();
 assert.equal((await json(paths.bundleHash)).sha256,inputHash(await read(paths.bundle)));for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);
 assertSuccessorProvenance(provenance,bundle,before,oldInstallation);const result=auditFailedDuplicate({before,after,bundle,events,log,chain});for(const p of paths.extra)await read(p);return result;
}
/** Historical boundary16 is explicitly verified at7b, never at the successor checkout. */
export async function loadHistoricalSourceRebind({parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json}){
 const proof=await json(parentDescriptor.proofPath);assert.equal(proof.kind,'family-source-rebind');assert.equal(proof.boundary,16);
 const oldInstallation=await json(join(dirname(parentDescriptor.proofPath),'provenance.json'));assert.equal(oldInstallation.source.head,proof.source);await assertHistoricalFamilySource(repo,oldInstallation);
 const parent=await loadFamilySourceRebind({descriptor:parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation:oldInstallation,bytes:read});return{parent,oldInstallation};
}
export async function readSourceSuccessorInputs({inputsPath,repo,installation,bytes=readFile}){
 const hashes={},read=createExpectedReader(hashes,bytes,{absolute:true}),json=async p=>JSON.parse(await read(p));
 const paths=await json(inputsPath);assert.deepEqual(Object.keys(paths).sort(),['afterPath','beforePath','expectedSourceHead','failurePath','historyPath','originalDescriptorPath','parentDescriptorPath','reviewedChangesPath','supplementDescriptorPath']);
 const originalDescriptor=await json(paths.originalDescriptorPath),supplementDescriptor=await json(paths.supplementDescriptorPath),parentDescriptor=await json(paths.parentDescriptorPath);
 const {parent,oldInstallation}=await loadHistoricalSourceRebind({parentDescriptor,originalDescriptor,supplementDescriptor,repo,read,json});mergeExpectedHashes(hashes,parent.rebind.hashes);
 const chain=await loadSuccessorHistory({historyPath:paths.historyPath,read,json,parent,oldInstallation});const failure=await loadSuccessorFailure({manifestPath:paths.failurePath,chain,oldInstallation,read,json});
 const before=await json(paths.beforePath),after=await json(paths.afterPath),reviewed=await json(paths.reviewedChangesPath);assert.notEqual(paths.beforePath,paths.afterPath);
 installation??=await currentFamilyInstallation(repo,oldInstallation.composer,oldInstallation.stage);assert.match(paths.expectedSourceHead,/^[a-f0-9]{40}$/);assert.equal(installation.source.head,paths.expectedSourceHead);
 await assertGitModes(repo,oldInstallation.source.head,installation.source.head,reviewed);
 const proof=sourceSuccessorProof({chain,before,after,oldInstallation,installation,reviewed,inputsPath});
 return{hashes,chain,oldInstallation,installation,before,after,proof,failure,originalDescriptor,supplementDescriptor,parentDescriptor};
}
export async function loadFamilySourceSuccessor({descriptor,parentDescriptor,originalDescriptor,supplementDescriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={},read=createExpectedReader(hashes,bytes,{absolute:true}),json=async p=>JSON.parse(await read(p));const freezeBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(freezeBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(freezeBytes);for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);
 const proof=await json(descriptor.proofPath);assert.equal(proof.kind,'family-source-rebind-successor');assert.equal(proof.boundary,17);assert.equal(proof.parentBoundary,16);assert(Object.hasOwn(frozen,descriptor.proofPath));
 const loaded=await readSourceSuccessorInputs({inputsPath:proof.inputsPath,repo,installation,bytes:read});assert.deepEqual(proof,loaded.proof);assert.deepEqual(parentDescriptor,loaded.parentDescriptor);assert.deepEqual(originalDescriptor,loaded.originalDescriptor);assert.deepEqual(supplementDescriptor,loaded.supplementDescriptor);
 for(const[p,h]of Object.entries(loaded.hashes))assert.equal(frozen[p],h,'Unfrozen successor dependency');const provenancePath=join(dirname(descriptor.proofPath),'provenance.json');assert(Object.hasOwn(frozen,provenancePath));assert.deepEqual(await json(provenancePath),loaded.installation);
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return{...loaded.chain,successor:{status:'FAMILY_SOURCE_SUCCESSOR_VERIFIED',boundary:17,parentBoundary:16,descriptor,parentDescriptor,source:proof.source,composer:proof.composer,stage:proof.stage,snapshot:loaded.after,history:loaded.chain.history,hashes}};
}
