import assert from 'node:assert/strict';
import {mkdir,writeFile,realpath} from 'node:fs/promises';
import {resolve,dirname,basename,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {repoRoot} from './config.mjs';
import {readSourceSuccessorInputs,loadFamilySourceSuccessor} from './source-successor-loader.mjs';
import {inputHash,retainExpectedHash} from './expected-hashes.mjs';
import {assertInputsUnchanged} from './frozen-inputs.mjs';
import {currentFamilyInstallation} from './installation-bridge.mjs';
export function parseSourceSuccessorArgs(args){
 assert.equal(args.length,4,'Usage: --inputs ABSOLUTE_JSON --artifacts NEW_ABSOLUTE_DIRECTORY');const out={};for(let i=0;i<args.length;i+=2){assert(['--inputs','--artifacts'].includes(args[i]));assert(!Object.hasOwn(out,args[i]));assert(isAbsolute(args[i+1]));out[args[i]]=args[i+1];}return out;
}
export async function prepareSourceSuccessor(options){
 assert.equal(process.versions.node.split('.')[0],'24');
 const artifacts=resolve(options['--artifacts']),rel=relative(await realpath(repoRoot),join(await realpath(dirname(artifacts)),basename(artifacts)));assert(rel.startsWith('../')||isAbsolute(rel),'Evidence outside checkout required');
 const loaded=await readSourceSuccessorInputs({inputsPath:options['--inputs'],repo:repoRoot}),hashes=loaded.hashes;
 const check=async()=>{await assertInputsUnchanged(hashes);assert.deepEqual(await currentFamilyInstallation(repoRoot,loaded.installation.composer,loaded.installation.stage),loaded.installation);};await check();await mkdir(artifacts);
 const write=async(path,value)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');retainExpectedHash(hashes,path,inputHash(b));await writeFile(path,b,{flag:'wx',mode:0o444});};
 const proofPath=join(artifacts,'bridge.json');await write(proofPath,loaded.proof);await write(join(artifacts,'provenance.json'),loaded.installation);await check();
 const freezeManifestPath=join(artifacts,'freeze.json'),freeze=Buffer.from(JSON.stringify(hashes,null,2)+'\n');await writeFile(freezeManifestPath,freeze,{flag:'wx',mode:0o444});const descriptor={proofPath,freezeManifestPath,freezeManifestSha256:inputHash(freeze)};
 await loadFamilySourceSuccessor({descriptor,parentDescriptor:loaded.parentDescriptor,originalDescriptor:loaded.originalDescriptor,supplementDescriptor:loaded.supplementDescriptor,repo:repoRoot,installation:loaded.installation});await check();const descriptorPath=join(artifacts,'descriptor.json');await writeFile(descriptorPath,JSON.stringify(descriptor,null,2)+'\n',{flag:'wx',mode:0o444});return{status:'FAMILY_SOURCE_SUCCESSOR_PREPARED_RUNTIME_NOT_RUN',descriptorPath,digest:loaded.after.digest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareSourceSuccessor(parseSourceSuccessorArgs(process.argv.slice(2))),null,2));
