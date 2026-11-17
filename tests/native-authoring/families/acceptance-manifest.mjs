import {ownedFamilyExpectation} from './owned-render.mjs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {assertMembershipDelta} from './membership.mjs';
import {verifyFamily} from './family-graph.mjs';
/** Creation's complete:true only describes configuration. All three states are mandatory. */
export function familyAcceptanceManifest({kind,family,states}){
 assert.deepEqual(Object.keys(states).sort(),['created','moved','restored']);
 for(const [name,state] of Object.entries(states)){
  const {capture,restartBefore,restartAfter,nativeResult,build,visitor}=state;
  verifyFamily(capture,family,kind,{moved:name==='moved'});
  assert.deepEqual(restartBefore,capture);assert.deepEqual(restartAfter,capture,'Restart must preserve full capture');
  assert.equal(nativeResult.status,'READ_ONLY_RESTART_VERIFIED');assert.equal(nativeResult.beforeDigest,capture.digest);assert.equal(nativeResult.afterDigest,capture.digest);assert.equal(nativeResult.intent.captureDigest,capture.digest);assert.equal(nativeResult.intent.marker,family.marker);assert.equal(nativeResult.intent.childText,family.childText);assert.equal(nativeResult.result.kind,'family-render');assert.equal(nativeResult.result.family,kind);assert.equal(nativeResult.result.present,name!=='moved');
  assert.equal(build.snapshotDigest,capture.digest);assert.equal(build.workspaceId,capture.workspaceId);assert.deepEqual(build.componentPack,capture.componentPack);assert.deepEqual(build.renderer,capture.renderer);
  assert.equal(visitor.status,'PASS');assert.equal(visitor.captureDigest,capture.digest);assert.equal(visitor.kind,kind);assert.equal(visitor.moved,name==='moved');assert.deepEqual(visitor.componentPack,capture.componentPack);assert.deepEqual(visitor.renderer,capture.renderer);assert(Object.keys(visitor.artifactFiles).length>0);assert.deepEqual(visitor.expected,ownedFamilyExpectation(capture,{kind,marker:family.marker,family}));assert.deepEqual(visitor.checks,['toc-hash','owned-fields','faq-disclosure-or-result-row','loaded-css','loaded-images','no-request-errors']);assert.equal(visitor.artifactFiles['build-evidence.json'],state.buildFileHash);assert(/^[a-f0-9]{64}$/.test(state.buildFileHash));
 }
 assertMembershipDelta(states.created.capture,states.moved.capture,family,kind);
 assertMembershipDelta(states.moved.capture,states.restored.capture,family,kind,{inverse:true});
 return {status:'PASS',scope:'family-created-moved-restored-membership',kind,creationOnly:false,orderAcceptance:'NOT_RUN_SEPARATE_TWO_CHILD_RECIPE',states:Object.fromEntries(Object.entries(states).map(([name,s])=>[name,{captureDigest:s.capture.digest,contentToken:s.capture.tokens.content,artifactFiles:s.visitor.artifactFiles}]))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const[input,out]=process.argv.slice(2);const read=async p=>JSON.parse(await readFile(p,'utf8'));const paths=await read(input),states={};for(const[name,files]of Object.entries(paths.states)){states[name]={};for(const[key,path]of Object.entries(files))states[name][key]=await read(path);if(key==='build')states[name].buildFileHash=createHash('sha256').update(await readFile(path)).digest('hex');}const result=familyAcceptanceManifest({kind:paths.kind,family:await read(paths.family),states});await writeFile(out,JSON.stringify({...result,evidencePaths:paths},null,2),{flag:'wx'});}
