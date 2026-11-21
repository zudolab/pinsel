import {test} from 'vitest';
import assert from 'node:assert/strict';
import {familyInstallationProof,assertFamilyBridgeBoundary} from './installation-bridge.mjs';
import {assertInstallEvidence,familyConsumers,auditHistoricalWrite} from './installation-history.mjs';
import {parseFamilyInstallationArgs} from './prepare-installation.mjs';
const sha='a'.repeat(40),sha2='b'.repeat(40),digest='c'.repeat(64);
function fixture(){
 const before={digest:'old',schemaVersion:1,workspaceId:'pinsel',project:{saved:true},tokens:{content:14,compositions:1},assets:['asset'],publicFiles:['css'],componentPack:{digest:'pack-old',compiler:'compiler-old',manifestDigest:'manifest',packId:'pinsel'},renderer:{digest:'renderer-old',id:'pinsel-zfb'},unknown:{retained:true}};
 const after=structuredClone(before);after.digest='new';after.componentPack.digest='pack-new';after.componentPack.compiler='compiler-new';after.renderer.digest='renderer-new';
 const {manifestDigest,...packIdentity}=after.componentPack;
 const installed={installedLockSha256:digest,installedRoots:familyConsumers.map(consumer=>({consumer,installedRoot:'/root/node_modules/.pnpm/zudo-composer@sha',packageManifestSha256:digest}))};
 const installation={source:{head:sha2,hashes:{x:digest}},composer:sha2,stage:'notes-v1',installed,identities:{packIdentity,renderer:after.renderer}};
 const history=Array.from({length:12},(_,i)=>({index:i,afterDigest:i===11?'old':String(i),afterCapture:'/old/'+i}));
 const chain={history,snapshot:structuredClone(before),originalComposer:sha,stage:'notes-v1',evidence:history.map(x=>({proofPath:'/proof/'+x.index}))};
 return{chain,before,after,installation,historyPath:'/history',configPath:'/config',afterPath:'/after',artifacts:'/artifacts'};
}
test('family bridge records identity-only change and keeps original package separate',()=>{const f=fixture(),p=familyInstallationProof(f);assert.equal(p.boundary,12);assert.equal(p.originalComposer,sha);assert.equal(p.composer,sha2);assert.equal(p.changes.length,4);assert.deepEqual(p.originalEvidence,f.chain.evidence);});
test('bridge refuses saved records, timestamps, assets, tokens, manifest, unknown fields and missing installs',()=>{
 for(const alter of [f=>f.after.project.saved=false,f=>f.after.tokens.content++,f=>f.after.assets.push('extra'),f=>f.after.publicFiles.push('extra'),f=>f.after.unknown.retained=false,f=>f.after.schemaVersion++,f=>f.after.componentPack.manifestDigest='changed',f=>f.before.digest='wrong',f=>f.installation.installed.installedRoots.pop(),f=>f.installation.composer=sha,f=>f.installation.stage='other',f=>f.after.renderer.id='other']){const f=fixture();alter(f);assert.throws(()=>familyInstallationProof(f));}
});
test('exact prefix boundary allows changed digest once and never rewrites history',()=>{
 const f=fixture(),history=structuredClone(f.chain.history),b={status:'FAMILY_INSTALLATION_BRIDGE_VERIFIED',boundary:12,beforeDigest:'old',afterDigest:'new',beforeCapture:'/old/11',originalHistory:f.chain.history};assertFamilyBridgeBoundary(b,history,f.after);history.push({beforeDigest:'new',afterDigest:'later'});assertFamilyBridgeBoundary(b,history,{digest:'later'});assert.deepEqual(f.chain.history,f.chain.history);history[2].index=999;assert.throws(()=>assertFamilyBridgeBoundary(b,history,f.after));
});
test('boundary cannot skip prefix, reuse old digest or drift first resumed input',()=>{
 const f=fixture(),b={status:'FAMILY_INSTALLATION_BRIDGE_VERIFIED',boundary:12,beforeDigest:'old',afterDigest:'new',beforeCapture:'/old/11',originalHistory:f.chain.history};assert.throws(()=>assertFamilyBridgeBoundary(b,f.chain.history.slice(1),f.after));assert.throws(()=>assertFamilyBridgeBoundary(b,f.chain.history,f.before));assert.throws(()=>assertFamilyBridgeBoundary(b,[...f.chain.history,{beforeDigest:'wrong'}],f.after));
});
test('installations require exact consumers and immutable manifest hashes',()=>{const f=fixture();assertInstallEvidence(f.installation.installed);f.installation.installed.installedRoots[3]=f.installation.installed.installedRoots[0];assert.throws(()=>assertInstallEvidence(f.installation.installed));});
test('preparation rejects incomplete flags, relative evidence, duplicate arguments',()=>{assert.throws(()=>parseFamilyInstallationArgs([]));assert.throws(()=>parseFamilyInstallationArgs(['--history','/x','--history','/y']));});
test('historical phase with unresolved failure never becomes accepted through bridge',()=>{assert.throws(()=>auditHistoricalWrite({},{},{intent:{}},[{phase:'held'}]),/unresolved/);});
