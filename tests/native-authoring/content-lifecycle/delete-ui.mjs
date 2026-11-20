import {contentPreviewOperations,contentPreviewReadGate,isNativeRead} from '../native-preview-reads.mjs';
import {navigationBoundary,closeAfterNavigation} from '../static/navigation-boundary.mjs';
import {waitForCompositionReadiness} from '../static/composition-readiness.mjs';
import {assertRequestWorkspace} from '../static/workspace-guard.mjs';
import {compositionDerivedReadGate} from '../static/composition-output.mjs';
import {requestGate,drainAll} from '../families/original-request.mjs';
import {contentReadOperations} from '../content-browser-transport.mjs';
import assert from 'node:assert/strict';
import {assertDeleteRequest,assertDeleteResponse,findEntry} from './lifecycle.mjs';
const providerReads=new Set(['initialize','list','get','open','selection','generation','snapshot','read-all','find-seeding','missing-directories']);
/** Delete exactly one draft through the installed overflow menu and its confirm dialog. One transact, journaled before dispatch. */
export async function contentDeleteUi(page,{base,snapshot,intent,persist,expect,setClose}){
 const {ref}=intent;const record=findEntry(snapshot,ref);assert(record&&record.lifecycle==='draft','Only an existing draft is deleted');
 const nativeReads=contentPreviewReadGate({page,snapshot,persist}),composition=compositionDerivedReadGate({page,snapshot,persist});let attempted=false,committed=false,closing=false,held,response;
 const gate=requestGate({page,persist,validate:(input,request)=>{nativeReads.check();composition.check();assertRequestWorkspace(snapshot,request);assert(!attempted&&!closing&&!held,'Only one delete transact');assertDeleteRequest(request.headers()['x-zudo-composer-operation'],input,{ref,before:snapshot});attempted=true;},accept:(_,body)=>{response={status:200,body};assertDeleteResponse(response,{ref,before:snapshot});committed=true;}});
 const pendingAdmissions=new Set(),admissions={async drain(){while(pendingAdmissions.size)await Promise.allSettled([...pendingAdmissions]);assert(!held,held?.message);}};
 const navigation=navigationBoundary({page,composition,lanes:[nativeReads,gate,admissions],persist,check:()=>{assert(!held&&!closing,held?.message);gate.check();nativeReads.check();}});
 setClose(closeAfterNavigation(navigation,async ctx=>{closing=true;let failure;for(const action of [()=>drainAll(nativeReads,gate,composition,admissions),()=>ctx.close(),()=>drainAll(nativeReads,gate,composition,admissions),()=>{composition.assertSettled();assert(!held,held?.message);}]){try{await action();}catch(error){failure??=error;}}if(failure)throw failure;}));
 await page.route('**/__zudo*',async route=>{const req=route.request(),path=new URL(req.url()).pathname;let input;try{input=req.postDataJSON();}catch{}const op=req.headers()['x-zudo-composer-operation']??req.headers()['x-zudo-composer-asset-operation']??input?.operation;
  if(path==='/__zudo-native-edit'&&contentPreviewOperations.has(input?.operation))return nativeReads.handle(route);
  if(req.method()==='GET')return route.continue();if(path==='/__zudo_composer_file_provider')return composition.handle(route);
  if(path==='/__zudo_composer_content_provider'){if(contentReadOperations.has(op))return route.continue();const work=(async()=>{try{await waitForCompositionReadiness(composition);assert(!held&&!closing);await gate.handle(route);}catch(error){held??=error;await persist({phase:'delete-admission-held',operation:op,error:error.message}).catch(()=>{});await route.abort().catch(()=>{});}})();pendingAdmissions.add(work);work.finally(()=>pendingAdmissions.delete(work)).catch(()=>{});return work;}
  if((/^\/__zudo_composer_.*provider$/.test(path)&&providerReads.has(op))||isNativeRead(path,input,snapshot.workspaceId))return route.continue();
  held??=Error(`Unexpected ${path} ${op}`);try{await persist({phase:'held',path,operation:op});}finally{await route.abort();}
 });
 const list=`${base}/content?provider=${encodeURIComponent(ref.providerId)}&model=${encodeURIComponent(ref.modelId)}`;
 await page.goto(`${list}&entry=${encodeURIComponent(ref.recordId)}`);await expect(page.locator('[id="content-entry-page-copy-meta-title"]')).toHaveValue(record.values['page-copy-meta-title'],{timeout:180000});
 await navigation('before-delete-dialog');const more=page.getByRole('button',{name:'More Content actions',exact:true});await expect(more).toBeEnabled({timeout:180000});await more.click();
 const item=page.getByRole('menuitem',{name:'Delete entry…',exact:true});await expect(item).toBeEnabled({timeout:180000});await item.click();
 const dialog=page.getByRole('alertdialog',{name:'Delete entry?',exact:true});await expect(dialog).toBeVisible({timeout:180000});const confirm=dialog.getByRole('button',{name:'Delete',exact:true});await expect(confirm).toBeEnabled();
 await waitForCompositionReadiness(composition);assert(!held&&!attempted);await persist({phase:'delete-confirm-before-click',ref,expectedMutationToken:snapshot.tokens.content});await confirm.click();
 await expect.poll(()=>committed||!!held,{timeout:180000}).toBe(true);await drainAll(nativeReads,gate,composition,admissions);assert(!held,held?.message);assert(committed);
 await persist({phase:'delete-acknowledged',ref,response});
 await navigation('before-delete-reload');await page.goto(list);await navigation('after-delete-reload');
 await expect(page.getByText(record.values['page-copy-meta-title'],{exact:true})).toHaveCount(0,{timeout:180000});await navigation('after-delete-absence');await drainAll(nativeReads,gate,composition,admissions);assert(!held,held?.message);
 return{kind:'delete',ref,status:200,mutationToken:response.body.result.mutationToken};
}
