import {mappingPinsReadiness} from './pins-readiness.mjs';
import {contentPreviewOperations,contentPreviewReadGate,isNativeRead} from '../native-preview-reads.mjs';
import {familyPrewriteReadiness,isChallengedWriteContinuation} from './prewrite-readiness.mjs';
import {isFamilyProviderRead} from './provider-reads.mjs';
import {selectCanonicalRoot} from './root-selection.mjs';
import {mappingBindingReadiness} from './binding-readiness.mjs';
import {familyRecordReadback,assertSelectedEditorSaved} from './structural-readback.mjs';
import {settleBrowserReads} from '../static/browser-quiescence.mjs';
import {compositionAuthoringGate} from './composition-authoring.mjs';
import {compositionDerivedReadGate} from './composition-output.mjs';
import assert from 'node:assert/strict';
import {requestGate,drainAll} from './original-request.mjs';
import {getRecord,admitRecordEdit,admitDuplicate,admitContentCreate,admitContentField,admitMappingCreate,admitBinding,admitGroup,admitAttachment} from './intents.mjs';
const endpoints={content:'/__zudo_composer_content_provider',compositions:'/__zudo_composer_file_provider',mappings:'/__zudo_composer_mapping_provider',workspace:'/__zudo_composer_workspace_provider'};
/** Exactly one reviewed original browser mutation per phase; completion waits for the outer close. */
export async function familyUi(page,{base,snapshot,intent,persist,expect,setClose}){
 const nativeReads=contentPreviewReadGate({page,snapshot,persist});
 const domain=intent.kind==='attachment'?'workspace':intent.domain,endpoint=endpoints[domain];assert(endpoint);
 const writeOps=[domain==='content'?'put-entry':domain==='workspace'?'update':'put'];
 let result,attempted=false,held,closing=false,workspaceMutationToken;
 const workspaceRead=requestGate({page,persist,validate:()=>{},accept:(_,body)=>{assert(body.ok);const record=body.result;assert.equal(record.id,snapshot.workspaceId);assert.equal(record.status,'ready');const metadata=structuredClone(snapshot.project);for(const domain of Object.keys(metadata.providers))metadata.providers[domain]=metadata.providers[domain].map(({id})=>({id}));assert.deepEqual(record.metadata,metadata);assert(Number.isSafeInteger(record.mutationToken));if(workspaceMutationToken!==undefined)assert.equal(record.mutationToken,workspaceMutationToken);workspaceMutationToken=record.mutationToken;}});
 const validators={duplicate:admitDuplicate,'content-create':admitContentCreate,'content-field':admitContentField,'mapping-create':admitMappingCreate,binding:admitBinding,group:admitGroup,attachment:admitAttachment,'record-edit':admitRecordEdit};assert(validators[intent.kind]);
 const composition=domain==='compositions'?compositionAuthoringGate({page,snapshot,persist,admit:(input)=>{workspaceRead.check();assert(!closing&&!held&&!attempted,'Unexpected extra canonical write');result=structuredClone(validators[intent.kind](snapshot,intent,input));attempted=true;return result;},accept:()=>{}}):compositionDerivedReadGate({page,snapshot,persist});
 const gate=requestGate({page,persist,validate:(input,request)=>{nativeReads.check();composition.check();composition.assertSettled?.();workspaceRead.check();assert(!closing&&!held&&!attempted,'Unexpected extra canonical write');assert.equal(new URL(request.url()).pathname,endpoint);assert(writeOps.includes(request.headers()['x-zudo-composer-operation']));if(domain!=='workspace')assert.equal(request.headers()['x-zudo-composer-workspace'],snapshot.workspaceId);result=structuredClone(validators[intent.kind](snapshot,intent,input,workspaceMutationToken));attempted=true;},accept:(_,body)=>assert.equal(body.ok,true)});
 const editorRef=domain==='workspace'?intent.mapping:null;
 const readback=domain==='content'?null:familyRecordReadback({page,domain,workspaceId:snapshot.workspaceId,providerId:domain==='workspace'?'workspace':domain==='compositions'?'files':'mapping-filesystem',editorRef,persist,validateRecord:actual=>{
  const metadata=structuredClone(snapshot.project);metadata.collectionAttachments.push(result);for(const key of Object.keys(metadata.providers))metadata.providers[key]=metadata.providers[key].map(({id})=>({id}));assert.equal(actual.id,snapshot.workspaceId);assert.equal(actual.status,'ready');assert.equal(actual.mutationToken,workspaceMutationToken+1);assert.deepEqual(actual.metadata,metadata);
 }});
 const prewriteCheck=()=>{nativeReads.check();assert(!closing,'Family closing');gate.check();workspaceRead.check();composition.check();readback?.check();if(held)throw held;};
 const readiness=familyPrewriteReadiness({page,composition,persist,check:prewriteCheck,hold:error=>{held??=error;}});
 const beforeWrite=boundary=>readiness.beforeGesture(boundary);
 const check=async()=>{await drainAll(gate,workspaceRead,composition,readiness,nativeReads,...(readback?[readback]:[]));if(held)throw held;};
 setClose(async ctx=>{closing=true;try{await check();}finally{readback?.dispose();await ctx.close();}await check();});
 await page.route('**/__zudo*',async route=>{const request=route.request(),path=new URL(request.url()).pathname;let input;try{input=request.postDataJSON();}catch{}const op=request.headers()['x-zudo-composer-operation']??request.headers()['x-zudo-composer-asset-operation']??(path==='/__zudo-native-edit'?input?.operation:undefined);
  if(path===endpoints.compositions){if(held||closing){await persist({phase:'composition-after-held-refused',path});return route.abort();}if(domain==='compositions'&&input?.operation==='put')return readiness.admit(route,()=>composition.handle(route),{writeContinuation:isChallengedWriteContinuation(composition,input)});return composition.handle(route);}
  if(intent.kind==='attachment'&&!attempted&&path===endpoints.workspace&&op==='open')return workspaceRead.handle(route);
  if(path==='/__zudo-native-edit'&&contentPreviewOperations.has(input?.operation))return nativeReads.handle(route);
  if(request.method()==='GET'||isFamilyProviderRead(path,op)||(isNativeRead(path,input,snapshot.workspaceId)))return route.continue();
  if(path===endpoint&&writeOps.includes(op))return readiness.admit(route,()=>gate.handle(route));
  held??=Error(`Unexpected operation ${path} ${op}`);try{await persist({phase:'unexpected-refused',path,operation:op});}finally{await route.abort();}
 });
 const save=async()=>{const b=page.getByRole('button',{name:'Save',exact:true});if(await b.isEnabled()){await beforeWrite('before-family-save');await b.click();}};
 const compositionUrl=ref=>`${base}/composer?provider=${encodeURIComponent(ref.providerId)}&composition=${encodeURIComponent(ref.recordId)}`;
 const mappingUrl=ref=>`${base}/mapping?provider=${encodeURIComponent(ref.providerId)}&mapping=${encodeURIComponent(ref.recordId)}`;
 if(domain==='content'){
  const model=intent.modelId??intent.owner.modelId;await page.goto(`${base}/content?provider=content-filesystem&model=${encodeURIComponent(model)}${intent.owner?'&entry='+encodeURIComponent(intent.owner.recordId):''}`);
  if(intent.kind==='content-create'){const b=page.getByRole('button',{name:'New Entry',exact:true});await expect(b).toBeEnabled({timeout:180000});await beforeWrite('before-family-content-create');await b.click();}
  else{const field=snapshot.project.providers.content.find(p=>p.id==='content-filesystem').models.find(m=>m.id===model).document.fields.find(f=>f.id===intent.fieldId);assert(field);const target=page.locator(`[id="content-entry-${field.id}"]`);await expect(target).toBeVisible({timeout:180000});await beforeWrite('before-family-content-field');if(field.kind==='reference')await target.selectOption(intent.value.recordId);else{assert(['text','long-text','url','number'].includes(field.kind),'Unsupported family UI field kind');await target.fill(String(intent.value));}await save();}
 }else if(intent.kind==='duplicate'){await page.goto(compositionUrl(intent.source));await page.getByRole('button',{name:'More composition actions',exact:true}).click();await beforeWrite('before-family-duplicate');await page.getByRole('menuitem',{name:'Duplicate composition',exact:true}).click();}
 else if(intent.kind==='mapping-create'){await page.goto(`${base}/mapping`);await page.getByRole('button',{name:'New mapping',exact:true}).click();const d=page.getByRole('dialog',{name:'Create mapping',exact:true});await d.getByLabel('Name',{exact:true}).fill(intent.name);await d.getByLabel('Content model',{exact:true}).selectOption(`${intent.contentModel.providerId}/${intent.contentModel.recordId}`);await d.getByLabel('Composition',{exact:true}).selectOption(`${intent.composition.providerId}/${intent.composition.recordId}`);await beforeWrite('before-family-mapping-create');await d.getByRole('button',{name:'Create',exact:true}).click();}
 else if(intent.kind==='attachment'){await page.goto(mappingUrl(intent.mapping));await page.getByRole('button',{name:'Attach',exact:true}).click();const d=page.getByRole('dialog',{name:'Attach collection to a named slot',exact:true});await d.getByLabel('Composition named slot',{exact:true}).selectOption(`${intent.owner.providerId}/${intent.owner.recordId}/${intent.target.nodeId}/${intent.target.slotId}`);await beforeWrite('before-family-attachment');await d.getByRole('button',{name:'Attach collection',exact:true}).click();}
 else{
  await page.goto(domain==='compositions'?compositionUrl(intent.owner):mappingUrl(intent.owner));const a=intent.action;
  if(intent.kind==='binding'){const target=page.getByRole('button',{name:`Bind ${intent.title}.${intent.target.prop} on ${intent.target.nodeId}`,exact:true});await mappingBindingReadiness({page,expect,ref:intent.owner,record:getRecord(snapshot,'mappings',intent.owner),target,composition,check:prewriteCheck,persist});await target.click();const m=page.getByRole('menu',{name:`Bind ${intent.title}.${intent.target.prop} to…`,exact:true});await beforeWrite('before-family-binding');await m.getByRole('menuitem').filter({has:page.locator('.cms-mapping-bind-menu__label').filter({hasText:new RegExp('^'+RegExp.escape(intent.fieldLabel)+'$')})}).click();}
  else if(intent.kind==='group'){await page.getByRole('button',{name:`Add component to ${intent.slotId}`,exact:true}).click();await beforeWrite('before-family-group');await page.getByRole('button',{name:'Group',exact:true}).click();}
  else if(a.kind==='query-reference'){await beforeWrite('before-family-query-operator');await page.getByLabel('Filter 1 operator',{exact:true}).selectOption('equals');await beforeWrite('before-family-query-reference');await page.getByLabel('Filter 1 value',{exact:true}).selectOption(JSON.stringify([a.ref.providerId,a.ref.modelId,a.ref.recordId]));}
  else if(a.kind==='pins'){const choose=await mappingPinsReadiness({page,expect,ref:intent.owner,record:getRecord(snapshot,'mappings',intent.owner),composition,check:prewriteCheck,persist});await choose.click();const d=page.getByRole('dialog',{name:'Choose ordered pins',exact:true});await d.getByLabel('Filter source Entries',{exact:true}).fill(a.ref.recordId);const row=d.getByRole('listitem').filter({has:page.locator('code').filter({hasText:new RegExp('^'+RegExp.escape(a.ref.recordId)+'$')})});await expect(row).toHaveCount(1,{timeout:180000});await row.getByRole('checkbox').check();await beforeWrite('before-family-pins');await d.getByRole('button',{name:'Save pins',exact:true}).click();}
  else{if(a.treeRoot)await selectCanonicalRoot(page,expect,getRecord(snapshot,'compositions',intent.owner));if(a.treeLabel)await page.getByRole('treeitem').filter({hasText:a.treeLabel}).click();if(a.kind==='button'){await beforeWrite('before-family-record-button');await page.getByRole('button',{name:a.label,exact:true}).click();}else{const target=page.getByLabel(a.label,{exact:true});await expect(target).toBeEnabled({timeout:180000});await beforeWrite('before-family-record-field');if(a.kind==='select')await target.selectOption(a.value);else if(a.kind==='toggle'){if(await target.isChecked()!==a.value)await target.press('Space');else throw Error('No-op toggle forbidden');}else if(a.kind==='fill')await target.fill(String(a.value));else throw Error('Unsupported reviewed action');}}
  await save();
 }
 await expect.poll(()=>{nativeReads.check();composition.check();gate.check();if(held)throw held;return domain==='compositions'?composition.committed:attempted;},{timeout:180000}).toBe(true);await check();
 const target=domain==='workspace'?{ref:{providerId:'workspace',recordId:snapshot.workspaceId},record:{id:snapshot.workspaceId}}:domain==='content'?null:{ref:{providerId:domain==='compositions'?'files':'mapping-filesystem',recordId:result.id},record:result};
 const saved=async()=>{if(!readback)return;const owner=domain==='workspace'?getRecord(snapshot,'mappings',editorRef):result;await assertSelectedEditorSaved({page,expect,domain,ref:editorRef??target.ref,record:owner});if(intent.action?.treeRoot)await selectCanonicalRoot(page,expect,result);};
 await saved();await settleBrowserReads(page,composition,{persist,check:()=>{gate.check();workspaceRead.check();readback?.check();if(held)throw held;},boundary:'before-family-reload'});
 if(readback)readback.beginReload(target);const reloadResponse=await page.reload({waitUntil:'commit'});if(readback)readback.documentCommitted(reloadResponse);
 await settleBrowserReads(page,composition,{persist,check:()=>{gate.check();workspaceRead.check();readback?.check();if(held)throw held;},boundary:'after-family-reload'});
 if(readback)await expect.poll(()=>readback.verified,{timeout:180000}).toBe(true);await check();await saved();return{domain,record:result};
}
