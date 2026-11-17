import {readExpectedBytes} from './expected-hashes.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputHash} from './frozen-inputs.mjs';
import {sourceIdentity} from '../header/provenance.mjs';
import {assertInstalledPin} from './runtime-preflight.mjs';
import {assertInstalledIdentities} from './installed-identity.mjs';
import {assertInstallationOnly,resolveInstalledPublicIdentities,installationIdentityPaths} from '../static/final-installation-bridge.mjs';
import {loadOriginalFamilyHistory,assertFourInstallEvidence} from './installation-history.mjs';
export async function currentFamilyInstallation(repo,composer,stage){
 process.env.PINSEL_AUTHORING_STAGE=stage;
 const source=await sourceIdentity(repo),installed=await assertInstalledPin(repo,composer);assertFourInstallEvidence(installed);
 return {source,installed,identities:await resolveInstalledPublicIdentities(repo),composer,stage};
}
export function familyInstallationProof({chain,before,after,installation,historyPath,configPath,afterPath,artifacts}){
 assert.equal(chain.history.length,12);assert.deepEqual(before,chain.snapshot);assert.notEqual(chain.originalComposer,installation.composer,'Actual new immutable package required');assert.equal(chain.stage,installation.stage);assertFourInstallEvidence(installation.installed);assertInstalledIdentities(after,installation.identities);
 const get=(o,p)=>p.split('.').reduce((v,k)=>v[k],o);const changes=installationIdentityPaths.filter(p=>get(before,p)!==get(after,p)).map(path=>({path,before:get(before,path),after:get(after,path)}));assertInstallationOnly(before,after,changes);
 return {schemaVersion:1,kind:'family-installation-only',boundary:12,historyPath,configPath,beforeCapture:chain.history.at(-1).afterCapture,afterCapture:afterPath,beforeDigest:before.digest,afterDigest:after.digest,changes,originalComposer:chain.originalComposer,composer:installation.composer,stage:installation.stage,source:installation.source.head,identitiesPath:artifacts+'/public-identities.json',provenancePath:artifacts+'/provenance.json',originalEvidence:chain.evidence};
}
export function assertFamilyBridgeBoundary(bridge,history,snapshot){
 assert.equal(bridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(bridge.boundary,12);assert(history.length>=12);assert.equal(history[11].afterDigest,bridge.beforeDigest);assert.equal(history[11].afterCapture,bridge.beforeCapture);
 for(let i=0;i<12;i++)assert.deepEqual(history[i],bridge.originalHistory[i],'Original accepted phase changed');
 if(history.length===12)assert.equal(snapshot.digest,bridge.afterDigest);else assert.equal(history[12].beforeDigest,bridge.afterDigest);
}
/** Independent validation on every preparation/next-intent/runtime. No canonical writes. */
export async function loadFamilyInstallationBridge({descriptor,repo,installation,bytes=readFile}){
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const hashes={};const read=async p=>{assert(p.startsWith('/'));return readExpectedBytes(p,hashes,bytes);};const json=async p=>JSON.parse(await read(p));const frozenBytes=await read(descriptor.freezeManifestPath);assert.equal(inputHash(frozenBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(frozenBytes);
 for(const[p,h]of Object.entries(frozen)){assert.match(h,/^[a-f0-9]{64}$/);assert.equal(inputHash(await read(p)),h,'Frozen family installation evidence changed');}
 const proof=await json(descriptor.proofPath);assert.equal(proof.schemaVersion,1);assert.equal(proof.kind,'family-installation-only');assert.equal(proof.boundary,12);
 const chain=await loadOriginalFamilyHistory({historyPath:proof.historyPath,configPath:proof.configPath,repo,bytes:read});
 for(const[p,h]of Object.entries(chain.hashes)){assert.equal(frozen[p],h,'Original history dependency is not frozen');}
 for(const p of [descriptor.proofPath,proof.beforeCapture,proof.afterCapture,proof.identitiesPath,proof.provenancePath])assert(Object.hasOwn(frozen,p),'Unfrozen bridge dependency');
 const before=await json(proof.beforeCapture),after=await json(proof.afterCapture);assert.deepEqual(before,chain.snapshot);
 const provenance=await json(proof.provenancePath);installation??=await currentFamilyInstallation(repo,proof.composer,proof.stage);assert.deepEqual(provenance,installation,'Installed source/package/public identities changed');assert.deepEqual(await json(proof.identitiesPath),installation.identities);
 assert.deepEqual(proof,familyInstallationProof({chain,before,after,installation,historyPath:proof.historyPath,configPath:proof.configPath,afterPath:proof.afterCapture,artifacts:proof.provenancePath.slice(0,-'/provenance.json'.length)}));
 for(const[p,h]of Object.entries(frozen))assert.equal(inputHash(await read(p)),h);assert.equal(inputHash(await read(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 return {status:'FAMILY_INSTALLATION_BRIDGE_VERIFIED',descriptor,boundary:12,beforeDigest:before.digest,afterDigest:after.digest,beforeCapture:proof.beforeCapture,afterCapture:proof.afterCapture,originalHistory:chain.history,originalEvidence:chain.evidence,originalComposer:chain.originalComposer,composer:proof.composer,stage:proof.stage,source:proof.source,hashes,qualification:'Original phases retain original installation and outcomes; this is identity-only continuity, not a current runtime pass.'};
}
