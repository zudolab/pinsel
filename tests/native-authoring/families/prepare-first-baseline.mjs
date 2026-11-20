import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {baselineSelection,validateBaselineIntent} from './first-baseline-intent.mjs';
const [capturePath,output]=process.argv.slice(2);assert(capturePath&&output,'Usage: prepare-first-baseline.mjs accepted-capture.json NEW-intent.json');
const snapshot=JSON.parse(await readFile(capturePath,'utf8'));
const intent={kind:'first-baseline',capturePath:resolve(capturePath),captureDigest:snapshot.digest,expectedActive:null,refs:baselineSelection(snapshot)};
validateBaselineIntent(intent,snapshot);await writeFile(output,JSON.stringify(intent,null,2),{flag:'wx'});
console.log(`Prepared ${intent.refs.length} published identities; review before local activation. No server or writes.`);
