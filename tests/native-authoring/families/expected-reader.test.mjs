import {test,vi} from 'vitest';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm,unlink,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createExpectedReader,inputHash,readExpectedBytes} from './expected-hashes.mjs';
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),'family-reader-'));try{const path=join(dir,'bytes');await writeFile(path,Buffer.from([0,255,128,10,13,0]));await run(path,dir);}finally{await rm(dir,{recursive:true,force:true});}}
function chain(maps,leaf=readFile){return maps.reduce((read,hashes)=>createExpectedReader(hashes,read,{absolute:true}),leaf);}
function countHashes(){const prototype=Object.getPrototypeOf(createHash('sha256')),original=prototype.update;let count=0;const spy=vi.spyOn(prototype,'update').mockImplementation(function(...args){count++;return original.apply(this,args);});return {get count(){return count;},restore:()=>spy.mockRestore()};}
test('closed nested readers hash one fresh binary read once, with every layer retaining its expectation',()=>fixture(async path=>{
 const maps=Array.from({length:6},()=>({})),reader=chain(maps),counter=countHashes();let first,second;
 try{first=await reader(path);assert.equal(counter.count,1);second=await reader(path);assert.equal(counter.count,2);}finally{counter.restore();}
 assert.notEqual(first,second);assert.deepEqual(first,Buffer.from([0,255,128,10,13,0]));for(const map of maps)assert.equal(map[path],inputHash(first));
 await unlink(path);await assert.rejects(reader(path),{code:'ENOENT'});
}));
test('inner and outer conflicting expectations fail and never replace initial values',()=>fixture(async path=>{
 for(const index of [0,3]){const maps=Array.from({length:4},()=>({})),bad=inputHash('different');maps[index][path]=bad;await assert.rejects(chain(maps)(path),/Evidence changed/);assert.equal(maps[index][path],bad);}
}));
test('changed second physical read fails even if the file is subsequently restored before final fence',()=>fixture(async path=>{
 const maps=[{},{}],reader=chain(maps),original=await reader(path),expected=maps[0][path];await writeFile(path,'changed');await assert.rejects(reader(path),/Evidence changed/);assert.equal(maps[0][path],expected);await writeFile(path,original);assert.deepEqual(await reader(path),original);
}));
test('final fresh read catches changed disk bytes',()=>fixture(async path=>{
 const hashes={},reader=createExpectedReader(hashes);await reader(path);await writeFile(path,'changed at fence');for(const p of Object.keys(hashes))await assert.rejects(reader(p),/Evidence changed/);
}));
test('caller mutation of returned Buffer cannot hide from inputHash or contaminate later reads',()=>fixture(async path=>{
 const maps=[{},{}],reader=chain(maps),bytes=await reader(path),expected=maps[0][path];bytes.fill(42);assert.notEqual(inputHash(bytes),expected);assert.equal(inputHash(await reader(path)),expected);assert.equal(maps[1][path],expected);
}));
test('concurrent reads and aliases are independent, not coalesced',()=>fixture(async(path,dir)=>{
 const alias=join(dir,'alias');await symlink(path,alias);const hashes={},reader=chain([{},hashes]),counter=countHashes();let values;
 try{values=await Promise.all([reader(path),reader(path),reader(alias)]);assert.equal(counter.count,3);}finally{counter.restore();}
 assert.notEqual(values[0],values[1]);assert.notEqual(values[1],values[2]);assert.deepEqual(Object.keys(hashes).sort(),[path,alias].sort());values[0].fill(9);assert.notDeepEqual(values[0],values[1]);assert.deepEqual(values[1],values[2]);
}));
test('arbitrary callback ancestry rehashes at every level and calls leaf afresh in original order',async()=>{
 const buffer=Buffer.from('same'),calls=[],maps=[{},{},{}],leaf=async p=>{calls.push(p);return buffer;},reader=chain(maps,leaf),counter=countHashes();
 try{await reader('/one');assert.equal(counter.count,3);await reader('/two');assert.equal(counter.count,6);assert.deepEqual(calls,['/one','/two']);}finally{counter.restore();}
});
test('alias mutation across arbitrary callback returns is detected independently by every ancestor',async()=>{
 const buffer=Buffer.from('old'),old=inputHash(buffer),inner={},outer={'/one':old};
 const callback=async p=>{const bytes=await readExpectedBytes(p,inner,async()=>buffer);bytes.write('new');return bytes;};
 await assert.rejects(chain([{},outer],callback)('/one'),/Evidence changed/);assert.equal(inner['/one'],old);assert.equal(outer['/one'],old);
});
test('callback can wrap a registered reader without gaining trusted ancestry',()=>fixture(async path=>{
 const inner=createExpectedReader({}),callback=async p=>{const b=await inner(p);b.fill(9);return b;},maps=[{},{}],counter=countHashes();let result;
 try{result=await chain(maps,callback)(path);assert.equal(counter.count,3);}finally{counter.restore();}
 assert.equal(maps[0][path],inputHash(result));assert.equal(maps[1][path],inputHash(result));assert.notDeepEqual(result,await readFile(path));
}));
test('forged metadata and copied function properties cannot grant digest transport',async()=>{
 const buffer=Buffer.from('abc'),trusted=createExpectedReader({}),leaf=Object.assign(async()=>buffer,trusted,{digest:inputHash(buffer),record:{bytes:buffer,digest:inputHash(buffer)},trusted:true});
 leaf[Symbol.for('expected-reader')]=true;const counter=countHashes();try{await chain([{},{}],leaf)('/x');assert.equal(counter.count,2);}finally{counter.restore();}
});
test('path guard precedes leaf access; legacy callback error and invalid expected hash propagate',async()=>{
 let calls=0;const leaf=async()=>{calls++;throw Error('read failure');};await assert.rejects(createExpectedReader({},leaf,{absolute:true})('relative'));assert.equal(calls,0);await assert.rejects(createExpectedReader({},leaf)('/x'),/read failure/);assert.equal(calls,1);await assert.rejects(createExpectedReader({'/x':'bad'},async()=>Buffer.from('ok'))('/x'),/Evidence changed/);
});
test('nonshareable callback ancestry survives multiple factory wrappers and mutation between their checks',async()=>{
 const buffer=Buffer.from('old'),old=inputHash(buffer);let mutate=true;
 const inner=new Proxy({},{getOwnPropertyDescriptor(target,key){if(key==='/x'&&mutate){buffer.write('new');mutate=false;}return Reflect.getOwnPropertyDescriptor(target,key);}});
 const middle={},outer={'/x':old},reader=chain([inner,middle,outer],async()=>buffer);
 await assert.rejects(reader('/x'),/Evidence changed/);assert.equal(inner['/x'],old);assert.equal(middle['/x'],inputHash('new'));assert.equal(outer['/x'],old);
});
test('arbitrary shared Buffer changes across separate returns are not memoized',async()=>{
 const bytes=Buffer.from('old'),maps=[{},{}],reader=chain(maps,async()=>bytes);await reader('/x');const old=maps[0]['/x'];bytes.write('new');await assert.rejects(reader('/x'),/Evidence changed/);assert.equal(maps[0]['/x'],old);assert.equal(maps[1]['/x'],old);
});
