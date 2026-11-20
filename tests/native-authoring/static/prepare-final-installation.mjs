import {loadClosedHeaderCycle} from './closed-header-cycle.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname,basename,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {repoRoot} from '../families/config.mjs';
import {sourceIdentity} from '../header/provenance.mjs';
import {assertInstalledPin} from '../families/runtime-preflight.mjs';
import {inputHash,assertInputsUnchanged} from '../families/frozen-inputs.mjs';
import {assertInstalledIdentities} from '../families/installed-identity.mjs';
import {installationIdentityPaths,assertInstallationOnly,loadFinalInstallationBridge,resolveInstalledPublicIdentities} from './final-installation-bridge.mjs';
import {loadRetained} from './retained.mjs';
export function parsePreparationArgs(argv){
 const required=new Set(['--composer','--stage','--chain','--before','--after','--artifacts']),allowed=new Set([...required,'--header-cycle']),flags={};
 for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];assert(allowed.has(key)&&!Object.hasOwn(flags,key),'Unknown or duplicate preparation flag');assert(value&&!value.startsWith('--'));flags[key]=value;}
 for(const key of required)assert(flags[key],`Missing ${key}`);
 assert.match(flags['--composer'],/^[a-f0-9]{40}$/);assert.match(flags['--stage'],/^[a-z][a-z0-9-]{0,63}$/);
 for(const key of ['--chain','--before','--after','--artifacts'])assert(isAbsolute(flags[key]),`${key} must be absolute`);
 assert.notEqual(flags['--before'],flags['--after'],'Distinct before/after capture files required');
 if(flags['--header-cycle'])assert(isAbsolute(flags['--header-cycle']));
 return {...(flags['--header-cycle']?{headerCyclePath:flags['--header-cycle']}:{}),composer:flags['--composer'],stage:flags['--stage'],chainPath:flags['--chain'],beforePath:flags['--before'],afterPath:flags['--after'],artifacts:resolve(flags['--artifacts'])};
}
export function buildFinalInstallationProof({chain,before,after,options,installation,closedHeaderCycle}){
 assert.equal(chain.phasesEvidence.length,15);assert.equal(chain.manifest.proofPaths.length,15);assert(!Object.hasOwn(chain.manifest,'finalInstallationBridge'),'Input must preserve original unbridged fifteen-phase history');
 assert.equal(Boolean(options.headerCyclePath),Boolean(closedHeaderCycle));if(closedHeaderCycle){assert.equal(closedHeaderCycle.status,'CLOSED_HEADER_HREF_CYCLE_VERIFIED');assert.equal(closedHeaderCycle.path,options.headerCyclePath);assert.equal(options.stage,closedHeaderCycle.priorInstallationBridge.stage);}
 assert.deepEqual(before,closedHeaderCycle?closedHeaderCycle.snapshot:chain.snapshot,'Stopped manager capture differs from final accepted original state');
 const get=(value,path)=>path.split('.').reduce((v,k)=>v[k],value);
 const changes=installationIdentityPaths.filter(path=>get(before,path)!==get(after,path)).map(path=>({path,before:get(before,path),after:get(after,path)}));
 assertInstallationOnly(before,after,changes);assertInstalledIdentities(after,installation.identities);
 assert.equal(options.composer,installation.composer);assert.equal(options.stage,installation.stage);
 assert.match(installation.source.head,/^[a-f0-9]{40}$/);
 return {schemaVersion:1,kind:'static-final-installation-only',...(closedHeaderCycle?{closedHeaderCycle:options.headerCyclePath}:{}),beforeCapture:closedHeaderCycle?closedHeaderCycle.afterCapture:chain.manifest.capturePath,afterCapture:options.afterPath,beforeCaptureDigest:before.digest,afterCaptureDigest:after.digest,changes,pinselSha:installation.source.head,composerSha:options.composer,stage:options.stage,identitiesPath:join(options.artifacts,'public-identities.json'),provenancePath:join(options.artifacts,'provenance.json')};
}
/** Evidence writes only. No server, capture, installation, initialization or publication. */
export async function prepareFinalInstallation(options){
 assert.equal(process.versions.node.split('.')[0],'24');process.env.PINSEL_AUTHORING_STAGE=options.stage;
 const resolvedOut=join(await realpath(dirname(options.artifacts)),basename(options.artifacts)),rel=relative(await realpath(repoRoot),resolvedOut);assert(rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel),'Evidence must be outside checkout');
 const source=await sourceIdentity(repoRoot),installed=await assertInstalledPin(repoRoot,options.composer),identities=await resolveInstalledPublicIdentities(repoRoot);
 const installation={source,installed,identities,composer:options.composer,stage:options.stage};
 const chain=await loadRetained(options.chainPath),beforeBytes=await readFile(options.beforePath),afterBytes=await readFile(options.afterPath),before=JSON.parse(beforeBytes),after=JSON.parse(afterBytes);
 const inputHashes={...chain.hashes,[options.beforePath]:inputHash(beforeBytes),[options.afterPath]:inputHash(afterBytes)};
 const cycleBytes=async path=>{assert(path.startsWith('/'));const raw=await readFile(path),hash=inputHash(raw);if(Object.hasOwn(inputHashes,path))assert.equal(inputHashes[path],hash);inputHashes[path]=hash;return raw;};
 const closedHeaderCycle=options.headerCyclePath?await loadClosedHeaderCycle({path:options.headerCyclePath,chainCapture:chain.snapshot,chainCapturePath:chain.manifest.capturePath,bytes:cycleBytes,json:async path=>JSON.parse(await cycleBytes(path)),loadInstallationBridge:loadFinalInstallationBridge}):undefined;
 const proof=buildFinalInstallationProof({chain,before,after,options,installation,closedHeaderCycle});
 const check=async()=>{await assertInputsUnchanged(inputHashes);assert.deepEqual(await sourceIdentity(repoRoot),source);assert.deepEqual(await assertInstalledPin(repoRoot,options.composer),installed);assert.deepEqual(await resolveInstalledPublicIdentities(repoRoot),identities);};
 await check();await mkdir(options.artifacts); // Exclusive evidence attempt; never overwrite an earlier preparation.
 const frozen={...inputHashes},write=async(path,value)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');await writeFile(path,bytes,{flag:'wx',mode:0o444});frozen[path]=inputHash(bytes);};
 await write(proof.identitiesPath,identities);await write(proof.provenancePath,{source,installed,composer:options.composer,stage:options.stage});
 const proofPath=join(options.artifacts,'bridge.json');await write(proofPath,proof);
 await write(join(options.artifacts,'manager-inputs.json'),{kind:'static-final-installation-preparation',chainPath:options.chainPath,beforePath:options.beforePath,afterPath:options.afterPath,inputHashes,qualification:'Evidence-only preparation from supplied stopped public captures. This does not establish current capture freshness, runtime acceptance or migration; run-retained independently captures and verifies the installed workspace.'});
 await check();await assertInputsUnchanged(frozen);
 const freezeManifestPath=join(options.artifacts,'freeze.json'),freezeBytes=Buffer.from(JSON.stringify(frozen,null,2)+'\n');await writeFile(freezeManifestPath,freezeBytes,{flag:'wx',mode:0o444});
 const descriptor={proofPath,freezeManifestPath,freezeManifestSha256:inputHash(freezeBytes)};
 const intent={...chain.manifest,capturePath:options.afterPath,finalInstallationBridge:descriptor},intentPath=join(options.artifacts,'retained-intent.json');await writeFile(intentPath,JSON.stringify(intent,null,2)+'\n',{flag:'wx',mode:0o444});
 const verified=await loadRetained(intentPath,{installation});await check();await assertInputsUnchanged(verified.hashes);
 return {status:'FINAL_INSTALLATION_EVIDENCE_PREPARED_RUNTIME_NOT_RUN',intentPath,...descriptor,beforeDigest:before.digest,afterDigest:after.digest,originalPhases:verified.phasesEvidence.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareFinalInstallation(parsePreparationArgs(process.argv.slice(2))),null,2));
