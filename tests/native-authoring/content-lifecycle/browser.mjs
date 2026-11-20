import {contentPreviewOperations,assertContentPreviewResponse} from '../native-preview-reads.mjs';
import {readFrozenBundle,assertInputsUnchanged} from '../families/frozen-inputs.mjs';
import {repoRoot} from '../families/config.mjs';
import assert from 'node:assert/strict';
import {writeFile,open,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {originalResponse} from '../families/original-request.mjs';
import {compositionDerivedReadGate} from '../families/composition-output.mjs';
import {releaseLifecycle} from '../families/release-lifecycle.mjs';
import {classifyRead,closingReadAction,busyReadTracker,assertReadScope} from '../families/readonly-proof.mjs';
import {staticCopyUi} from '../static/copy-driver.mjs';
import {verifyContentFields} from '../routes.mjs';
import {contentFieldPlan} from '../routes-fields.mjs';
import {contentDeleteUi} from './delete-ui.mjs';
import {presentEntryRead,absenceListing} from './lifecycle.mjs';
const [bundlePath,bundleHash,artifacts,base]=process.argv.slice(2);
const bundle=await readFrozenBundle(bundlePath,bundleHash);await assertInputsUnchanged(bundle.hashes);const {intent,snapshot}=bundle;assert.equal(snapshot.digest,intent.captureDigest);
const file=await open(join(artifacts,'events.ndjson'),'wx');let queue=Promise.resolve();
const persist=event=>{queue=queue.then(async()=>{await file.writeFile(JSON.stringify({time:new Date().toISOString(),...event})+'\n');await file.sync();});return queue;};
const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');await mkdir(join(artifacts,'profile'));
const context=await chromium.launchPersistentContext(join(artifacts,'profile'),{headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath(),viewport:{width:1600,height:1050}});
const page=context.pages()[0];let closeContext=ctx=>ctx.close(),result,error;
page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/__zudo'))void persist({phase:'browser-requestfailed',url:request.url(),failure:request.failure()}).catch(()=>{});});
/** Fresh profile, reads only: every non-read aborts and holds the step. */
async function inspect(){
 const pending=new Set();let blocked,entryReads=0,completeListings=0;const composition=compositionDerivedReadGate({page,snapshot,persist}),busyReads=busyReadTracker();
 const lane={async drain(){while(pending.size)await Promise.allSettled([...pending]);if(blocked)throw blocked;busyReads.assertSettled();}};const lifecycle=releaseLifecycle({lanes:[lane,composition],composition,blocked:()=>blocked});closeContext=ctx=>lifecycle.close(ctx);
 await context.route('**/*',route=>{const work=(async()=>{const request=route.request(),url=new URL(request.url());try{
  assert(!blocked,'Read phase held');assert.equal(url.origin,base,'External request refused');if(request.method()==='GET')return await route.continue();assert.equal(request.method(),'POST');
  const body=request.postDataJSON(),headers=request.headers(),kind=classifyRead(url.pathname,headers,body,snapshot.workspaceId),operation=headers['x-zudo-composer-operation']??headers['x-zudo-composer-asset-operation']??body?.operation,workspace=headers['x-zudo-composer-workspace'];
  if(lifecycle.closing){if(closingReadAction(url.pathname,headers,body,snapshot.workspaceId)==='settle-composition')return await composition.handle(route);await persist({phase:'read-aborted-at-close',endpoint:url.pathname,operation,input:body});return await route.abort();}
  lifecycle.requireOpen();if(kind==='composition')return await composition.handle(route);
  await persist({phase:'read-before-dispatch',endpoint:url.pathname,operation,workspace,input:body});const response=await originalResponse(page,route);await persist({phase:'read-response',endpoint:url.pathname,operation,workspace,input:body,...response});
  if(busyReads.observe(url.pathname,headers,body,response,snapshot.workspaceId)){await persist({phase:'read-busy-awaiting-client-retry',endpoint:url.pathname,operation,input:body});return;}
  assertReadScope(url.pathname,headers,response.body.result,snapshot.workspaceId);if(kind==='native'&&contentPreviewOperations.has(body.operation))assertContentPreviewResponse(body,response,snapshot,{revision:snapshot.digest});
  const observed={endpoint:url.pathname,operation,workspace,input:body,...response};
  if(intent.kind==='inspect-present'&&presentEntryRead(intent.ref,intent.record,snapshot.workspaceId,observed)){entryReads++;await persist({phase:'exact-qualified-entry-read',ref:intent.ref});}
  if(intent.kind==='inspect-absent'){if(observed.operation==='get-entry'&&body?.id===intent.ref.recordId)assert.notEqual(response.body?.result?.status,'loaded','Deleted entry loaded after restart');if(absenceListing(intent.ref,observed)){completeListings++;await persist({phase:'complete-listing-without-entry',ref:intent.ref,operation});}}
 }catch(cause){blocked??=cause;await route.abort().catch(()=>{});await persist({phase:'read-held',endpoint:url.pathname,error:cause.message}).catch(()=>{});}})();pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;});
 const list=`${base}/content?provider=${encodeURIComponent(intent.ref.providerId)}&model=${encodeURIComponent(intent.ref.modelId)}`,settlement={async beforeAdvance(){await lane.drain();lifecycle.requireSettled();}};
 if(intent.kind==='inspect-present'){
  const model=snapshot.project.providers.content.find(p=>p.id===intent.ref.providerId).models.find(m=>m.id===intent.ref.modelId).document,labels={};for(const[id,value]of Object.entries(intent.record.values))labels[model.fields.find(f=>f.id===id).label]=value;contentFieldPlan(model,labels);
  await page.goto(`${list}&entry=${encodeURIComponent(intent.ref.recordId)}`);await verifyContentFields(page,labels,{model,settlement});await expect.poll(()=>entryReads,{timeout:180000}).toBeGreaterThan(0);
 }else{await page.goto(`${list}&entry=${encodeURIComponent(intent.ref.recordId)}`);await expect.poll(()=>completeListings,{timeout:180000}).toBeGreaterThan(0);await settlement.beforeAdvance();await expect(page.locator('[id="content-entry-page-copy-meta-title"]')).toHaveCount(0);}
 await settlement.beforeAdvance();await page.screenshot({path:join(artifacts,'verified.png'),fullPage:true});
 return()=>({kind:intent.kind,ref:intent.ref,freshBrowser:true,...(intent.kind==='inspect-present'?{entryReads}:{completeListings})});
}
try{
 await persist({phase:'begin',intent});
 if(intent.kind==='create')result=await staticCopyUi(page,{base,snapshot,intent:{route:intent.route,title:intent.title},persist,expect,setClose:close=>{closeContext=close;}});
 else if(intent.kind==='delete')result=await contentDeleteUi(page,{base,snapshot,intent,persist,expect,setClose:close=>{closeContext=close;}});
 else result=await inspect();
}catch(cause){error=cause;await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true,timeout:5000}).catch(()=>{});await persist({phase:'held',error:cause.message});}
finally{try{await closeContext(context);}catch(cause){error??=cause;}await queue;await file.close();}
if(error)throw error;
// Read counts are taken after close so every journaled read, including settlement, is counted.
if(typeof result==='function')result=result();
await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result},null,2),{flag:'wx'});
