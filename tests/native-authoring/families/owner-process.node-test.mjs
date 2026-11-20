import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, symlink, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { ownProcess, nativeOwnerOptions, assertLeaseAbsent, assertOwnedLease } from './owner-process.mjs';
import { installNativeOwnerIpc } from '../../../packages/pinsel-content/src/site/native-owner-ipc.mjs';
const identity={protocol:'pinsel-native-owner-v1',nonce:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',port:4208,hostRoot:'/fixture'};
const fake=()=>{const c=new EventEmitter();Object.assign(c,{pid:123,exitCode:null,signalCode:null,connected:true,stdout:new EventEmitter(),stderr:new EventEmitter(),sent:[]});c.send=(m,cb)=>{c.sent.push(m);cb();};c.kill=()=>{throw Error('NO SIGNALS');};return c;};
const msg=(c,type,extra={})=>c.emit('message',{...identity,pid:c.pid,type,...extra});
const checks=()=>({leaseAbsent:async()=>{},portFree:async()=>{}});
test('duplicate stop sends once; closed acknowledgement, actual close and late logs all required',async()=>{
 const c=fake(),o=ownProcess(c,identity);msg(c,'ready');const p=o.stop(checks());assert.equal(p,o.stop(checks()));msg(c,'closed');c.emit('exit',0,null);let done=false;p.then(()=>done=true);await new Promise(r=>setTimeout(r,80));assert.equal(done,false);c.stderr.emit('data',Buffer.from('late'));c.emit('close',0,null);await p;assert.equal(o.logs(),'late');assert.equal(c.sent.length,1);
});
for(const [code,signal]of [[143,null],[0,null],[1,null],[null,'SIGTERM']])test(`reject early ${code}/${signal} without closed ack`,async()=>{const c=fake(),o=ownProcess(c,identity);msg(c,'ready');const p=o.stop(checks());c.emit('close',code,signal);await assert.rejects(p);});
for(const bad of [{nonce:'wrong'},{pid:9},{port:1},{protocol:'wrong'}])test(`reject ready identity ${JSON.stringify(bad)}`,async()=>{const c=fake(),o=ownProcess(c,identity);msg(c,'ready',bad);await assert.rejects(o.waitReady(20));await assert.rejects(o.stop(checks()));assert.equal(c.sent.length,0);});
test('channel loss/timeout cannot admit capture or retry stop',async()=>{
 const c=fake(),o=ownProcess(c,identity);msg(c,'ready');let checked=false;const p=o.stop({timeoutMs:10,leaseAbsent:async()=>checked=true});await assert.rejects(p,/incomplete/);msg(c,'closed');c.emit('close',0,null);await assert.rejects(o.stop(checks()));assert.equal(c.sent.length,1);assert.equal(checked,false);
 const d=fake(),q=ownProcess(d,identity);msg(d,'ready');d.emit('disconnect');await assert.rejects(q.stop(checks()),/channel lost/);assert.equal(d.sent.length,0);
});
test('retained lease and wrong ready owner are refused, including symlink',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-lease-'));try{const c=fake();await writeFile(join(dir,'.zudo-authoring.lock'),JSON.stringify({pid:999,owner:'dev-server'}));await assert.rejects(assertOwnedLease(dir,c),/ownership/);await unlink(join(dir,'.zudo-authoring.lock'));await symlink('missing',join(dir,'.zudo-authoring.lock'));await assert.rejects(assertOwnedLease(dir,c),/regular/);
 const o=ownProcess(c,identity);msg(c,'ready');let port=false;const p=o.stop({hostRoot:dir,portFree:async()=>port=true});msg(c,'closed');c.emit('close',0,null);await assert.rejects(p,/lease remains/);assert.equal(port,false);await assert.rejects(assertLeaseAbsent(dir));}finally{await rm(dir,{recursive:true});}
});
function fakeProc(){const p=new EventEmitter();Object.assign(p,{pid:123,connected:true,stderr:{write(){}},messages:[],exits:[]});p.send=(m,cb)=>{p.messages.push(m);cb();};p.exit=c=>p.exits.push(c);return p;}
test('child ack send callback precedes exit; duplicate stop shares close',async()=>{
 const p=fakeProc();let closes=0,finish,ack;const ctl=installNativeOwnerIpc({server:{close:()=>{closes++;return new Promise(r=>finish=r);}},...identity,proc:p});await ctl.ready();p.send=(m,cb)=>{p.messages.push(m);ack=cb;};p.emit('message',{...identity,pid:p.pid,type:'stop'});p.emit('message',{...identity,pid:p.pid,type:'stop'});await new Promise(r=>setImmediate(r));assert.equal(closes,1);finish();await new Promise(r=>setImmediate(r));assert.deepEqual(p.exits,[]);ack();await new Promise(r=>setImmediate(r));assert.deepEqual(p.exits,[0]);
});
test('child close rejection and wrong request never acknowledge closed',async()=>{
 for(const invalid of [false,true]){const p=fakeProc();const ctl=installNativeOwnerIpc({server:{close:async()=>{if(!invalid)throw Error('close rejected');}},...identity,proc:p});await ctl.ready();p.emit('message',{...identity,pid:invalid?9:p.pid,type:'stop'});await new Promise(r=>setImmediate(r));assert.deepEqual(p.exits,[1]);assert(!p.messages.some(x=>x.type==='closed'));}
});
test('child disconnect drains close and exits1 without closed acknowledgement',async()=>{const p=fakeProc();let closed=false;installNativeOwnerIpc({server:{close:async()=>closed=true},...identity,proc:p});p.connected=false;p.emit('disconnect');await new Promise(r=>setImmediate(r));assert(closed);assert.deepEqual(p.exits,[1]);assert.equal(p.messages.length,0);});
test('real installed Vite + public tsx: IPC close beyond15s avoids Vite SIGTERM exit race',async()=>{
 const modules=process.env.FAMILY_TEST_DEPENDENCIES;assert(modules);const require=createRequire(join(modules,'../package.json'));
 const composer=require.resolve('zudo-composer/package.json',{paths:[join(modules,'../packages/pinsel-content')]});
 const vite=createRequire(composer).resolve('vite');
 const root=await mkdtemp(join(tmpdir(),'family-vite-ipc-'));
 try{
 const cwd=join(root,'packages/pinsel-content');await mkdir(join(cwd,'src/site'),{recursive:true});await symlink(modules,join(cwd,'node_modules'));
 await writeFile(join(cwd,'package.json'),'{"type":"module"}');await writeFile(join(cwd,'tsconfig.scripts.json'),JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@fixture/*':['src/*']}}}));await writeFile(join(cwd,'src/value.ts'),'export const value: string="alias-ok";');
 const lifecycle=new URL('../../../packages/pinsel-content/src/site/native-owner-ipc.mjs',import.meta.url).href;
 await writeFile(join(cwd,'src/site/start-native.ts'),`import {value}from'@fixture/value';import{writeFile,unlink}from'node:fs/promises';import{createServer}from ${JSON.stringify(pathToFileURL(vite).href)};import{installNativeOwnerIpc}from ${JSON.stringify(lifecycle)};
const server=await createServer({root:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:0},optimizeDeps:{noDiscovery:true,include:[]}});await server.listen();const actualPort=server.httpServer.address().port;
await writeFile('.zudo-authoring.lock',JSON.stringify({pid:process.pid,owner:'dev-server'}));const original=server.close.bind(server);let shutdown;server.close=()=>shutdown??=(async()=>{await new Promise(r=>setTimeout(r,16050));await original();await unlink('.zudo-authoring.lock');console.error('drained');})();
console.log(JSON.stringify({value,args:process.argv.slice(2),stage:process.env.PINSEL_AUTHORING_STAGE,actualPort,sigtermListeners:process.listenerCount("SIGTERM")}));
const ctl=installNativeOwnerIpc({server,nonce:process.env.PINSEL_NATIVE_OWNER_IPC_NONCE,port:0,hostRoot:process.cwd()});await ctl.ready();`);
 const x=nativeOwnerOptions(root,{...process.env,PINSEL_AUTHORING_STAGE:'fixture'},0,identity.nonce);const child=spawn(x.command,x.args,x.options);const o=ownProcess(child,{...identity,port:0,hostRoot:cwd});await o.waitReady(10000);await assertOwnedLease(cwd,child);const line=o.logs().split('\n').find(x=>x.startsWith('{'));const observed=JSON.parse(line);assert.equal(observed.value,'alias-ok');assert.equal(observed.stage,'fixture');assert(observed.sigtermListeners>0,'Actual Vite SIGTERM handler remains installed');assert.deepEqual(observed.args,['--port','0','--strict-port']);
 const start=Date.now();const result=await o.stop({hostRoot:cwd,port:observed.actualPort});assert(Date.now()-start>=16000);assert.equal(result.code,0);assert(o.logs().includes('drained'));assert.deepEqual(o.trace().filter(x=>x.event==='message').map(x=>x.message.type),['ready','closed']);
 }finally{await rm(root,{recursive:true});}
});
for (const mode of ['signal-race', 'ipc-close-reject']) test(`real installed Vite ${mode} preserves failure tuple and no closed acknowledgement`, async () => {
 const modules=process.env.FAMILY_TEST_DEPENDENCIES;assert(modules);const require=createRequire(join(modules,'../package.json'));
 const composer=require.resolve('zudo-composer/package.json',{paths:[join(modules,'../packages/pinsel-content')]});
 const vite=createRequire(composer).resolve('vite');const root=await mkdtemp(join(tmpdir(),'family-vite-negative-'));
 try {
  const cwd=join(root,'packages/pinsel-content');await mkdir(join(cwd,'src/site'),{recursive:true});await symlink(modules,join(cwd,'node_modules'));
  await writeFile(join(cwd,'package.json'),'{"type":"module"}');await writeFile(join(cwd,'tsconfig.scripts.json'),'{}');
  const lifecycle=new URL('../../../packages/pinsel-content/src/site/native-owner-ipc.mjs',import.meta.url).href;
  await writeFile(join(cwd,'src/site/start-native.ts'),`import{createServer}from ${JSON.stringify(pathToFileURL(vite).href)};import{installNativeOwnerIpc}from ${JSON.stringify(lifecycle)};
const server=await createServer({root:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:0},optimizeDeps:{noDiscovery:true,include:[]}});await server.listen();const original=server.close.bind(server);let closing;
server.close=()=>closing??=(async()=>{await new Promise(r=>setTimeout(r,80));await original();${mode==='ipc-close-reject'?"throw Error('fixture close rejection after real Vite close');":""}})();
// Register the same late host exit0 path as start-native, after Vite's handler.
process.on('SIGTERM',()=>{void server.close().then(()=>process.exit(0),()=>process.exit(1));});
const ctl=installNativeOwnerIpc({server,nonce:process.env.PINSEL_NATIVE_OWNER_IPC_NONCE,port:0,hostRoot:process.cwd()});await ctl.ready();`);
  const x=nativeOwnerOptions(root,{...process.env},0,identity.nonce);const child=spawn(x.command,x.args,x.options);const owner=ownProcess(child,{...identity,port:0,hostRoot:cwd});
  const exited=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));await owner.waitReady(10000);
  if(mode==='signal-race') {
   // Deliberate signal only to this new disposable fixture PID, never a native owner.
   assert(child.kill('SIGTERM'));assert.deepEqual(await exited,{code:143,signal:null});
  } else {
   await assert.rejects(owner.stop({hostRoot:cwd,port:0,timeoutMs:10000}),/acknowledgement/);
   assert.deepEqual(await exited,{code:1,signal:null});assert(owner.logs().includes('fixture close rejection'));
  }
  assert(!owner.trace().some(e=>e.event==='message'&&e.message.type==='closed'));
  assert(owner.trace().some(e=>e.event==='close'&&e.code===(mode==='signal-race'?143:1)&&e.signal===null));
 } finally {await rm(root,{recursive:true});}
});
