import {readExpectedBytes,retainExpectedHash} from './expected-hashes.mjs';
import assert from 'node:assert/strict';
import {writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname,basename,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {repoRoot} from './config.mjs';
import {inputHash,assertInputsUnchanged} from './frozen-inputs.mjs';
import {loadOriginalFamilyHistory} from './installation-history.mjs';
import {currentFamilyInstallation,familyInstallationProof,loadFamilyInstallationBridge} from './installation-bridge.mjs';
export function parseFamilyInstallationArgs(argv){
 const keys=['--history','--config','--failures','--before','--after','--composer','--stage','--artifacts'],out={};
 for(let i=0;i<argv.length;i+=2){assert(keys.includes(argv[i])&&!Object.hasOwn(out,argv[i]));assert(argv[i+1]&&!argv[i+1].startsWith('--'));out[argv[i]]=argv[i+1];}for(const k of keys)assert(out[k],`Missing ${k}`);
 assert.match(out['--composer'],/^[a-f0-9]{40}$/);assert.match(out['--stage'],/^[a-z][a-z0-9-]{0,63}$/);for(const k of keys.filter(k=>!['--composer','--stage'].includes(k)))assert(isAbsolute(out[k]));assert.notEqual(out['--before'],out['--after']);return out;
}
export async function prepareFamilyInstallation(o){
 assert.equal(process.versions.node.split('.')[0],'24');const artifacts=resolve(o['--artifacts']);const rel=relative(await realpath(repoRoot),join(await realpath(dirname(artifacts)),basename(artifacts)));assert(rel.startsWith('../')||isAbsolute(rel),'Evidence must be outside checkout');
 const installation=await currentFamilyInstallation(repoRoot,o['--composer'],o['--stage']);const chain=await loadOriginalFamilyHistory({historyPath:o['--history'],configPath:o['--config'],repo:repoRoot});
 const hashes={...chain.hashes};const json=async p=>{const b=await readExpectedBytes(p,hashes);return JSON.parse(b);};const before=await json(o['--before']),after=await json(o['--after']),failures=await json(o['--failures']);assert(Array.isArray(failures)&&failures.length);assert.equal(new Set(failures).size,failures.length);for(const p of failures){assert(isAbsolute(p));await readExpectedBytes(p,hashes);}
 const proof=familyInstallationProof({chain,before,after,installation,historyPath:o['--history'],configPath:o['--config'],afterPath:o['--after'],artifacts});await assertInputsUnchanged(hashes);assert.deepEqual(await currentFamilyInstallation(repoRoot,o['--composer'],o['--stage']),installation);
 await mkdir(artifacts);const write=async(p,value)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');retainExpectedHash(hashes,p,inputHash(b));await writeFile(p,b,{flag:'wx',mode:0o444});};
 await write(proof.identitiesPath,installation.identities);await write(proof.provenancePath,installation);const proofPath=join(artifacts,'bridge.json');await write(proofPath,proof);await write(join(artifacts,'manager-inputs.json'),{options:o,inputHashes:{...hashes},failureEvidence:failures,qualification:'Evidence preparation only. No install, capture, server, canonical write or new runtime pass.'});await assertInputsUnchanged(hashes);
 const freezeManifestPath=join(artifacts,'freeze.json'),freeze=Buffer.from(JSON.stringify(hashes,null,2)+'\n');await writeFile(freezeManifestPath,freeze,{flag:'wx',mode:0o444});const descriptor={proofPath,freezeManifestPath,freezeManifestSha256:inputHash(freeze)};await writeFile(join(artifacts,'descriptor.json'),JSON.stringify(descriptor,null,2)+'\n',{flag:'wx',mode:0o444});await loadFamilyInstallationBridge({descriptor,repo:repoRoot,installation});return {status:'FAMILY_INSTALLATION_EVIDENCE_PREPARED_RUNTIME_NOT_RUN',descriptorPath:join(artifacts,'descriptor.json'),beforeDigest:before.digest,afterDigest:after.digest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareFamilyInstallation(parseFamilyInstallationArgs(process.argv.slice(2))),null,2));
