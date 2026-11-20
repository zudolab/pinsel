import {contentPreviewOperations,assertContentPreviewResponse} from '../native-preview-reads.mjs';
import {readFrozenBundle} from '../families/frozen-inputs.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,open,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {originalResponse} from '../families/original-request.mjs';
import {compositionDerivedReadGate} from '../families/composition-output.mjs';
import {releaseLifecycle} from '../families/release-lifecycle.mjs';
import {classifyRead,closingReadAction,busyReadTracker,assertReadScope} from '../families/readonly-proof.mjs';
import {copyFields} from './copy-driver.mjs';
import {verifyContentFields} from '../routes.mjs';
import {exactEntryRead,recoveryUi,assertFrozen} from './phase08-recovery.mjs';
/** Fresh profile, reads only. Every non-read aborts and holds; nothing is retried. */
const [bundlePath,bundleHash,artifacts,base,checkout]=process.argv.slice(2);
const inputs=await readFrozenBundle(bundlePath,bundleHash);await assertFrozen(inputs.hashes,p=>readFile(p));
const {snapshot,expected}=inputs;assert.deepEqual(JSON.parse(await readFile(join(artifacts,'before.json'),'utf8')),snapshot);
const file=await open(join(artifacts,'events.ndjson'),'wx');let queue=Promise.resolve();
const persist=event=>{queue=queue.then(async()=>{await file.writeFile(JSON.stringify({time:new Date().toISOString(),...event})+'\n');await file.sync();});return queue;};
const {chromium,expect}=createRequire(join(checkout,'package.json'))('@playwright/test');
await mkdir(join(artifacts,'profile'));
const context=await chromium.launchPersistentContext(join(artifacts,'profile'),{headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath(),viewport:{width:1600,height:1050}});
const page=context.pages()[0],pending=new Set();let blocked,error,entryReads=0;
const composition=compositionDerivedReadGate({page,snapshot,persist});const busyReads=busyReadTracker();
const lane={async drain(){while(pending.size)await Promise.allSettled([...pending]);if(blocked)throw blocked;busyReads.assertSettled();}};
const lifecycle=releaseLifecycle({lanes:[lane,composition],composition,blocked:()=>blocked});
await context.route('**/*',route=>{const work=(async()=>{const request=route.request(),url=new URL(request.url());try{
 assert(!blocked,'Read phase held');assert.equal(url.origin,base,'External request refused');if(request.method()==='GET')return await route.continue();assert.equal(request.method(),'POST');
 const body=request.postDataJSON(),headers=request.headers(),kind=classifyRead(url.pathname,headers,body,snapshot.workspaceId),operation=headers['x-zudo-composer-operation']??headers['x-zudo-composer-asset-operation']??body?.operation,workspace=headers['x-zudo-composer-workspace'];
 if(lifecycle.closing){const action=closingReadAction(url.pathname,headers,body,snapshot.workspaceId);if(action==='settle-composition')return await composition.handle(route);await persist({phase:'read-aborted-at-close',endpoint:url.pathname,operation,input:body});return await route.abort();}
 lifecycle.requireOpen();if(kind==='composition')return await composition.handle(route);
 await persist({phase:'read-before-dispatch',endpoint:url.pathname,operation,workspace,input:body});const response=await originalResponse(page,route);await persist({phase:'read-response',endpoint:url.pathname,operation,workspace,input:body,...response});
 if(busyReads.observe(url.pathname,headers,body,response,snapshot.workspaceId)){await persist({phase:'read-busy-awaiting-client-retry',endpoint:url.pathname,operation,input:body});return;}
 assertReadScope(url.pathname,headers,response.body.result,snapshot.workspaceId);if(kind==='native'&&contentPreviewOperations.has(body.operation))assertContentPreviewResponse(body,response,snapshot,{revision:snapshot.digest});
 if(exactEntryRead(expected,snapshot.workspaceId,{endpoint:url.pathname,operation,workspace,input:body,...response})){entryReads++;await persist({phase:'exact-qualified-entry-read',ref:expected.ref,record:expected.record});}
}catch(cause){blocked??=cause;await route.abort().catch(()=>{});await persist({phase:'read-held',endpoint:url.pathname,error:cause.message}).catch(()=>{});}})();pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;});
let verified;try{
 await persist({phase:'begin',intent:{kind:'static08-readonly-recovery',ref:expected.ref}});const {ref,record}=expected;
 const {model,values,labels}=copyFields(snapshot,record.values['page-copy-route'],record.values['page-copy-meta-title']);assert.deepEqual(values,record.values);
 await page.goto(`${base}/content?provider=${encodeURIComponent(ref.providerId)}&model=${encodeURIComponent(ref.modelId)}&entry=${encodeURIComponent(ref.recordId)}`);
 const settlement={async beforeAdvance(){await lane.drain();lifecycle.requireSettled();}};await verifyContentFields(page,labels,{model,settlement});
 await expect.poll(()=>entryReads,{timeout:180000}).toBeGreaterThan(0);await settlement.beforeAdvance();
 verified=Object.keys(values);await page.screenshot({path:join(artifacts,'verified.png'),fullPage:true});
}catch(cause){error=cause;await persist({phase:'held',error:cause.message});}
finally{try{await lifecycle.close(context);}catch(cause){error??=cause;}await queue;await file.close();}
if(error)throw error;
// After close: every journaled exact read, including any during settlement, is counted.
const ui=recoveryUi({expected,entryReads,fieldsVerified:verified});
await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result:ui},null,2),{flag:'wx'});
