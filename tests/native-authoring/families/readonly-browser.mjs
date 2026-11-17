import {settleBrowserReads} from '../static/browser-quiescence.mjs';
import {readFrozenBundle,assertInputsUnchanged} from './frozen-inputs.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,open,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {repoRoot} from './config.mjs';
import {originalResponse} from './original-request.mjs';
import {compositionDerivedReadGate} from './composition-output.mjs';
import {releaseLifecycle} from './release-lifecycle.mjs';
import {classifyRead,closingReadAction,busyReadTracker,assertReadScope,validateReadIntent,activeReadback,assertPreviewIdentity,validateHeaderRestart} from './readonly-proof.mjs';
import {verifySavedHeader,verifySavedKnowledge} from '../header/driver.mjs';
import {verifyFamilyRendering} from './verify-render.mjs';
const [bundlePath,bundleHash,artifacts,base] = process.argv.slice(2);
const inputs=await readFrozenBundle(bundlePath,bundleHash);
await assertInputsUnchanged(inputs.hashes);
const intent=inputs.intent;
const snapshot=JSON.parse(await readFile(join(artifacts,'before.json'),'utf8'));
assert.deepEqual(snapshot,inputs.snapshot,'Browser capture differs from frozen accepted input');
validateReadIntent(intent,snapshot);
const file=await open(join(artifacts,'events.ndjson'),'wx');
let queue=Promise.resolve();
const persist=event=>{queue=queue.then(async()=>{await file.writeFile(JSON.stringify({time:new Date().toISOString(),...event})+'\n');await file.sync();});return queue;};
const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');
await mkdir(join(artifacts,'profile'));
const context=await chromium.launchPersistentContext(join(artifacts,'profile'),{headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath(),viewport:{width:1600,height:1050}});
const page=context.pages()[0], pending=new Set(), active=activeReadback(snapshot.project.id);
let blocked,error,result,previewCount=0;
const headerProof=intent.kind==='header-restart'?validateHeaderRestart(snapshot,inputs.headerProof):null;
const composition=compositionDerivedReadGate({page,snapshot,persist});
const busyReads=busyReadTracker();
const lane={async drain(){while(pending.size)await Promise.allSettled([...pending]);if(blocked)throw blocked;busyReads.assertSettled();}};
const lifecycle=releaseLifecycle({lanes:[lane,composition],composition,blocked:()=>blocked});
await context.route('**/*',route=>{
  const work=(async()=>{
    const request=route.request(),url=new URL(request.url());
    try {
      assert(!blocked, 'Read phase held');
      assert.equal(url.origin,base,'External request refused');
      if(request.method()==='GET')return await route.continue();
      assert.equal(request.method(),'POST');
      const body=request.postDataJSON(),kind=classifyRead(url.pathname,request.headers(),body,snapshot.workspaceId);
      if(lifecycle.closing){
        const action=closingReadAction(url.pathname,request.headers(),body,snapshot.workspaceId);
        if(action==='settle-composition')return await composition.handle(route);
        await persist({phase:'read-aborted-at-close',endpoint:url.pathname,input:body,operation:request.headers()['x-zudo-composer-operation']??request.headers()['x-zudo-composer-asset-operation']??body?.operation??body?.request?.operation});
        return await route.abort();
      }
      lifecycle.requireOpen();
      if(kind==='composition')return await composition.handle(route);
      await persist({phase:'read-before-dispatch',endpoint:url.pathname,input:body});
      const response=await originalResponse(page,route);
      await persist({phase:'read-response',endpoint:url.pathname,input:body,...response});
      if(busyReads.observe(url.pathname,request.headers(),body,response,snapshot.workspaceId)){
        await persist({phase:'read-busy-awaiting-client-retry',endpoint:url.pathname,input:body,operation:request.headers()['x-zudo-composer-operation']});
        return; // Original409 already delivered; only installed client may retry.
      }
      assertReadScope(url.pathname,request.headers(),response.body.result,snapshot.workspaceId);
      if(kind==='native' && body.operation==='document-preview'){assertPreviewIdentity(snapshot,response.body.result);previewCount++;}
      if(kind==='release' && intent.kind==='active-identity')active.observe(body.request,response.body.result);
    } catch(cause) {blocked??=cause;await route.abort().catch(()=>{});await persist({phase:'read-held',endpoint:url.pathname,error:cause.message}).catch(()=>{});}
  })();pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;
});
try {
  await persist({phase:'begin',intent});
  if(intent.kind==='family-render') {
    await verifyFamilyRendering(page,{base,kind:intent.family,marker:intent.marker,childText:intent.childText,present:intent.present,oldFragment:intent.oldFragment,expect});
    result={kind:intent.kind,family:intent.family,present:intent.present};
  } else if(intent.kind==='header-restart') {
    const shot=name=>page.screenshot({path:join(artifacts,name+'.png'),fullPage:true});
    const options={base,snapshot,intent:headerProof.intent,record:headerProof.result.record,expect,shot,navigation:async boundary=>{await settleBrowserReads(page,composition,{persist,boundary,check:()=>{lifecycle.requireOpen();if(blocked)throw blocked;}});await lane.drain();composition.check();composition.assertSettled();}};
    if(headerProof.intent.kind==='knowledge-reference')await verifySavedKnowledge(page,options);else await verifySavedHeader(page,options);
    result={kind:intent.kind,forwardProofPath:intent.forwardProofPath};
  } else {
    await page.goto(`${base}/review`);
    const inspect=page.getByRole('button',{name:'Inspect current state',exact:true});
    await expect(inspect).toBeEnabled({timeout:180000});await inspect.click();
    await expect.poll(()=>{try{active.finish();return true;}catch{return false;}},{timeout:180000}).toBe(true);
    result={kind:intent.kind,active:active.finish()};
  }
  await page.screenshot({path:join(artifacts,'verified.png'),fullPage:true});
} catch(cause) {error=cause;await persist({phase:'held',error:cause.message});}
finally {try{await lifecycle.close(context);}catch(cause){error??=cause;}await queue;await file.close();}
if(error)throw error;
await assertInputsUnchanged(inputs.hashes);
await readFrozenBundle(bundlePath,bundleHash);
if(intent.kind!=='active-identity')assert(previewCount>0,'Exact captured host preview response required');
await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result},null,2),{flag:'wx'});
