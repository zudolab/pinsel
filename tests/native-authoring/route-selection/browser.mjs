import assert from 'node:assert/strict';
import {readFile,writeFile,open,mkdir} from 'node:fs/promises';import {join} from 'node:path';import {createRequire} from 'node:module';
import {repoRoot} from '../families/config.mjs';import {readFrozenBundle,assertInputsUnchanged} from '../families/frozen-inputs.mjs';
import {originalResponse} from '../families/original-request.mjs';import {compositionDerivedReadGate} from '../families/composition-output.mjs';import {releaseLifecycle} from '../families/release-lifecycle.mjs';
import {classifyRead,closingReadAction,busyReadTracker,assertReadScope,assertPreviewIdentity} from '../families/readonly-proof.mjs';
import {contentPreviewOperations,assertContentPreviewResponse} from '../native-preview-reads.mjs';
import {settleTerminalReads,observeRequestDiagnostics} from '../header/terminal-settlement.mjs';
import {validateIntent,assertPreview} from './proof.mjs';import {verifyRouteSelection} from './ui.mjs';
const [bundlePath,bundleHash,artifacts,base]=process.argv.slice(2),inputs=await readFrozenBundle(bundlePath,bundleHash);await assertInputsUnchanged(inputs.hashes);const {intent,snapshot}=inputs;validateIntent(intent,snapshot);assert.deepEqual(JSON.parse(await readFile(join(artifacts,'before.json'),'utf8')),snapshot);
const file=await open(join(artifacts,'events.ndjson'),'wx');let queue=Promise.resolve();const persist=e=>{queue=queue.then(async()=>{await file.writeFile(JSON.stringify({time:new Date().toISOString(),...e})+'\n');await file.sync();});return queue;};
const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');await mkdir(join(artifacts,'profile'));const context=await chromium.launchPersistentContext(join(artifacts,'profile'),{headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath(),viewport:{width:1600,height:1050}}),page=context.pages()[0];
let blocked,error,result,preview,readEpoch=0,originalPending=0,terminalClosing=false;const pending=new Set(),diagnostics=observeRequestDiagnostics(page,persist),composition=compositionDerivedReadGate({page,snapshot,persist}),busyReads=busyReadTracker();
const lane={async drain(){while(pending.size)await Promise.allSettled([...pending]);if(blocked)throw blocked;busyReads.assertSettled();}};const lifecycle=releaseLifecycle({lanes:[lane,composition],composition,blocked:()=>blocked});
page.on('pageerror',cause=>{blocked??=cause;void persist({phase:'page-error',error:cause.message}).catch(()=>{});});
await context.route('**/*',route=>{
  const work=(async()=>{
    const request=route.request(),url=new URL(request.url());let admitted=false;
    try {
      assert(!blocked, 'Read phase held');
      assert.equal(url.origin,base,'External request refused');
      if(request.method()==='GET')return await route.continue();
      assert.equal(request.method(),'POST');
      const body=request.postDataJSON(),kind=classifyRead(url.pathname,request.headers(),body,snapshot.workspaceId);
      if(lifecycle.closing||terminalClosing){
        const retry=terminalClosing&&!lifecycle.closing&&(kind==='provider'||(kind==='native'&&contentPreviewOperations.has(body.operation)))&&busyReads.claimRetry(url.pathname,request.headers(),body);
        if(!retry){
        const action=closingReadAction(url.pathname,request.headers(),body,snapshot.workspaceId);
        if(action==='settle-composition'){readEpoch++;originalPending++;admitted=true;return await composition.handle(route);}
        await persist({phase:'read-aborted-at-close',endpoint:url.pathname,input:body,operation:request.headers()['x-zudo-composer-operation']??request.headers()['x-zudo-composer-asset-operation']??body?.operation??body?.request?.operation});
        return await route.abort();
        }
        await persist({phase:'terminal-existing-busy-retry',endpoint:url.pathname,input:body});
      }
      lifecycle.requireOpen();readEpoch++;originalPending++;admitted=true;
      if(kind==='composition')return await composition.handle(route);
      await persist({phase:'read-before-dispatch',endpoint:url.pathname,input:body});
      const response=await originalResponse(page,route);
      await persist({phase:'read-response',endpoint:url.pathname,input:body,...response});
      if(busyReads.observe(url.pathname,request.headers(),body,response,snapshot.workspaceId)){
        await persist({phase:'read-busy-awaiting-client-retry',endpoint:url.pathname,input:body,operation:request.headers()['x-zudo-composer-operation']});
        return; // Original409 already delivered; only installed client may retry.
      }
      assertReadScope(url.pathname,request.headers(),response.body.result,snapshot.workspaceId);
      if(kind==='native'&&contentPreviewOperations.has(body.operation))assertContentPreviewResponse(body,response,snapshot,{revision:snapshot.digest});
      if(kind==='native' && body.operation==='document-preview'){assertPreviewIdentity(snapshot,response.body.result);assertPreview(snapshot,intent,response.body.result);preview=response.body.result;}

    } catch(cause) {blocked??=cause;await route.abort().catch(()=>{});await persist({phase:'read-held',endpoint:url.pathname,error:cause.message}).catch(()=>{});}finally{if(admitted)originalPending--;}
  })();pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;
});
try{
 await persist({phase:'begin',intent});
 result=await verifyRouteSelection(page,{base,snapshot,intent,expect,getPreview:()=>{if(blocked)throw blocked;return preview;},persist,shot:name=>page.screenshot({path:join(artifacts,name+'.png'),fullPage:true})});
 await settleTerminalReads({fence:async()=>{terminalClosing=true;await persist({phase:'terminal-read-admission-fenced'});},status:()=>({pending:originalPending+composition.readiness.pending,challenges:composition.readiness.outstanding,busy:busyReads.outstanding,epoch:readEpoch}),check:()=>{lifecycle.requireOpen();composition.check();if(blocked)throw blocked;},drain:async()=>{await lane.drain();await composition.drain();composition.assertSettled();},persist,diagnostics:diagnostics.snapshot});
}catch(cause){error=cause;await persist({phase:'held',error:cause.message,pendingRequests:diagnostics.snapshot(),composition:composition.readiness});}
finally{try{await lifecycle.close(context);}catch(cause){error??=cause;await persist({phase:'close-held',error:cause.message});}diagnostics.dispose();await queue;await file.close();}
if(error)throw error;assert(result);await assertInputsUnchanged(inputs.hashes);await readFrozenBundle(bundlePath,bundleHash);await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result},null,2),{flag:'wx'});
