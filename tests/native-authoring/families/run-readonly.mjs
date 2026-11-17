import {validateSavedMapping,mappingRecoverySequenceProof} from './mapping-recovery.mjs';
import {validateSavedReference,validateCapturedReference} from '../header/saved-reference.mjs';
import {freezeReadInputs,assertInputsUnchanged,inputHash} from './frozen-inputs.mjs';
import {runtimeProvenance} from './provenance.mjs';
import {parseRuntimeArgs,repoRoot} from './config.mjs';
import assert from'node:assert/strict';import{spawn}from'node:child_process';import{get}from'node:http';import{readFile,writeFile,mkdir,lstat}from'node:fs/promises';import{join}from'node:path';
import{assertInstalledPin,assertFreePort}from'./runtime-preflight.mjs';import{validateReadIntent,validateHeaderRestart}from'./readonly-proof.mjs';
import{sourceIdentity}from'../header/provenance.mjs';
import{assertHeaderArtifactLocation as assertArtifactLocation}from'../header/config.mjs';
const {intentPath,artifacts,port,base,composer,stage}=parseRuntimeArgs(process.argv.slice(2));const repo=repoRoot,portText=String(port);const env={...process.env,PINSEL_AUTHORING_STAGE:stage,EXPECTED_COMPOSER_SHA:composer};assert.equal(process.versions.node.split('.')[0],'24','Use repository Node24');const installed=await assertInstalledPin(repo,composer);
const json=async path=>JSON.parse(await readFile(path,'utf8'));const inputs=await freezeReadInputs(intentPath);const intent=inputs.intent,expected=inputs.snapshot;validateReadIntent(intent,expected);if(intent.kind==='header-restart')validateHeaderRestart(expected,inputs.headerProof);const savedReference=intent.kind==='knowledge-saved-reference'?validateSavedReference(expected,inputs.savedReference):intent.kind==='knowledge-captured-reference'?validateCapturedReference(expected,inputs.savedReference):null;if(savedReference){assert.equal(savedReference.composer,composer,'Recovery must retain original package');assert.equal(savedReference.stage,stage,'Recovery must retain original stage');}const savedMapping=intent.kind==='mapping-saved-create'?validateSavedMapping(expected,inputs.savedReference):null;if(savedMapping){assert.equal(savedMapping.composer,composer);assert.equal(savedMapping.stage,stage);}const source=await sourceIdentity(repo);assert.equal(expected.digest,intent.captureDigest);assert(/^[a-f0-9]{64}$/.test(expected.digest),'Real accepted public capture required');await assertArtifactLocation(artifacts);await mkdir(artifacts);const bundlePath=join(artifacts,'accepted-inputs.json'),bundleBytes=JSON.stringify(inputs),bundleHash=inputHash(bundleBytes);await writeFile(bundlePath,bundleBytes,{flag:'wx'});await assertInputsUnchanged(inputs.hashes);await writeFile(join(artifacts,'runtime-provenance.json'),JSON.stringify(await runtimeProvenance({repo,installed,composer,stage,port,intentPath,capturePath:intent.capturePath,digest:expected.digest}),null,2),{flag:'wx'}); // Exclusive attempt, including preflight failure.
const command=args=>new Promise((resolve,reject)=>{const child=spawn(args[0],args.slice(1),{cwd:repo,env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Command exited ${code}`)));});const capture=path=>command(['corepack','pnpm','--filter','@pinsel/content','authoring:capture','--',path]);
await capture(join(artifacts,'before.json'));const before=await json(join(artifacts,'before.json'));assert.deepEqual(before,expected,'Reviewed public state changed');await assertFreePort(port);
let logs='',failure;const server=spawn('corepack',['pnpm','dev','--port',portText,'--strict-port'],{cwd:repo,env,stdio:['ignore','pipe','pipe'],detached:true});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);const closed=new Promise(resolve=>server.once('exit',resolve));
const probe=()=>new Promise(resolve=>{const req=get(`${base}/composer?native=1`,{headers:{Accept:'text/html'},timeout:2000},res=>{res.resume();resolve(res.statusCode===200);});req.on('error',()=>resolve(false));req.on('timeout',()=>{req.destroy();resolve(false);});});
try{let ready=false;for(let i=0;i<180;i++){if(await probe()){ready=true;break;}assert(server.exitCode===null&&server.signalCode===null);await new Promise(r=>setTimeout(r,1000));}assert(ready);await command([process.execPath,new URL('./readonly-browser.mjs',import.meta.url).pathname,bundlePath,bundleHash,artifacts,base]);}catch(error){failure=error;}finally{try{process.kill(-server.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}let timer;const stopped=await Promise.race([closed.then(()=>true),new Promise(r=>timer=setTimeout(()=>r(false),15000))]);clearTimeout(timer);assert(stopped,'Owned server did not stop');await writeFile(join(artifacts,'server.log'),logs,{flag:'wx'});}
let free=false;for(let i=0;i<30;i++){try{await assertFreePort(port);free=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}assert(free);await capture(join(artifacts,'after.json'));if(failure)throw failure;
const after=await json(join(artifacts,'after.json'));
assert.deepEqual(after,before,'Read-only restart changed public capture');
assert.deepEqual(await sourceIdentity(repo),source,'Source changed during read-only verification');
await assertInputsUnchanged(inputs.hashes);assert.equal(inputHash(await readFile(bundlePath)),bundleHash,'Captured inputs changed');
const {result}=await json(join(artifacts,'ui-result.json'));
let recoveredBuild;
if(savedReference){
 assert.deepEqual(result.savedWrite,savedReference);
 const {compile,verifyExactBuild,assertDestination,verifyDestinationHtml}=await import('../header/compile.mjs');
 const {verifyStaticKnowledge}=await import('../header/static-proof.mjs');
 const {referencedNote}=await import('../header/owner.mjs');
 process.env.PINSEL_AUTHORING_STAGE=stage;
 const compiled=await compile(after),root=join(repo,'packages/pinsel-content/.native-builds',after.digest);
 let exists=false;try{const stat=await lstat(root);assert(stat.isDirectory()&&!stat.isSymbolicLink(),'Existing build must be a real directory');exists=true;}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!exists)await command(['corepack','pnpm','--filter','@pinsel/content','authoring:build','--',join(artifacts,'after.json')]);
 const build=await verifyExactBuild(after,root,compiled),rendered=await verifyStaticKnowledge(after,savedReference.result.record,root,savedReference.intent.value);
 const destination=assertDestination(compiled,savedReference.intent),note=referencedNote(after,savedReference.intent.value);
 const target=await verifyDestinationHtml(root,destination,{h1:note.values['note-title']});
 await capture(join(artifacts,'after-build.json'));assert.deepEqual(await json(join(artifacts,'after-build.json')),after,'Recovery build changed saved authoring');
 assert.deepEqual(await sourceIdentity(repo),source);await assertInputsUnchanged(inputs.hashes);assert.equal(inputHash(await readFile(bundlePath)),bundleHash);
 recoveredBuild={build,rendered,target,reusedExistingBuild:exists,afterBuildCapture:join(artifacts,'after-build.json')};
}

const restart={status:'READ_ONLY_RESTART_VERIFIED',source,inputHashes:inputs.hashes,bundleHash,beforeDigest:before.digest,afterDigest:after.digest,afterCapture:join(artifacts,'after.json'),intent,result};await writeFile(join(artifacts,'proof.json'),JSON.stringify(restart,null,2),{flag:'wx'});
if(savedReference)await writeFile(join(artifacts,intent.kind==='knowledge-captured-reference'?'captured-reference-proof.json':'recovery-proof.json'),JSON.stringify({status:intent.kind==='knowledge-captured-reference'?'CAPTURED_REFERENCE_VERIFIED':'SAVED_REFERENCE_RECOVERY_VERIFIED',originalScenario:savedReference.originalScenario,savedWrite:savedReference,restart,restartProof:join(artifacts,'proof.json'),source,composer,captureDigest:after.digest,...recoveredBuild},null,2),{flag:'wx'});
if(intent.kind==='active-identity')await writeFile(join(artifacts,'active-identity.json'),JSON.stringify(result.active,null,2),{flag:'wx'});

if(savedMapping)await writeFile(join(artifacts,'recovery-sequence-proof.json'),JSON.stringify(mappingRecoverySequenceProof(savedMapping,restart),null,2),{flag:'wx'});
