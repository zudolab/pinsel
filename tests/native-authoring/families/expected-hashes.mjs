import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export const inputHash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Once observed/validated, a path's expected bytes can never be replaced. */
export function retainExpectedHash(hashes,path,hash){
 assert.equal(typeof path,'string');assert.match(hash,/^[a-f0-9]{64}$/);
 if(Object.hasOwn(hashes,path))assert.equal(hash,hashes[path],`Evidence changed on repeated read: ${path}`);
 else Object.defineProperty(hashes,path,{value:hash,enumerable:true,writable:true,configurable:true});
 return hash;
}
export async function readExpectedBytes(path,hashes,read=readFile){
 const bytes=await read(path);retainExpectedHash(hashes,path,inputHash(bytes));return bytes;
}
export function mergeExpectedHashes(target,source){
 // Validate the entire merge first so a collision cannot leave a partial update.
 for(const[path,hash]of Object.entries(source)){assert.match(hash,/^[a-f0-9]{64}$/);if(Object.hasOwn(target,path))assert.equal(hash,target[path],`Evidence changed across input merge: ${path}`);}
 for(const[path,hash]of Object.entries(source))retainExpectedHash(target,path,hash);
}

// Capability registry, not a bytes/digest cache. Only closed chains rooted in the
// actual readFile may exchange a private record before any Buffer escapes.
const recordReaders=new WeakMap();
export function createExpectedReader(hashes,read=readFile,{absolute=false}={}){
 const child=recordReaders.get(read);
 const checkPath=path=>{if(absolute)assert(path.startsWith('/'));};
 if(read!==readFile&&!child){
  // Arbitrary callbacks can retain and mutate their buffers between awaits.
  // Do not register this wrapper: every ancestor must retain legacy rehashing.
  return async path=>{checkPath(path);return readExpectedBytes(path,hashes,read);};
 }
 const record=async(path,operation)=>{
  checkPath(path);
  let value;
  if(child)value=await child(path,operation);
  else{const bytes=await readFile(path);value={path,operation,bytes,digest:inputHash(bytes)};}
  assert.equal(value.path,path);assert.equal(value.operation,operation);
  retainExpectedHash(hashes,path,value.digest);
  return value;
 };
 const reader=async path=>(await record(path,Symbol('physical read'))).bytes;
 recordReaders.set(reader,record);
 return reader;
}
