import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ownProcess, nativeOwnerOptions, assertLeaseAbsent } from './owner-process.mjs';
const fake = () => {
 const c=new EventEmitter(); Object.assign(c,{pid:123,exitCode:null,signalCode:null,stdout:new EventEmitter(),stderr:new EventEmitter(),signals:[]});
 c.kill=s=>{c.signals.push(s);return true;};return c;
};
const checks = () => ({leaseAbsent:async()=>{},portFree:async()=>{}});
test('duplicate stop signals exact owner once; waits close and drains late output',async()=>{
 const c=fake(),o=ownProcess(c);const p=o.stop(checks());assert.equal(p,o.stop(checks()));
 c.emit('exit',0,null);let done=false;p.then(()=>done=true);await new Promise(r=>setTimeout(r,80));assert.equal(done,false);
 c.stderr.emit('data',Buffer.from('late'));c.emit('close',0,null);await p;assert.equal(o.logs(),'late');assert.deepEqual(c.signals,['SIGTERM']);
});
for(const [code,signal] of [[1,null],[null,'SIGTERM']])test(`refuse exit ${code}/${signal}`,async()=>{
 const c=fake(),o=ownProcess(c);let checked=false;const p=o.stop({leaseAbsent:async()=>checked=true});c.emit('close',code,signal);await assert.rejects(p);assert.equal(checked,false);
});
test('timeout never signals twice, unlinks, or checks downstream',async()=>{
 const c=fake(),o=ownProcess(c);let checked=false;const p=o.stop({timeoutMs:10,leaseAbsent:async()=>checked=true});await assert.rejects(p,/incomplete/);assert.deepEqual(c.signals,['SIGTERM']);assert.equal(checked,false);c.emit('close',0,null);await assert.rejects(o.stop(checks()),/incomplete/);
});
test('retained lease prevents port check and is preserved including symlink',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-lease-'));try{
 await symlink('absent-target',join(dir,'.zudo-authoring.lock'));const c=fake(),o=ownProcess(c);let checked=false;
 const p=o.stop({hostRoot:dir,portFree:async()=>checked=true});c.emit('close',0,null);await assert.rejects(p,/lease remains/);assert.equal(checked,false);await assert.rejects(assertLeaseAbsent(dir),/lease remains/);
 }finally{await rm(dir,{recursive:true});}
});
test('launch options preserve entry/args/stage and exact tsconfig',()=>{
 const x=nativeOwnerOptions('/repo',{PINSEL_AUTHORING_STAGE:'notes-v1',EXPECTED_COMPOSER_SHA:'pin'},4208);
 assert.deepEqual(x.args,['--import','tsx','src/site/start-native.ts','--port','4208','--strict-port']);assert.equal(x.options.env.TSX_TSCONFIG_PATH,'/repo/packages/pinsel-content/tsconfig.scripts.json');assert.equal(x.options.env.PINSEL_AUTHORING_STAGE,'notes-v1');assert.equal(x.options.env.EXPECTED_COMPOSER_SHA,'pin');assert.equal(x.options.detached,undefined);
});
test('installed public tsx import: aliases/types/args/env and delayed graceful close',async()=>{
 const installed=process.env.FAMILY_TEST_DEPENDENCIES;assert(installed,'Set FAMILY_TEST_DEPENDENCIES to an existing installed node_modules (no install)');
 const root=await mkdtemp(join(tmpdir(),'family-owner-'));try{
 const cwd=join(root,'packages/pinsel-content');await mkdir(join(cwd,'src/site'),{recursive:true});await symlink(installed,join(cwd,'node_modules'));
 await writeFile(join(cwd,'package.json'),'{"type":"module"}');await writeFile(join(cwd,'tsconfig.scripts.json'),JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@fixture/*':['src/*']}}}));
 await writeFile(join(cwd,'src/value.ts'),'export const value: string = "alias-ok";');
 await writeFile(join(cwd,'src/site/start-native.ts'),`import {value} from '@fixture/value';import{writeFile,unlink}from'node:fs/promises';
await writeFile('.zudo-authoring.lock','disposable');let stopping=false;const keep=setInterval(()=>{},1000);
process.on('SIGTERM',()=>{if(stopping)return;stopping=true;setTimeout(async()=>{await unlink('.zudo-authoring.lock');console.error('drained');clearInterval(keep);process.exit(0);},180);});
console.log(JSON.stringify({value,args:process.argv.slice(2),stage:process.env.PINSEL_AUTHORING_STAGE}));`);
 const x=nativeOwnerOptions(root,{...process.env,PINSEL_AUTHORING_STAGE:'fixture'},4208);const child=spawn(x.command,x.args,x.options),owner=ownProcess(child);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture not ready')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
 const start=Date.now();await owner.stop({hostRoot:cwd,port:4208,portFree:async()=>{},timeoutMs:5000});assert(Date.now()-start>=150);const rows=owner.logs().trim().split('\n');const actual=JSON.parse(rows[0]);assert.deepEqual(actual,{value:'alias-ok',args:['--port','4208','--strict-port'],stage:'fixture'});assert(rows.includes('drained'));await assertLeaseAbsent(cwd);
 }finally{await rm(root,{recursive:true});}
});
test('spawn failure and occupied port both fail closed',async()=>{
 const c=fake(),o=ownProcess(c);c.emit('error',Error('spawn refused'));const p=o.stop(checks());c.emit('close',-2,null);await assert.rejects(p,/spawn refused/);assert.deepEqual(c.signals,[]);
 const d=fake(),q=ownProcess(d);const stopped=q.stop({leaseAbsent:async()=>{},portFree:async()=>{throw Error('occupied');}});d.emit('close',0,null);await assert.rejects(stopped,/occupied/);
});
test('startup rejects foreign lease PID, exited owner and symlink',async()=>{
 const {assertOwnedLease}=await import('./owner-process.mjs');const dir=await mkdtemp(join(tmpdir(),'family-owner-identity-'));try{
 const c=fake();await writeFile(join(dir,'.zudo-authoring.lock'),JSON.stringify({pid:999,owner:'dev-server'}));await assert.rejects(assertOwnedLease(dir,c),/ownership/);
 await writeFile(join(dir,'.zudo-authoring.lock'),JSON.stringify({pid:c.pid,owner:'dev-server'}));await assertOwnedLease(dir,c);c.exitCode=1;await assert.rejects(assertOwnedLease(dir,c),/exited/);
 }finally{await rm(dir,{recursive:true});}
});
