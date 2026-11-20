import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
import {childOrderIntent,assertChildOrderDelta} from './order-followup.mjs';import {getRecord} from './intents.mjs';import {FAMILY} from './family-graph.mjs';
const[originalPath,currentPath,familyPath,kind,secondPath,direction,valueOrProof,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p,'utf8'));
const original=await read(originalPath),current=await read(currentPath),family=await read(familyPath),second=await read(secondPath);assert(['change','inverse'].includes(direction));let value;
if(direction==='change'){assert.deepEqual(current,original);value=Number(valueOrProof);}else{const proof=await read(valueOrProof);assert.equal(proof.beforeDigest,original.digest);assert.equal(proof.afterDigest,current.digest);assertChildOrderDelta(original,current,family,kind,second,proof.intent,proof.result.record);value=getRecord(original,'content',second).values[FAMILY[kind].orderField];}
await writeFile(out,JSON.stringify(childOrderIntent(current,family,kind,second,value,currentPath),null,2),{flag:'wx'});
