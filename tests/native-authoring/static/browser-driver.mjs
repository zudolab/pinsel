import {navigationBoundary,closeAfterNavigation} from './navigation-boundary.mjs';
import {publicRecordReadback,assertSelectedEditorSaved} from './public-record-readback.mjs';
import {settleBrowserReads} from './browser-quiescence.mjs';
import {waitForCompositionReadiness} from './composition-readiness.mjs';
import assert from 'node:assert/strict';
import {requestGate,drainAll} from '../families/original-request.mjs';
import {compositionAuthoringGate} from './composition-authoring.mjs';
import {compositionDerivedReadGate} from './composition-output.mjs';
import {record,page as findPage,admitCompositionCreate,admitSectionRoot,admitPageCreate,admitPageField,admitReparent,admitNavigation,admitNavigationField,admitSectionTitle} from './intents.mjs';
/** One persisted operation per phase. Intent contains exact public-snapshot identities. */
export async function staticUi(page,{base,snapshot,intent,persist,expect,setClose}){
 let result,held,attempted=false,closing=false;
 const isComposition=['composition-create','section-root','section-title'].includes(intent.kind),domain=isComposition?'compositions':'sitemaps';
 const owner=intent.kind==='composition-create'?null:record(snapshot,domain,intent.owner);
 const endpoint=isComposition?'/__zudo_composer_file_provider':'/__zudo_composer_sitemapper_provider';
 const providers=snapshot.project.providers[domain];assert.equal(providers.length,1,'Native endpoint must resolve one qualified provider');const providerId=providers[0].id;const readback=publicRecordReadback({page,domain,workspaceId:snapshot.workspaceId,providerId,persist});
 const assertSaved=()=>assertSelectedEditorSaved({page,expect,domain,ref:{providerId,recordId:result.id},record:result});
 const validate=(input,request)=>{
   assert(!held&&!closing);assert(!attempted,'Only one canonical operation per phase');
   assert.equal(new URL(request.url()).pathname,endpoint);assert.equal(request.headers()['x-zudo-composer-workspace'],snapshot.workspaceId);
   assert.equal(isComposition?input.operation:request.headers()['x-zudo-composer-operation'],'put');
   let value;
   switch(intent.kind){
    case 'composition-create':value=admitCompositionCreate(snapshot,input,intent.name);break;
    case 'section-root':value=admitSectionRoot(owner,input);break;
    case 'section-title':value=admitSectionTitle(owner,input,intent.value);break;
    case 'page-create':value=admitPageCreate(owner,input,intent.parentId).record;break;
    case 'page-title':value=admitPageField(owner,input,intent.pageId,'title',intent.value);break;
    case 'page-slug':value=admitPageField(owner,input,intent.pageId,'slug',intent.value);break;
    case 'page-source':record(snapshot,'compositions',intent.source);value=admitPageField(owner,input,intent.pageId,'source',{kind:'composition',ref:intent.source});break;
    case 'reparent':value=admitReparent(owner,input,intent.pageId,intent.fromParentId,intent.toParentId);break;
    case 'navigation-add':value=admitNavigation(owner,input,intent.destinationId,intent.label);break;
    case 'navigation-label':value=admitNavigationField(owner,input,intent.itemId,'label',intent.value);break;
    case 'navigation-target':value=admitNavigationField(owner,input,intent.itemId,'destination',{kind:'route',nodeId:intent.pageId});break;
    default:throw Error('Unsupported static phase');
   }
   result=structuredClone(value);attempted=true;
 };
 const gate=isComposition?compositionAuthoringGate({page,snapshot,persist,admit:(input,request)=>{validate(input,request);return result;},accept:()=>{}}):requestGate({page,persist,validate,accept:(_,body)=>assert.equal(body.ok,true)});
 const composition=isComposition?gate:compositionDerivedReadGate({page,snapshot,persist});
 const navigation=navigationBoundary({page,composition,lanes:[gate,readback],persist,check:()=>{assert(!held&&!closing,held?.message);gate.check();readback.check();}});
 setClose(closeAfterNavigation(navigation,async ctx=>{closing=true;let failure;try{await drainAll(gate,composition,readback);}catch(error){failure=error;}try{await ctx.close();}catch(error){failure??=error;}try{await drainAll(gate,composition,readback);assert(!held,held?.message);}catch(error){failure??=error;}finally{readback.dispose();}if(failure)throw failure;}));
 await page.route('**/__zudo*',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let input;try{input=req.postDataJSON();}catch{}
  const op=req.headers()['x-zudo-composer-operation']??req.headers()['x-zudo-composer-asset-operation']??input?.operation;
  if(req.method()==='GET')return route.continue();
  if(path==='/__zudo_composer_file_provider')return composition.handle(route);
  if(path===endpoint&&['put','save-lifecycle-record'].includes(op))return gate.handle(route);
  const nativeRead=path==='/__zudo-native-edit'&&['inspect','document-preview','review','receipt'].includes(op);
  const providerRead=/^\/__zudo_composer_.*provider$/.test(path)&&new Set(['initialize','list','get','open','selection','generation','snapshot','read-all','list-models','get-model','get-entry','count-entries','page-entries','scan-entries','find-seeding','missing-directories']).has(op);
  if(nativeRead||providerRead)return route.continue();
  held=Error(`Unexpected ${path} ${op}`);try{await persist({phase:'held',path,operation:op});}finally{await route.abort();}
 });
 const save=async()=>{const button=page.getByRole('button',{name:'Save',exact:true});if(await button.count()===1&&await button.isEnabled()){await waitForCompositionReadiness(composition);assert(!held&&!closing);await button.click();}};
 try{
  if(intent.kind==='composition-create'){
   await page.goto(`${base}/composer?new=1`);const dialog=page.getByRole('dialog',{name:'New composition',exact:true});await dialog.getByLabel('Name',{exact:true}).fill(intent.name);await expect(dialog.getByRole('searchbox',{name:'Search Global templates',exact:true})).toBeEnabled({timeout:180000});const create=dialog.getByRole('button',{name:'Create composition',exact:true});await expect(create).toBeEnabled({timeout:180000});await waitForCompositionReadiness(gate);assert(!held&&!closing);await persist({phase:'composition-create-ready',readiness:gate.readiness});await create.click();
  }else if(intent.kind==='section-title'){await page.goto(`${base}/composer?provider=${encodeURIComponent(intent.owner.providerId)}&composition=${encodeURIComponent(intent.owner.recordId)}`);const sectionRow=page.getByRole('treeitem').filter({hasText:'Section'}).first();await sectionRow.waitFor({state:'visible',timeout:180000});await sectionRow.click();const control=page.getByLabel('見出し',{exact:true});await expect(control).toBeEnabled({timeout:180000});await waitForCompositionReadiness(composition);assert(!held&&!closing);await control.fill(intent.value);await control.press('Tab');await save();
  }else if(intent.kind==='section-root'){
   await page.goto(`${base}/composer?provider=${encodeURIComponent(intent.owner.providerId)}&composition=${encodeURIComponent(intent.owner.recordId)}`);const add=page.getByRole('button',{name:'Add component to the document',exact:true});await expect(add).toBeEnabled({timeout:180000});await page.getByRole('treeitem').first().hover();await expect(add.locator('..')).toHaveCSS('opacity','1');await waitForCompositionReadiness(composition);assert(!held&&!closing);await add.click();const section=page.getByRole('button',{name:'Section',exact:true});await expect(section).toBeEnabled({timeout:180000});await waitForCompositionReadiness(composition);assert(!held&&!closing);await section.click();await save();
  }else{
   const selected=intent.kind==='page-create'?intent.parentId:intent.pageId??owner.document.root[0].id;
   await page.goto(`${base}/sitemapper?provider=${encodeURIComponent(intent.owner.providerId)}&sitemap=${encodeURIComponent(intent.owner.recordId)}&page=${encodeURIComponent(selected)}`);
   if(intent.kind==='page-create'){assert.equal(intent.parentId,owner.document.root[0].id,'Reviewed creation parent is the actual root');const add=page.getByRole('button',{name:`Add child page to ${findPage(owner.document,intent.parentId).title}`,exact:true});await expect(add).toBeEnabled({timeout:180000});await page.getByRole('treeitem').first().hover();await expect(add.locator('..')).toHaveCSS('opacity','1');await waitForCompositionReadiness(composition);assert(!held&&!closing);await add.click();}
   else if(intent.kind==='page-title'||intent.kind==='page-slug'){const control=page.getByLabel(intent.kind==='page-title'?'Title':'Slug',{exact:true});await expect(control).toBeEnabled({timeout:180000});await waitForCompositionReadiness(composition);assert(!held&&!closing);await control.fill(intent.value);await control.press('Tab');}
   else if(intent.kind==='page-source'){
    const source=record(snapshot,'compositions',intent.source);assert.equal(snapshot.project.providers.compositions.flatMap(p=>p.records).filter(r=>r.document.name===source.document.name).length,1,'Picker must resolve unique name; request still validates qualified ref');
    await page.getByRole('tab',{name:'Source',exact:true}).click();await page.getByRole('radiogroup',{name:'Page source type',exact:true}).getByRole('radio',{name:'Composition',exact:true}).click();await page.getByRole('button',{name:'Choose composition…',exact:true}).click();const row=page.getByRole('dialog',{name:'Choose a composition',exact:true}).getByRole('listitem').filter({has:page.getByText(source.document.name,{exact:true})});await expect(row).toHaveCount(1,{timeout:180000});await row.getByRole('button',{name:/^Assign /}).click();
   }else if(intent.kind==='reparent'){await expect(page.getByLabel('Parent',{exact:true})).toHaveValue(intent.fromParentId,{timeout:180000});await page.getByLabel('Parent',{exact:true}).selectOption(intent.toParentId);}
   else{
    await page.getByRole('radiogroup',{name:'View',exact:true}).getByRole('radio',{name:'Navigation',exact:true}).click();const menuHeading=page.getByRole('heading').filter({has:page.getByText('Primary menu',{exact:true})});await expect(menuHeading).toHaveCount(1,{timeout:180000});const menu=menuHeading.locator('xpath=parent::section');await expect(menu).toHaveCount(1,{timeout:180000});
    if(intent.kind==='navigation-add'){const addRoute=menu.getByRole('button',{name:'Add route',exact:true});await expect(addRoute).toBeEnabled({timeout:180000});await addRoute.click();}
    else{const item=owner.document.navigation.primary.find(i=>i.id===intent.itemId);assert(item);assert.equal(owner.document.navigation.primary.filter(i=>i.label===item.label).length,1);
     // Index comes from exact persisted item identity/order; request validates unchanged siblings.
     const target=menu.getByRole('listitem').nth(owner.document.navigation.primary.findIndex(i=>i.id===intent.itemId));
     if(intent.kind==='navigation-label'){await target.getByRole('textbox').fill(intent.value);await target.getByRole('textbox').press('Tab');}
     else{const select=target.getByRole('combobox');await expect.poll(()=>select.locator('option').evaluateAll(xs=>xs.map(x=>x.value)),{timeout:180000}).toContain(intent.destinationValue);const options=await select.locator('option').evaluateAll(xs=>xs.map(x=>({value:x.value,text:x.textContent})));const candidates=options.filter(o=>o.value===intent.destinationValue);assert.equal(candidates.length,1,'Use compiler-derived exact navigation choice key');await select.selectOption(candidates[0].value);}
    }
   }
   await save();
  }
  await expect.poll(()=>isComposition?gate.committed:attempted,{timeout:180000}).toBe(true);await drainAll(gate,composition);assert(!held,held?.message);await assertSaved();await settleBrowserReads(page,composition,{persist,check:()=>{assert(!held&&!closing);gate.check();},boundary:'before-reload'});await persist({phase:'static-reload-before'});readback.beginReload({ref:{providerId,recordId:result.id},record:result});const reloadResponse=await page.reload({waitUntil:'commit'});readback.documentCommitted(reloadResponse);await persist({phase:'static-reload-returned'});await settleBrowserReads(page,composition,{persist,check:()=>{assert(!held&&!closing);gate.check();},boundary:'after-reload'});await expect.poll(()=>readback.verified,{timeout:180000}).toBe(true);await drainAll(gate,composition,readback);assert(!held,held?.message);await assertSaved();
  await persist({phase:'ui-acknowledged-offline-audit-required',domain,record:result});return{domain,ref:{providerId:isComposition?'files':intent.owner.providerId,recordId:result.id},record:result};
 }finally{await drainAll(gate,composition,readback);}
}
