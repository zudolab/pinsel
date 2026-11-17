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
