import {releaseLifecycle} from './release-lifecycle.mjs';
import {orderedReleaseGate} from './release-queue.mjs';
import {compositionDerivedReadGate} from './composition-output.mjs';
import assert from 'node:assert/strict';
import { releaseProof } from './release-proof.mjs';
import { requestGate, originalResponse, drainAll } from './original-request.mjs';
const key = ref => JSON.stringify([ref.providerId,ref.modelId,ref.recordId]);
/** Called only after exact offline source precondition and an exclusive journal begin. */
export async function publishReviewed(page,{base,snapshot,refs,excluded=[],expectedActive,persist,expect,setClose,proofFactory=releaseProof}) {
  const proof=proofFactory({snapshot,expectedActive,requested:refs.map(ref => ({ref,action:'publish'}))});
  let blocked, activationRequestId, releaseChallenge;
  const composition=compositionDerivedReadGate({page,snapshot,persist});
  page.on('websocket',socket=>{if(new URL(socket.url()).host!==new URL(base).host)return;socket.on('framereceived',({payload})=>{let frame;try{frame=JSON.parse(String(payload));}catch{return;}if(frame.event!=='release:challenge' || frame.data?.payload?.kind!=='reconcile')return;try{assert.equal(frame.data.requestId,activationRequestId);assert.equal(frame.data.operation,'activate');proof.reconcileChallenge(frame.data.payload);releaseChallenge=structuredClone(frame.data.payload);}catch(error){blocked ??=error;}});});
  const refuse=async(route,operation)=>{blocked ??= Error(`Unexpected canonical request ${operation}`);try{await persist({phase:'unexpected-request',operation,endpoint:new URL(route.request().url()).pathname});}finally{await route.abort();}};
  await page.route('**/__zudo*',async route=>{const request=route.request();if(lifecycle.closing&&request.method()!=='GET')return refuse(route,'request-after-close-fence');if(request.method()==='GET')return route.continue();let input;try{input=request.postDataJSON();}catch{}if(new URL(request.url()).pathname==='/__zudo-native-edit' && ['inspect','review','receipt','document-preview'].includes(input?.operation))return route.continue();return refuse(route,input?.operation);});
  const gate=orderedReleaseGate({persist,gate:requestGate({page,persist,decode:(wire,request)=>{assert.equal(wire.clientId,request.headers()['x-zudo-release-client']);assert.equal(wire.requestId,request.headers()['x-zudo-release-request']);assert(wire.clientId && wire.requestId && wire.request);if(wire.request.operation==='activate')activationRequestId=wire.requestId;return wire.request;},validate:input=>{lifecycle.requireOpen();composition.check();if(['plan','apply','build','activate'].includes(input.operation))lifecycle.requireSettled();assert(!blocked,blocked?.message);proof.before(input);},accept:(input,body)=>proof.after(input,body)})});
  const reconcile=requestGate({page,persist:event=>persist({...event,releaseChallenge}),validate:input=>{lifecycle.requireSettled();assert(!blocked,blocked?.message);gate.check();proof.reconcileBefore(input);},accept:(_,body)=>proof.reconcileAfter(body)});
  assert.equal(typeof setClose,'function','Publication needs caller-owned close/drain lifecycle');
  const lifecycle=releaseLifecycle({lanes:[gate,reconcile,composition],composition,blocked:()=>blocked});
  setClose(lifecycle.close);
  await page.route('**/__zudo-release',gate.handle);
  await page.route('**/__zudo_composer_*provider',async route=>{
    const path=new URL(route.request().url()).pathname;if(lifecycle.closing)return refuse(route,'provider-request-after-close-fence');
    if(path==='/__zudo_composer_file_provider')return composition.handle(route);
    const operation=route.request().headers()[path==='/__zudo_composer_asset_file_provider'?'x-zudo-composer-asset-operation':'x-zudo-composer-operation'];
    if(path==='/__zudo_composer_workspace_provider' && operation==='open') {
      try {const response=await originalResponse(page,route);assert.equal(response.status,200);assert(response.body.ok);proof.workspaceRead(response.body.result);await persist({phase:'public-workspace-token',record:response.body.result});}
      catch(error){blocked ??=error;await route.abort().catch(()=>{});}return;
    }
    if(operation==='reconcile-publication' && new URL(route.request().url()).pathname==='/__zudo_composer_content_provider') return reconcile.handle(route);
    // Concrete read-only protocol operations. Unknown operations fail closed.
    if(new Set(['initialize','read-all','list','get','snapshot','selection','generation','find-seeding','missing-directories','list-records','get-record','list-models','get-model','get-entry','count-entries','page-entries','scan-entries','describe','status','editorial-read','editorial-fields','editorial-revisions','editorial-publication']).has(operation)) return route.continue();
    return refuse(route,operation);
  });
  try {
    await page.goto(`${base}/review`);
    await expect(page.getByRole('button',{name:'Inspect current state',exact:true})).toBeEnabled({timeout:180000});
    await page.getByRole('button',{name:'Inspect current state',exact:true}).click();
    await expect.poll(()=>{try{return proof.selection().length;}catch{return -1;}},{timeout:180000}).toBeGreaterThan(0);
    gate.check();
    const desired=new Set(proof.selection().map(x=>key(x.ref))),seen=new Set();
    const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Select Content changes',exact:true})});
    const boxes=section.getByRole('checkbox');
    await expect.poll(()=>boxes.count(),{timeout:180000}).toBeGreaterThan(0);
    for(const box of await boxes.all()) {
      const label=await box.getAttribute('aria-label') ?? await box.evaluate(el=>[...(el.labels??[])].map(x=>x.textContent).join(' '));
      const match=/^(new|changed|deleted|unpublish): ([^ ]+) \/ ([^ ]+) \/ ([^ ]+)$/.exec(label.trim());
      assert(match,`Unknown release choice ${label}`);
      const id=key({providerId:match[2],modelId:match[3],recordId:match[4]});
      assert(!seen.has(id),'Duplicate qualified release checkbox');seen.add(id);
      if(desired.has(id))assert(['new','changed'].includes(match[1]),'Only exact reviewed family publication permitted');
      await box.setChecked(desired.has(id));
      if(excluded.some(ref=>key(ref)===id)){assert(!desired.has(id));assert.equal(await box.isChecked(),false);}
    }
    assert(excluded.every(ref=>seen.has(key(ref))),'Excluded draft must appear as an explicitly unchecked qualified choice');
    assert([...desired].every(id=>seen.has(id)),'Missing exact publication choice');
    for(const name of ['Run release checks','Approve reviewed candidate','Apply / stage exact candidate','Build staged candidate','Activate locally']) {
      composition.check();gate.check();reconcile.check();assert(!blocked,blocked?.message);
      const button=page.getByRole('button',{name,exact:true});await expect(button).toBeEnabled({timeout:180000});
      await drainAll(gate,reconcile);composition.check();gate.check();reconcile.check();assert(!blocked,blocked?.message);
      await persist({phase:'release-ui-intent',name});await button.click();
      await gate.drain();await reconcile.drain();
    }
    await expect(page.getByText(/Activated locally\. Publication reconciliation: applied/)).toBeVisible({timeout:180000});
    await gate.drain();await reconcile.drain();assert(!blocked,blocked?.message);
    await page.getByRole('button',{name:'Review remaining working changes',exact:true}).click();
    await expect(page.getByRole('button',{name:'Inspect current state',exact:true})).toBeEnabled({timeout:180000});
    await page.getByRole('button',{name:'Inspect current state',exact:true}).click();
    await expect.poll(()=>{try{proof.finish();return true;}catch{return false;}},{timeout:180000}).toBe(true);
    await gate.drain();await reconcile.drain();assert(!blocked,blocked?.message);
    const result=proof.finish();await persist({phase:'release-exact-identity',result});return result;
  } finally {
    // Settle both independent admitted lanes even when the first one failed.
    // Rejecting handlers remain installed until the caller closes the browser.
    await drainAll(gate,reconcile,composition);
  }
}
