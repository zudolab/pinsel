import assert from 'node:assert/strict';
import {writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname,basename,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {repoRoot} from './config.mjs';
import {inputHash,readExpectedBytes,retainExpectedHash,mergeExpectedHashes} from './expected-hashes.mjs';
import {assertInputsUnchanged} from './frozen-inputs.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
import {familyInstallationSupplementProof} from './installation-supplement.mjs';
import {loadHistoricalFamilyBridge,loadBindingRestartArtifacts,loadFamilyInstallationSupplement} from './installation-supplement-loader.mjs';
export function parseSupplementArgs(argv){
 const keys=['--original-bridge','--recovery','--failures','--before','--after','--composer','--stage','--artifacts'],out={};for(let i=0;i<argv.length;i+=2){assert(keys.includes(argv[i])&&!Object.hasOwn(out,argv[i]));assert(argv[i+1]&&!argv[i+1].startsWith('--'));out[argv[i]]=argv[i+1];}for(const k of keys)assert(out[k],`Missing ${k}`);assert.match(out['--composer'],/^[a-f0-9]{40}$/);assert.match(out['--stage'],/^[a-z][a-z0-9-]{0,63}$/);for(const k of keys.filter(k=>!['--composer','--stage'].includes(k)))assert(isAbsolute(out[k]));assert.notEqual(out['--before'],out['--after']);return out;
}
/** Evidence-only; manager separately owns stopped captures and immutable installation. */
export async function prepareFamilyInstallationSupplement(o){
 assert.equal(process.versions.node.split('.')[0],'24');const artifacts=resolve(o['--artifacts']),rel=relative(await realpath(repoRoot),join(await realpath(dirname(artifacts)),basename(artifacts)));assert(rel.startsWith('../')||isAbsolute(rel),'Evidence must be outside checkout');
 const hashes={},json=async path=>JSON.parse(await readExpectedBytes(path,hashes));const originalDescriptor=await json(o['--original-bridge']);
 const originalBridge=await loadHistoricalFamilyBridge({descriptor:originalDescriptor,repo:repoRoot});mergeExpectedHashes(hashes,originalBridge.hashes);
 const recoveryEvidence=await loadBindingRestartArtifacts({manifestPath:o['--recovery'],repo:repoRoot});mergeExpectedHashes(hashes,recoveryEvidence.hashes);
 const before=await json(o['--before']),after=await json(o['--after']),failures=await json(o['--failures']);assert(Array.isArray(failures)&&failures.length);assert.equal(new Set(failures).size,failures.length);for(const path of failures){assert(isAbsolute(path));await readExpectedBytes(path,hashes);}
 const installation=await currentFamilyInstallation(repoRoot,o['--composer'],o['--stage']);const proof=familyInstallationSupplementProof({originalBridge,recoveryEvidence,before,after,installation,originalDescriptorPath:o['--original-bridge'],recoveryManifestPath:o['--recovery'],afterPath:o['--after'],artifacts});
 const check=async()=>{await assertInputsUnchanged(hashes);assert.deepEqual(await currentFamilyInstallation(repoRoot,o['--composer'],o['--stage']),installation);};await check();await mkdir(artifacts);
 const write=async(path,value)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');retainExpectedHash(hashes,path,inputHash(b));await writeFile(path,b,{flag:'wx',mode:0o444});};
 await write(proof.identitiesPath,installation.identities);await write(proof.provenancePath,installation);const proofPath=join(artifacts,'bridge.json');await write(proofPath,proof);await write(join(artifacts,'manager-inputs.json'),{options:o,inputHashes:{...hashes},failureEvidence:failures,qualification:'Evidence only; no current runtime pass, install, capture or canonical write.'});await check();
 const freezeManifestPath=join(artifacts,'freeze.json'),freeze=Buffer.from(JSON.stringify(hashes,null,2)+'\n');await writeFile(freezeManifestPath,freeze,{flag:'wx',mode:0o444});const descriptor={proofPath,freezeManifestPath,freezeManifestSha256:inputHash(freeze)};
 await loadFamilyInstallationSupplement({originalDescriptor,descriptor,repo:repoRoot,installation});await check();const descriptorPath=join(artifacts,'descriptor.json');await writeFile(descriptorPath,JSON.stringify(descriptor,null,2)+'\n',{flag:'wx',mode:0o444});return{status:'FAMILY_SUPPLEMENT_EVIDENCE_PREPARED_RUNTIME_NOT_RUN',descriptorPath,beforeDigest:before.digest,afterDigest:after.digest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareFamilyInstallationSupplement(parseSupplementArgs(process.argv.slice(2))),null,2));
