import {readFrozenBundle,assertInputsUnchanged} from './frozen-inputs.mjs';
import {validateBaselineIntent} from './first-baseline-intent.mjs';
import {firstBaselineProof} from './first-baseline-proof.mjs';
import {publishReviewed} from './publication-ui.mjs';
import {repoRoot} from './config.mjs';
import assert from 'node:assert/strict';import {readFile,writeFile,open,mkdir} from 'node:fs/promises';import {join} from 'node:path';import {createRequire} from 'node:module';
const [bundlePath,bundleHash,artifacts,base]=process.argv.slice(2);
const inputs=await readFrozenBundle(bundlePath,bundleHash);await assertInputsUnchanged(inputs.hashes);
const {intent}=inputs,snapshot=JSON.parse(await readFile(join(artifacts,'before.json'),'utf8'));
assert.deepEqual(snapshot,inputs.snapshot);validateBaselineIntent(intent,snapshot);
const file=await open(join(artifacts,'events.ndjson'),'wx');let queue=Promise.resolve();
const persist=event=>{queue=queue.then(async()=>{await file.writeFile(JSON.stringify({time:new Date().toISOString(),...event})+'\n');await file.sync();});return queue;};
const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');await mkdir(join(artifacts,'profile'));
const context=await chromium.launchPersistentContext(join(artifacts,'profile'),{headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath(),viewport:{width:1600,height:1050}});
let close=ctx=>ctx.close(),error,result;
try {
 await persist({phase:'begin',intent});
 const excluded=snapshot.project.providers.content.flatMap(p=>p.entries.filter(e=>e.lifecycle==='draft').map(e=>({providerId:p.id,modelId:e.modelId,recordId:e.id})));
 const release=await publishReviewed(context.pages()[0],{base,snapshot,refs:intent.refs,excluded,expectedActive:null,persist,expect,setClose:fn=>{close=fn;},proofFactory:firstBaselineProof});
 result={kind:intent.kind,active:release.active,release};
 await context.pages()[0].screenshot({path:join(artifacts,'activated.png'),fullPage:true});
} catch(cause){error=cause;await persist({phase:'held',error:cause.message});}
finally {try{await close(context);}catch(cause){error??=cause;}await queue;await file.close();}
if(error)throw error;await assertInputsUnchanged(inputs.hashes);await readFrozenBundle(bundlePath,bundleHash);
await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result},null,2),{flag:'wx'});
