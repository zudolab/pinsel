import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {inputHash} from '../families/frozen-inputs.mjs';
import {assertInstalledIdentities} from '../families/installed-identity.mjs';
export const installationIdentityPaths=['digest','componentPack.digest','componentPack.compiler','renderer.digest'];
export function assertInstallationOnly(before,after,changes){
 const expected=structuredClone(before),actual=[];
 for(const path of installationIdentityPaths){const parts=path.split('.'),key=parts.pop(),a=parts.reduce((v,k)=>v[k],expected),b=parts.reduce((v,k)=>v[k],after);assert(Object.hasOwn(a,key)&&Object.hasOwn(b,key),`Missing identity ${path}`);assert.equal(typeof a[key],'string');assert.equal(typeof b[key],'string');if(a[key]!==b[key]){actual.push({path,before:a[key],after:b[key]});a[key]=b[key];}}
 assert.deepEqual(after,expected,'Installation bridge changed non-identity state, schema or unknown fields');
 assert(actual.some(x=>x.path!=='digest'),'Bridge must witness an installed identity change');
 assert(Array.isArray(changes));assert.deepEqual([...changes].sort((a,b)=>a.path.localeCompare(b.path)),actual.sort((a,b)=>a.path.localeCompare(b.path)),'Bridge change inventory must be exact');return actual;
}
export async function resolveInstalledPublicIdentities(repo){
 const require=createRequire(join(repo,'packages/pinsel-content/package.json'));
 const {loadHostContext}=await import(pathToFileURL(require.resolve('zudo-composer/vite')).href);
 const {resolveAuthoringPackIdentity,resolveAuthoringRendererIdentity}=await import(pathToFileURL(require.resolve('zudo-composer/authoring')).href);
 const host=await loadHostContext({workspaceRoot:join(repo,'packages/pinsel-content')});
 return {packIdentity:await resolveAuthoringPackIdentity(host),renderer:await resolveAuthoringRendererIdentity(host)};
}
/** Consume a separately reviewed, frozen installation witness; never rewrite phase history. */
export async function loadFinalInstallationBridge({descriptor,chainCapture,chainCapturePath,snapshot,capturePath,installation,bytes,json}){
 assert(installation,'Current installed source/package/public identities required for final bridge');
 assert.deepEqual(Object.keys(descriptor).sort(),['freezeManifestPath','freezeManifestSha256','proofPath']);
 assert.match(descriptor.freezeManifestSha256,/^[a-f0-9]{64}$/);
 const freezeBytes=await bytes(descriptor.freezeManifestPath);assert.equal(inputHash(freezeBytes),descriptor.freezeManifestSha256);const frozen=JSON.parse(freezeBytes);assert(frozen&&typeof frozen==='object'&&!Array.isArray(frozen));
 for(const [path,hash]of Object.entries(frozen)){assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(inputHash(await bytes(path)),hash,`Frozen bridge input changed: ${path}`);}
 const proof=await json(descriptor.proofPath);assert.equal(proof.schemaVersion,1);assert.equal(proof.kind,'static-final-installation-only');
 assert.deepEqual(Object.keys(proof).sort(),['afterCapture','afterCaptureDigest','beforeCapture','beforeCaptureDigest','changes','composerSha','identitiesPath','kind','pinselSha','provenancePath','schemaVersion','stage']);
 assert.equal(proof.beforeCapture,chainCapturePath);assert.equal(proof.afterCapture,capturePath);
 for(const path of [descriptor.proofPath,proof.beforeCapture,proof.afterCapture,proof.identitiesPath,proof.provenancePath])assert(Object.hasOwn(frozen,path),`Unfrozen bridge dependency: ${path}`);
 const before=await json(proof.beforeCapture),after=await json(proof.afterCapture);assert.deepEqual(before,chainCapture);assert.deepEqual(after,snapshot);assert.equal(proof.beforeCaptureDigest,before.digest);assert.equal(proof.afterCaptureDigest,after.digest);
 const changes=assertInstallationOnly(before,after,proof.changes);
 assert.match(proof.pinselSha,/^[a-f0-9]{40}$/);assert.match(proof.composerSha,/^[a-f0-9]{40}$/);
 assert.equal(proof.pinselSha,installation.source.head);assert.equal(proof.composerSha,installation.composer);assert.equal(proof.stage,installation.stage);
 const identities=await json(proof.identitiesPath);assert.deepEqual(identities,installation.identities);assertInstalledIdentities(after,identities);
 const provenance=await json(proof.provenancePath);assert.deepEqual(provenance,{source:installation.source,installed:installation.installed,composer:installation.composer,stage:installation.stage});
 // Recheck every sealed byte after dependent reads, before the caller freezes its child bundle.
 for(const [path,hash]of Object.entries(frozen))assert.equal(inputHash(await bytes(path)),hash);assert.equal(inputHash(await bytes(descriptor.freezeManifestPath)),descriptor.freezeManifestSha256);
 assert(isDeepStrictEqual(await json(descriptor.proofPath),proof));
 return {status:'FINAL_INSTALLATION_IDENTITY_BRIDGE_VERIFIED',...descriptor,beforeCapture:proof.beforeCapture,afterCapture:proof.afterCapture,beforeDigest:before.digest,afterDigest:after.digest,changes,source:installation.source,composer:installation.composer,stage:installation.stage,qualification:'Original fifteen-phase evidence remains on its original installation. This bridge proves identity-only preservation; current restart/build acceptance is separate.'};
}
