import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inputHash,readExpectedBytes,mergeExpectedHashes} from './expected-hashes.mjs';
test('real evidence rewrite during repeated read refuses and retains originally validated hash',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-hash-'));try{const path=join(dir,'proof.json');await writeFile(path,'{"saved":1}');const hashes={};assert.equal((await readExpectedBytes(path,hashes)).toString(),'{"saved":1}');const expected=hashes[path];await writeFile(path,'{"saved":2}');await assert.rejects(readExpectedBytes(path,hashes),/Evidence changed on repeated read/);assert.equal(hashes[path],expected);assert.notEqual(expected,inputHash(await readFile(path)));}finally{await rm(dir,{recursive:true});}
});
test('manager before/failure paths overlapping validated chain cannot replace its initial bytes',async()=>{
 const path='/evidence/original-after.json',original=Buffer.from('original'),changed=Buffer.from('changed'),hashes={[path]:inputHash(original)};
 assert.equal(await readExpectedBytes(path,hashes,async()=>original),original);
 await assert.rejects(readExpectedBytes(path,hashes,async()=>changed),/Evidence changed/);assert.equal(hashes[path],inputHash(original));
});
test('bridge and frozen-input merge reject a conflicting duplicate before inserting other entries',()=>{
 const old=inputHash('old'),next=inputHash('next'),target={'/capture':old};assert.throws(()=>mergeExpectedHashes(target,{'/new':next,'/capture':next}),/across input merge/);assert.deepEqual(target,{'/capture':old});mergeExpectedHashes(target,{'/capture':old,'/new':next});assert.deepEqual(target,{'/capture':old,'/new':next});
});
test('all installation evidence readers use retain-on-reread and frozen bundle uses collision-safe merge',async()=>{
 for(const name of ['prepare-installation','installation-history','installation-bridge','frozen-inputs']){const source=await readFile(new URL('./'+name+'.mjs',import.meta.url),'utf8');assert(source.includes('readExpectedBytes('));assert(!/hashes\[\w+\]\s*=(?!=)/.test(source));assert(!source.includes('Object.assign(hashes'));}
});
