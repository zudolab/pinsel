import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertReviewedHarnessDelta,sourceRebindProof} from './source-rebind-core.mjs';
import {parseSourceRebindArgs} from './prepare-source-rebind.mjs';
import {loadFamilySourceRebind} from './source-rebind-loader.mjs';
import {inputHash} from './expected-hashes.mjs';
const h='a'.repeat(64),other='b'.repeat(64),oldHead='a'.repeat(40),newHead='b'.repeat(40),composer='c5ffd410f74ba4b3aa003da068efeeae6e663c37';
function fixture(){
 const oldInstallation={source:{head:oldHead,hashes:{'package.json':h,'runtime.ts':h,'tests/driver.mjs':h}},composer,stage:'notes-v1',installed:{four:'same',lock:h},identities:{pack:'same',renderer:'same'}};
 const installation=structuredClone(oldInstallation);installation.source.head=newHead;installation.source.hashes['tests/driver.mjs']=other;
 const snapshot={digest:h,tokens:{mapping:1},project:{saved:'same'},assets:[],schemaVersion:1};
 const history=Array.from({length:16},(_,index)=>({intent:{sequence:{index,step:index===15?'parent-limit':'earlier'}}}));
 return{chain:{history,snapshot,supplement:{source:oldHead}},before:snapshot,after:structuredClone(snapshot),oldInstallation,installation,reviewed:[{path:'tests/driver.mjs',before:h,after:other}],paths:{inputsPath:'/inputs'}};
}
test('source-only boundary16 retains exact publicstate and package',()=>{const p=sourceRebindProof(fixture());assert.equal(p.boundary,16);assert.equal(p.captureDigest,h);assert.equal(p.oldSource,oldHead);assert.equal(p.composer,composer);});
for(const [name,edit]of [
 ['changed project with same digest',f=>f.after.project.saved='different'],
 ['token drift',f=>f.after.tokens.mapping++],
 ['package drift',f=>f.installation.composer='c'.repeat(40)],
 ['installed lock drift',f=>f.installation.installed.lock=other],
 ['pack identity drift',f=>f.installation.identities.pack='other'],
 ['wrong history boundary',f=>f.chain.history.pop()],
 ['wrong historical source',f=>f.oldInstallation.source.head=newHead],
 ['unreviewed change',f=>f.installation.source.hashes['tests/extra.mjs']=other],
 ['runtime change',f=>{f.installation.source.hashes['runtime.ts']=other;f.reviewed.unshift({path:'runtime.ts',before:h,after:other});}],
 ['manifest under tests',f=>{f.installation.source.hashes['tests/package.json']=other;f.reviewed.push({path:'tests/package.json',before:null,after:other});}],
 ['empty source gap',f=>{f.installation.source=structuredClone(f.oldInstallation.source);f.reviewed=[];}],
])test('refuses '+name,()=>{const f=fixture();edit(f);assert.throws(()=>sourceRebindProof(f));});
test('reviewed documentation addition allowed, config addition refused',()=>{const f=fixture();f.installation.source.hashes['docs/readme.md']=h;f.reviewed.unshift({path:'docs/readme.md',before:null,after:h});assert.equal(assertReviewedHarnessDelta(f.oldInstallation.source,f.installation.source,f.reviewed).length,2);f.installation.source.hashes['tests/config.mjs']=h;f.reviewed.splice(1,0,{path:'tests/config.mjs',before:null,after:h});assert.throws(()=>assertReviewedHarnessDelta(f.oldInstallation.source,f.installation.source,f.reviewed));});
test('loader refuses changed frozen failure bytes before dependency traversal',async()=>{const frozen=Buffer.from(JSON.stringify({'/failure':inputHash('original')}));const descriptor={proofPath:'/proof',freezeManifestPath:'/freeze',freezeManifestSha256:inputHash(frozen)};await assert.rejects(loadFamilySourceRebind({descriptor,repo:'/unused',bytes:async path=>path==='/freeze'?frozen:Buffer.from('changed')}));});
test('actual preparer and eighth-argument sequence CLI refuse inputs without ESM deadlock/output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-source-rebind-cli-'));
 try{
  const files=['config','capture','history','active','bridge','supplement'];for(const name of files)await writeFile(join(dir,name+'.json'),name==='history'?'[]':'{}');
  const out=join(dir,'intent.json'),missing=join(dir,'missing.json');
  const sequence=spawnSync(process.execPath,[fileURLToPath(new URL('./sequence.mjs',import.meta.url)),...files.slice(0,4).map(n=>join(dir,n+'.json')),out,...files.slice(4).map(n=>join(dir,n+'.json')),missing],{encoding:'utf8',timeout:10000});assert.equal(sequence.status,1,sequence.stderr);assert.match(sequence.stderr,/ENOENT/);assert(!sequence.stderr.includes('unsettled top-level await'));await assert.rejects(access(out));
  const prepare=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-source-rebind.mjs',import.meta.url)),'--inputs',missing,'--artifacts',join(dir,'new')],{encoding:'utf8',timeout:10000});assert.equal(prepare.status,1,prepare.stderr);assert.match(prepare.stderr,/ENOENT/);assert(!prepare.stderr.includes('unsettled top-level await'));await assert.rejects(access(join(dir,'new')));
 }finally{await rm(dir,{recursive:true});}
});
test('preparer requires exclusive explicit absolute input/output arguments',()=>{assert.deepEqual(parseSourceRebindArgs(['--inputs','/i','--artifacts','/o']),{'--inputs':'/i','--artifacts':'/o'});assert.throws(()=>parseSourceRebindArgs(['--inputs','relative','--artifacts','/o']));assert.throws(()=>parseSourceRebindArgs(['--inputs','/i','--inputs','/o']));});
