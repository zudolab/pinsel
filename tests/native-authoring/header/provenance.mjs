import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const exec=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
/** Every tracked source byte is fenced, not merely HEAD/status filenames. */
export async function sourceIdentity(repo){
 const {stdout:head}=await exec('git',['rev-parse','HEAD'],{cwd:repo}),{stdout:status}=await exec('git',['status','--porcelain'],{cwd:repo});assert.equal(status.trim(),'','Commit or preserve unrelated work before acceptance; clean checkout required');
 const {stdout:files}=await exec('git',['ls-files','-z'],{cwd:repo,maxBuffer:16*1024*1024});const hashes={};for(const name of files.split('\0').filter(Boolean).sort())hashes[name]=hash(await readFile(join(repo,name)));return{head:head.trim(),hashes};
}
