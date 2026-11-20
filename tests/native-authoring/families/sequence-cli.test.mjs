import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('actual bridge CLI reaches descriptor validation instead of deadlocking its ESM import cycle',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-sequence-cli-'));
 try{
  const files=['config','capture','history','active'];for(const name of files)await writeFile(join(dir,name+'.json'),name==='history'?'[]':'{}');
  const output=join(dir,'intent.json'),missing=join(dir,'missing-descriptor.json');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./sequence.mjs',import.meta.url)),...files.map(name=>join(dir,name+'.json')),output,missing],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/ENOENT/);assert(!result.stderr.includes('unsettled top-level await'));await assert.rejects(access(output));
 }finally{await rm(dir,{recursive:true});}
});
