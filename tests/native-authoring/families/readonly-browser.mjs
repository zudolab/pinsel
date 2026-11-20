import {validatePinsDiagnostic,observePinsDiagnostic} from './pins-diagnostic.mjs';
import {validateSavedBinding} from './binding-recovery.mjs';
import {validateSavedHref,savedHrefReadback} from '../header/saved-href.mjs';
import {validateBindingDiagnostic,observeBindingDiagnostic} from './binding-diagnostic.mjs';
import {validateSavedMapping} from './mapping-recovery.mjs';
import {familyRecordReadback,assertSelectedEditorSaved} from './structural-readback.mjs';
import {contentPreviewOperations,assertContentPreviewResponse} from '../native-preview-reads.mjs';
import {validateSavedReference,validateCapturedReference} from '../header/saved-reference.mjs';
import {settleTerminalReads,observeRequestDiagnostics} from '../header/terminal-settlement.mjs';
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
import {requiresCapturedHostPreview,classifyRead,closingReadAction,busyReadTracker,assertReadScope,validateReadIntent,activeReadback,assertPreviewIdentity,validateHeaderRestart} from './readonly-proof.mjs';
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
let blocked,error,result,previewCount=0,readEpoch=0,originalPending=0,terminalClosing=false;const previewPaths=new Set();
const diagnostics=observeRequestDiagnostics(page,persist);
const recovered=intent.kind==='header-saved-href'?validateSavedHref(snapshot,inputs.savedReference):intent.kind==='knowledge-saved-reference'?validateSavedReference(snapshot,inputs.savedReference):intent.kind==='knowledge-captured-reference'?validateCapturedReference(snapshot,inputs.savedReference):null;
const hrefReads=intent.kind==='header-saved-href'?savedHrefReadback(recovered):null;
const savedMapping=intent.kind==='mapping-saved-create'?validateSavedMapping(snapshot,inputs.savedReference):intent.kind==='mapping-saved-binding'?validateSavedBinding(snapshot,inputs.savedReference):null;
const mappingReadback=savedMapping?familyRecordReadback({page,domain:'mappings',workspaceId:snapshot.workspaceId,providerId:'mapping-filesystem',persist}):null;
const headerProof=intent.kind==='header-restart'?validateHeaderRestart(snapshot,inputs.headerProof):null;
const composition=compositionDerivedReadGate({page,snapshot,persist});
const busyReads=busyReadTracker();
const lane={async drain(){while(pending.size)await Promise.allSettled([...pending]);if(blocked)throw blocked;busyReads.assertSettled();}};
const lifecycle=releaseLifecycle({lanes:[lane,composition,...(mappingReadback?[mappingReadback]:[])],composition,blocked:()=>blocked});
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
      if(hrefReads&&url.pathname==='/__zudo_composer_content_provider')hrefReads.admit(request.headers()['x-zudo-composer-operation'],body);
      await persist({phase:'read-before-dispatch',endpoint:url.pathname,input:body});
      const response=await originalResponse(page,route);
      await persist({phase:'read-response',endpoint:url.pathname,input:body,...response});
      if(busyReads.observe(url.pathname,request.headers(),body,response,snapshot.workspaceId)){
        await persist({phase:'read-busy-awaiting-client-retry',endpoint:url.pathname,input:body,operation:request.headers()['x-zudo-composer-operation']});
        return; // Original409 already delivered; only installed client may retry.
      }
      if(hrefReads&&url.pathname==='/__zudo_composer_content_provider')hrefReads.observe(request.headers()['x-zudo-composer-operation'],body,response);
      assertReadScope(url.pathname,request.headers(),response.body.result,snapshot.workspaceId);
      if(kind==='native'&&contentPreviewOperations.has(body.operation))assertContentPreviewResponse(body,response,snapshot,{revision:snapshot.digest});
      if(kind==='native' && body.operation==='document-preview'){assertPreviewIdentity(snapshot,response.body.result);previewCount++;previewPaths.add(response.body.result.identity.pathname);}
      if(kind==='release' && intent.kind==='active-identity')active.observe(body.request,response.body.result);
    } catch(cause) {blocked??=cause;await route.abort().catch(()=>{});await persist({phase:'read-held',endpoint:url.pathname,error:cause.message}).catch(()=>{});}finally{if(admitted)originalPending--;}
  })();pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;
});
try {
  await persist({phase:'begin',intent});
  if(['mapping-binding-diagnostic','mapping-pins-diagnostic'].includes(intent.kind)){
    const pins=intent.kind==='mapping-pins-diagnostic';
    const record=(pins?validatePinsDiagnostic:validateBindingDiagnostic)(intent,snapshot),ref=intent.owner;
    await page.goto(`${base}/mapping?provider=${encodeURIComponent(ref.providerId)}&mapping=${encodeURIComponent(ref.recordId)}`,{waitUntil:'commit'});
    const target=pins?null:page.getByRole('button',{name:`Bind ${intent.title}.${intent.target.prop} on ${intent.target.nodeId}`,exact:true});
    result=await (pins?observePinsDiagnostic:observeBindingDiagnostic)({page,ref,record,target,composition,persist,check:()=>{lifecycle.requireOpen();if(blocked)throw blocked;}});
    await writeFile(join(artifacts,'diagnostic-dom.html'),await page.content(),{flag:'wx'});
    await page.screenshot({path:join(artifacts,'diagnostic.png'),fullPage:true});
    await persist({phase:pins?'mapping-pins-diagnostic-result':'mapping-binding-diagnostic-result',result,pendingRequests:diagnostics.snapshot()});
    await settleTerminalReads({fence:async()=>{terminalClosing=true;await persist({phase:'terminal-read-admission-fenced'});},status:()=>({pending:originalPending+composition.readiness.pending,challenges:composition.readiness.outstanding,busy:busyReads.outstanding,epoch:readEpoch}),check:()=>{lifecycle.requireOpen();composition.check();if(blocked)throw blocked;},drain:async()=>{await lane.drain();await composition.drain();composition.assertSettled();},persist,diagnostics:diagnostics.snapshot});
  } else if(savedMapping){
    const record=savedMapping.result.record,ref={providerId:'mapping-filesystem',recordId:record.id};
    await page.goto(`${base}/mapping?provider=${encodeURIComponent(ref.providerId)}&mapping=${encodeURIComponent(ref.recordId)}`);
    await assertSelectedEditorSaved({page,expect,domain:'mappings',ref,record});
    await settleBrowserReads(page,composition,{persist,boundary:'before-recovered-mapping-reload',check:()=>{lifecycle.requireOpen();if(blocked)throw blocked;mappingReadback.check();}});await lane.drain();
    mappingReadback.beginReload({ref,record});const response=await page.reload({waitUntil:'commit'});mappingReadback.documentCommitted(response);
    await expect.poll(()=>mappingReadback.verified,{timeout:180000}).toBe(true);
    await assertSelectedEditorSaved({page,expect,domain:'mappings',ref,record});
    await settleTerminalReads({fence:async()=>{terminalClosing=true;await persist({phase:'terminal-read-admission-fenced'});},status:()=>({pending:originalPending+composition.readiness.pending,challenges:composition.readiness.outstanding,busy:busyReads.outstanding,epoch:readEpoch}),check:()=>{lifecycle.requireOpen();composition.check();mappingReadback.check();if(blocked)throw blocked;},drain:async()=>{await lane.drain();await composition.drain();await mappingReadback.drain();composition.assertSettled();},persist,diagnostics:diagnostics.snapshot});
    result={kind:intent.kind,savedMapping,publicRecordVerified:true};
  } else if(intent.kind==='family-render') {
    await verifyFamilyRendering(page,{base,kind:intent.family,marker:intent.marker,childText:intent.childText,present:intent.present,oldFragment:intent.oldFragment,snapshot,family:intent.orderFamily,secondChild:intent.secondChild,expect});
    result={kind:intent.kind,family:intent.family,present:intent.present};
  } else if(intent.kind==='header-restart'||recovered) {
    const shot=name=>page.screenshot({path:join(artifacts,name+'.png'),fullPage:true});
    const accepted=recovered??headerProof;
    let publicHistory,targetPreview;
    if(hrefReads){const ref=accepted.result.ref;await page.goto(`${base}/content?provider=${encodeURIComponent(ref.providerId)}&model=${encodeURIComponent(ref.modelId)}&entry=${encodeURIComponent(ref.recordId)}`);await expect.poll(()=>{try{hrefReads.finish();return true;}catch{return false;}},{timeout:180000}).toBe(true);publicHistory=hrefReads.finish();await expect(page.locator(`[data-history-entry="${ref.recordId}"] [data-revision-id="${publicHistory.history.revisions[0].id}"]`)).toHaveCount(1);await persist({phase:'saved-href-public-history-verified',publicHistory});}
    const options={base,snapshot,intent:accepted.intent,record:accepted.result.record,expect,shot,navigation:async boundary=>{
      if(recovered&&(boundary==='after-knowledge-preview'||(hrefReads&&boundary==='after-header-preview'))){
        if(hrefReads){assert([...previewPaths].some(path=>path.replace(/\/$/,'')===accepted.intent.value.replace(/\/$/,'')),'Exact Header target preview required');}else{
        const note=snapshot.project.providers.content.find(p=>p.id===accepted.intent.value.providerId).entries.find(e=>e.id===accepted.intent.value.recordId&&e.modelId==='note');
        const target='/notes/'+note.values['note-slug'];assert([...previewPaths].some(path=>path.replace(/\/$/,'')===target),'Exact target preview response required');}
        return settleTerminalReads({fence:async()=>{terminalClosing=true;await persist({phase:'terminal-read-admission-fenced'});},status:()=>({pending:originalPending+composition.readiness.pending,challenges:composition.readiness.outstanding,busy:busyReads.outstanding,epoch:readEpoch}),check:()=>{lifecycle.requireOpen();composition.check();if(blocked)throw blocked;},drain:async()=>{await lane.drain();await composition.drain();composition.assertSettled();},persist,diagnostics:diagnostics.snapshot});
      }await settleBrowserReads(page,composition,{persist,boundary,check:()=>{lifecycle.requireOpen();if(blocked)throw blocked;}});await lane.drain();composition.check();composition.assertSettled();}};
    if(accepted.intent.kind==='knowledge-reference')await verifySavedKnowledge(page,options);else targetPreview=await verifySavedHeader(page,options);
    result=recovered?{kind:intent.kind,savedWrite:recovered,...(hrefReads?{publicHistory,targetPreview}:{}),terminalSettlement:'AUTHORITATIVE_READS_AND_CLOSE_FENCE'}:{kind:intent.kind,forwardProofPath:intent.forwardProofPath};
  } else {
    await page.goto(`${base}/review`);
    const inspect=page.getByRole('button',{name:'Inspect current state',exact:true});
    await expect(inspect).toBeEnabled({timeout:180000});await inspect.click();
    await expect.poll(()=>{try{active.finish();return true;}catch{return false;}},{timeout:180000}).toBe(true);
    result={kind:intent.kind,active:active.finish()};
  }
  await page.screenshot({path:join(artifacts,'verified.png'),fullPage:true});
} catch(cause) {error=cause;await persist({phase:'held',error:cause.message,pendingRequests:diagnostics.snapshot(),composition:composition.readiness});}
finally {try{await lifecycle.close(context);}catch(cause){error??=cause;}mappingReadback?.dispose();diagnostics.dispose();await queue;await file.close();}
if(error)throw error;
await assertInputsUnchanged(inputs.hashes);
await readFrozenBundle(bundlePath,bundleHash);
if(requiresCapturedHostPreview(intent.kind))assert(previewCount>0,'Exact captured host preview response required');
await writeFile(join(artifacts,'ui-result.json'),JSON.stringify({result},null,2),{flag:'wx'});
