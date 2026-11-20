import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
import {prepareLifecycleIntent,validateLifecycleIntent} from './lifecycle.mjs';
/** Offline: next #988 step from the accepted capture and the ordered step proofs. No server, no stage access. */
const [marker,capturePath,proofPathsPath,output]=process.argv.slice(2);assert(process.argv.length===6,'Usage: prepare.mjs MARKER /accepted-capture.json /proof-paths.json /new-intent.json');for(const path of [capturePath,proofPathsPath,output])assert(path.startsWith('/'));
const json=async p=>JSON.parse(await readFile(p,'utf8'));const snapshot=await json(capturePath),proofPaths=await json(proofPathsPath);assert(Array.isArray(proofPaths));const proofs=await Promise.all(proofPaths.map(json));
const intent={...prepareLifecycleIntent({snapshot,capturePath,proofs,marker}),proofPaths};validateLifecycleIntent(intent,{snapshot,proofs});await writeFile(output,JSON.stringify(intent,null,2),{flag:'wx'});console.log(`${intent.sequence} ${intent.kind}`);
