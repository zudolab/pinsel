import {contentPreviewOperations,contentPreviewReadGate,isNativeRead} from '../native-preview-reads.mjs';
import {assertHeaderDestinationPreview,routePath} from './destination-preview.mjs';
import {createHeaderReadiness} from './readiness.mjs';
import {waitForCompositionReadiness} from '../static/composition-readiness.mjs';
import {closeObserved} from './lifecycle.mjs';
import assert from 'node:assert/strict';
import {referencedNote} from './owner.mjs';
import {compositionDerivedReadGate} from '../families/composition-output.mjs';
import {contentFieldPlan,createDraftSettlement,isProviderRead} from '../routes-fields.mjs';
import {fillContentFields,verifyContentFields} from '../routes.mjs';
import {continueContentRequest,readBrowserContent} from '../content-browser-transport.mjs';
import {createHeaderAdmission,assertContentBefore,proveContentAfter} from './driver-proof.mjs';
/** persist must fsync each event before resolving; caller owns stopped captures/builds. */
export async function headerFieldUi(page,{base,snapshot,intent,persist,expect,setClose,setNavigation}){
 const nativeReads=contentPreviewReadGate({page,snapshot,persist});
 const admission=createHeaderAdmission(snapshot,intent),owner=admission.owner,settlement=createDraftSettlement();const model=snapshot.project.providers.content.find(p=>p.id===owner.ref.providerId).models.find(m=>m.id===owner.ref.modelId).document;const field=model.fields.find(f=>f.id===intent.field);assert(field);const fields={[field.label]:intent.value};if(intent.kind!=='knowledge-reference')contentFieldPlan(model,fields);else{assert.equal(field.kind,'reference');assert.deepEqual(field.target,{providerId:intent.value.providerId,recordId:intent.value.modelId});}let closing=false,result;const composition=compositionDerivedReadGate({page,snapshot,persist});
 const navigation=createHeaderReadiness(page,{composition,settlement,persist,check:()=>{nativeReads.check();return assert(!closing,'Header closing');}});setNavigation(navigation);
 const fail=error=>{admission.hold(error);settlement.hold(error);};
 setClose(async context=>{closing=true;await closeObserved(context,{settlement,composition,reads:nativeReads,assertResult:()=>assert(result,'No proven Header write')});});
 await page.route('**/__zudo*',route=>settlement.track((async()=>{
  const request=route.request(),path=new URL(request.url()).pathname;let input;try{input=request.postDataJSON();}catch{}const operation=request.headers()['x-zudo-composer-operation']??request.headers()['x-zudo-composer-asset-operation']??input?.operation??'';
  if(path==='/__zudo_composer_file_provider')return composition.handle(route);
  if(path==='/__zudo-native-edit'&&contentPreviewOperations.has(input?.operation))return nativeReads.handle(route);
  if(request.method()==='GET'||isProviderRead(path,operation)||(isNativeRead(path,input,snapshot.workspaceId)))return route.continue();
  let dispatched=false;
  try{assert(!closing&&!settlement.held);await waitForCompositionReadiness(composition);assert(!closing&&!settlement.held);nativeReads.check();composition.check();composition.assertSettled();assert.equal(path,'/__zudo_composer_content_provider');admission.admit(request,input);const current=await readBrowserContent(page,request,180000);assertContentBefore(snapshot,current);await persist({phase:'header-before-dispatch',ref:owner.ref,input,beforeToken:current.mutationToken});await waitForCompositionReadiness(composition);assert(!closing&&!settlement.held);nativeReads.check();composition.check();composition.assertSettled();dispatched=true;const response=await continueContentRequest(page,route,180000),body=await response.json();await persist({phase:'header-response',status:response.status(),body});assert.equal(response.status(),200);assert.equal(body.ok,true);const after=await readBrowserContent(page,request,180000);result=proveContentAfter(snapshot,owner,input,intent.field,intent.value,after);await persist({phase:'header-readback-verified',ref:owner.ref,record:result,token:after.mutationToken});}
  catch(error){fail(error);try{await persist({phase:dispatched?'header-uncertain':'header-refused',error:String(error),dispatched});}finally{await route.abort().catch(()=>{});}}
 })()));
 try{await page.goto(`${base}/content?provider=${owner.ref.providerId}&model=${owner.ref.modelId}&entry=${owner.ref.recordId}`);await navigation('before-header-edit');if(intent.kind==='knowledge-reference'){const control=page.locator(`[id="content-entry-${field.id}"]`);await expect(control).toBeVisible({timeout:180000});await settlement.beforeAdvance();await control.selectOption(intent.value.recordId);await expect.poll(()=>!!result||!!settlement.held,{timeout:180000}).toBe(true);await settlement.beforeAdvance();assert(result,'Reference autosave did not commit; no fallback write');await expect(page.getByTitle('All changes saved',{exact:true})).toBeVisible({timeout:180000});await navigation('before-knowledge-reload');await page.reload();await expect(control).toHaveValue(intent.value.recordId,{timeout:180000});}else{await fillContentFields(page,fields,{model,settlement});await navigation('before-header-reload');await page.reload();await verifyContentFields(page,fields,{model,settlement});}await navigation('after-header-reload');await settlement.beforeAdvance();assert(result);return{domain:'content-edit',ref:owner.ref,record:result};}catch(error){fail(error);throw error;}
}
/** Called after save/reload or on exact static output; no mutation authority. */
export async function verifyHeaderDocument(root,{record,expect}){const v=record.values,header=root.locator('.site-nav__item').filter({hasText:v['nav-link-header-label']});await expect(header).toHaveCount(1);await expect(header).toHaveText(v['nav-link-header-label']);await expect(header).toHaveAttribute('href',v['nav-link-href']);const footer=root.locator('.footer-nav a').filter({hasText:v['nav-link-footer-title']});await expect(footer).toHaveCount(1);await expect(footer).toHaveAttribute('href',v['nav-link-href']);await expect(footer.locator('.eyebrow')).toHaveText(v['nav-link-label']);await expect(footer.locator('.footer-nav__title')).toHaveText(v['nav-link-footer-title']);await expect(footer.locator('.footer-nav__description')).toHaveText(v['nav-link-footer-description']);return header;}

export async function verifySavedHeader(page,{base,snapshot,intent,record,expect,shot,navigation,revision=snapshot?.digest}){
 await navigation('before-header-preview');await page.goto(`${base}/composer?native=1&visitor=%2F`);await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});const frame=()=>page.frameLocator('iframe[title="Host rendered page"]');
 // Shared Header/Footer copy and href belong to this source document.
 const link=await verifyHeaderDocument(frame(),{record,expect});let targetPreview;
 if(intent.field==='nav-link-href'&&intent.direction==='forward'){
  await enterBrowseMode(page,expect);await navigation('before-header-visitor-link');
  const received=page.waitForResponse(response=>{const request=response.request();if(new URL(response.url()).origin!==base||new URL(response.url()).pathname!=='/__zudo-native-edit'||request.method()!=='POST')return false;try{const input=request.postDataJSON();return input.operation==='document-preview'&&input.input.workspaceId===snapshot.workspaceId&&routePath(input.input.pathname)===routePath(intent.value);}catch{return false;}},{timeout:180000});received.catch(()=>{});
  await link.click();const response=await received;assert.equal(response.status(),200);const body=await response.json();assert.equal(body.ok,true);targetPreview=assertHeaderDestinationPreview(body.result,snapshot,intent,revision);
  await expect.poll(()=>routePath(new URL(page.url()).searchParams.get('visitor')??''),{timeout:180000}).toBe(routePath(intent.value));await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});
  await expect(page.locator('iframe[title="Host rendered page"]')).toHaveAttribute('src',targetPreview.documentUrl);
  await expect(frame().locator('title')).toHaveJSProperty('textContent',intent.staticRouteProof.title,{timeout:180000});await expect(frame().locator('h2')).toHaveText(intent.staticRouteProof.sectionTitle);
 }
 await navigation('after-header-preview');await shot('saved-header');return targetPreview;
}

export async function enterBrowseMode(page,expect){const selecting=page.getByRole('button',{name:'Select components',exact:true});if(await selecting.count()){await expect(selecting).toHaveAttribute('aria-pressed','true');await selecting.click();}const browse=page.getByRole('button',{name:'Browse page',exact:true});await expect(browse).toHaveCount(1);await expect(browse).toHaveAttribute('aria-pressed','false');}

export async function verifySavedKnowledge(page,{base,snapshot,intent,record,expect,shot,navigation}){
 const note=referencedNote(snapshot,intent.value);await navigation('before-knowledge-preview');await page.goto(`${base}/composer?native=1&visitor=%2Flessons%2F`);await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});const frame=page.frameLocator('iframe[title="Host rendered page"]'),card=frame.locator('a.note-card').filter({has:frame.locator('h3',{hasText:record.values['knowledge-card-title']})});await expect(card).toHaveCount(1);await expect(card.locator('h3')).toHaveText(record.values['knowledge-card-title']);await expect(card.locator('p')).toHaveText(record.values['knowledge-card-description']);await expect(card).toHaveAttribute('href',`/notes/${note.values['note-slug']}/`);await enterBrowseMode(page,expect);await navigation('before-knowledge-visitor-link');await card.click();await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});await expect.poll(()=>new URL(page.url()).searchParams.get('visitor'),{timeout:180000}).toBe(`/notes/${note.values['note-slug']}/`);await expect(frame.locator('h1')).toHaveText(note.values['note-title']);await navigation('after-knowledge-preview');await shot('saved-knowledge-reference');
}
