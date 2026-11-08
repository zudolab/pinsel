import { createConnection } from "node:net";
import { test, expect, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../.."),origin="http://127.0.0.1:8797";
let directory:string,process_:ChildProcess|undefined,fakeField:string|undefined,aiOrigin:string|undefined;
async function closed(){expect(aiOrigin,"per-launch Node host port was reported").toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);for(const target of [origin,aiOrigin!] ){await expect.poll(()=>new Promise<boolean>(resolve=>{const socket=createConnection({host:"127.0.0.1",port:Number(new URL(target).port)});socket.once("connect",()=>{socket.destroy();resolve(false);});socket.once("error",(error:NodeJS.ErrnoException)=>{socket.destroy();resolve(error.code==="ECONNREFUSED");});socket.setTimeout(500,()=>{socket.destroy();resolve(false);});})).toBe(true);}}

async function stop(){const child=process_;process_=undefined;if(!child)return;if(child.exitCode!==null){await closed();return;}await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Dogfood shutdown timeout")),15000);child.once("exit",()=>{clearTimeout(timer);resolve();});child.kill("SIGTERM");});await closed();}
async function start(){aiOrigin=undefined;let log="";const child=spawn(process.execPath,["scripts/dev-dogfood.mjs"],{cwd:root,env:{...process.env,CI:"true",PINSEL_AI_PROVIDER:"fake",PINSEL_AI_MODEL:undefined,PINSEL_AI_EFFORT:undefined,PINSEL_AI_SERVICE_TIER:undefined,PINSEL_AI_FAKE_FIELD:fakeField,PINSEL_DOGFOOD_PORT:"8797",PINSEL_DOGFOOD_STATE:directory},stdio:["ignore","pipe","pipe","ipc"]});process_=child;child.on("message",(message:any)=>{if(message?.type==="dogfood-ports")aiOrigin=message.aiOrigin;});child.stdout?.on("data",data=>{log=(log+String(data)).slice(-6000);});child.stderr?.on("data",data=>{log=(log+String(data)).slice(-6000);});const deadline=Date.now()+120000;while(Date.now()<deadline){if(child.exitCode!==null)throw new Error(log);try{if((await fetch(`${origin}/api/hosted/state`)).ok&&aiOrigin)return;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}throw new Error(`Dogfood startup timeout\n${log}`);}
test.beforeAll(async()=>{test.setTimeout(180000);directory=await mkdtemp(path.join(tmpdir(),"pinsel-ai-browser-"));await start();});
test.afterAll(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
async function open(page:Page){await page.goto(`${origin}/editor/`);await expect(page.locator("#ai-provider")).toContainText("Fake provider");}
async function state(page:Page){return page.evaluate(async()=>await(await fetch("/api/hosted/state")).json());}
async function save(page:Page){await page.getByRole("button",{name:"保存",exact:true}).click();await expect(page.locator("#host-status")).toHaveAttribute("data-phase","saved");}
async function prepare(page:Page,instruction:string){await page.locator("#ai-instruction").fill(instruction);await page.locator("#ai-prepare").click();await expect(page.locator("#ai-diff")).toContainText(instruction);return page.locator("#ai-proposals").inputValue();}
async function preview(page:Page){await page.locator("#ai-preview").click();await expect(page.locator("#ai-status")).toContainText("この候補の実プレビューを確認");await expect(page.locator("#ai-apply")).toBeEnabled();}
test("fake proposal is read-only until exact preview+explicit Apply, persists over real restart and safely Undoes",async({page})=>{
 test.setTimeout(180000);await open(page);const before=await state(page);
 await expect(page.locator("#ai-prepare")).toBeDisabled();await expect(page.locator("#ai-provider")).toContainText("テスト用の固定応答");
 const id=await prepare(page,"S5 fake browser");expect((await state(page)).draftRevision).toBe(before.draftRevision);
 await expect(page.locator("#ai-diff .ai-summary")).toContainText("テスト用fakeの出力");await expect(page.locator("#ai-diff .ai-diff-added ins").first()).toBeVisible();await expect(page.locator("#ai-diff .ai-diff-added").first()).toContainText("追加:");await expect(page.locator("#ai-diff .ai-full-text").first()).toHaveCount(1);await expect(page.locator("#ai-apply")).toBeDisabled();
 await preview(page);await expect(page.frameLocator("#preview").locator("h1")).toContainText("S5 fake browser");await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("適用・保存済み");
 const after=await state(page);expect(after.draftRevision).not.toBe(before.draftRevision);
 const noteId=await page.locator("#entry option:checked").textContent();
 for(const provider of before.providers)for(const original of provider.entries){const current=after.providers.find((item:any)=>item.providerId===provider.providerId).entries.find((item:any)=>item.modelId===original.modelId&&item.id===original.id);if(original.modelId==="note"&&noteId?.includes(original.id)){for(const key of Object.keys(original.values).filter(key=>!["note-title","note-body"].includes(key)))expect(current.values[key]).toEqual(original.values[key]);}else expect(current).toEqual(original);}
 await stop();await start();await page.reload();await expect(page.locator("#ai-provider")).toContainText("Fake provider");await page.locator("#ai-proposals").selectOption(id);await expect(page.locator("#ai-status")).toContainText("適用・保存済み");await page.locator("#ai-undo").click();await expect(page.locator("#ai-status")).toContainText("Undo保存済み");
 const restored=await state(page);for(const provider of before.providers)for(const original of provider.entries)expect(restored.providers.find((item:any)=>item.providerId===provider.providerId).entries.find((item:any)=>item.id===original.id).values).toEqual(original.values);
});
test("dirty editor blocks inference; manual saved edit after proposal refuses stale Apply",async({page})=>{
 await open(page);const title=page.locator('[data-hosted-field="note-title"] input');await title.fill("manual before proposal");await page.locator("#ai-instruction").fill("not yet");await page.locator("#ai-prepare").click();await expect(page.locator("#ai-status")).toContainText("通常編集の保存");await save(page);
 await prepare(page,"stale proposal");await title.fill("newer manual value");await save(page);await preview(page);await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("AIの操作より後に別の保存がありました");await expect(title).toHaveValue("newer manual value");
});
test("lost committed Apply recovers after new browser context; later manual edit guards Undo",async({page,context,browser})=>{
 await open(page);const id=await prepare(page,"lost apply");await preview(page);let committedRevision="";
 await page.route("**/api/hosted/ai",async route=>{const request=route.request().postDataJSON();if(request.operation==="content-ai-apply"){const response=await route.fetch();expect(response.status()).toBe(200);const body=await response.json();expect(body.ok).toBe(true);committedRevision=JSON.parse(body.value.receipt.expected).draftRevision;await route.abort("failed");}else await route.continue();});
 await page.locator("#ai-apply").click();await expect.poll(()=>committedRevision).not.toBe("");const saved=await context.storageState();await page.close();const fresh=await browser.newContext({storageState:saved});const reopened=await fresh.newPage();await open(reopened);await expect(reopened.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.locator("#ai-status")).toContainText("適用・保存済み");expect((await state(reopened)).draftRevision).toBe(committedRevision);
 await reopened.locator('[data-hosted-field="note-description"] textarea').fill("manual after AI");await save(reopened);await reopened.locator("#ai-undo").click();await expect(reopened.locator("#ai-status")).toContainText("AIの操作より後に別の保存がありました");await expect(reopened.locator('[data-hosted-field="note-description"] textarea')).toHaveValue("manual after AI");await fresh.close();
});
test("candidate preview locks proposal selection and loses approval on reload or failed rerender",async({page})=>{
 await open(page);await prepare(page,"preview guards");let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});let reached=false;
 await page.route("**/api/hosted/ai",async route=>{const request=route.request().postDataJSON();if(request.operation==="pinsel-ai-preview"){reached=true;await blocked;}await route.continue();});
 await page.locator("#ai-preview").click();await expect.poll(()=>reached).toBe(true);await expect(page.locator("#ai-proposals")).toBeDisabled();await expect(page.locator("#ai-read")).toBeDisabled();release();await expect(page.locator("#ai-apply")).toBeEnabled();await page.unroute("**/api/hosted/ai");
 await page.locator("#preview").evaluate((frame:HTMLIFrameElement)=>frame.contentWindow!.location.reload());await expect(page.locator("#ai-apply")).toBeDisabled();await expect(page.locator("#preview-status")).toContainText("確認済み");await expect(page.locator("#ai-apply")).toBeDisabled();
 await page.route("**/preview/ai-document?**",route=>route.abort("failed"));await page.locator("#ai-preview").click();await expect(page.locator("#ai-status")).not.toContainText("この候補の実プレビューを確認");await expect(page.locator("#ai-apply")).toBeDisabled();
});
test("a delayed proposal list from another Note cannot replace the current Note list",async({page})=>{
 await open(page);const ids=(await state(page)).providers.flatMap((provider:any)=>provider.entries.filter((entry:any)=>entry.modelId==="note").map((entry:any)=>entry.id));
 const noteValues=await page.locator("#entry option").evaluateAll((nodes,ids)=>nodes.filter(node=>ids.some((id:string)=>node.textContent?.endsWith(` · ${id}`))).map(node=>(node as HTMLOptionElement).value),ids);
 expect(noteValues.length).toBeGreaterThanOrEqual(2);const first=page.locator("#entry");const firstValue=await first.inputValue(),secondValue=noteValues.find(value=>value!==firstValue)!;
 await first.selectOption(secondValue);await expect(page.locator("#ai-proposals option")).toHaveCount(1);
 let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});let reached=false,held=false;
 await page.route("**/api/hosted/ai",async route=>{const request=route.request().postDataJSON();if(request.operation==="pinsel-ai-list"&&!held){held=true;reached=true;const response=await route.fetch();await blocked;await route.fulfill({response});}else await route.continue();});
 await first.selectOption(firstValue);await expect.poll(()=>reached).toBe(true);await first.selectOption(secondValue);await expect(page.locator("#ai-proposals option")).toHaveCount(1);release();await page.waitForTimeout(100);await expect(page.locator("#ai-proposals option")).toHaveCount(1);await expect(page.locator("#ai-apply")).toBeDisabled();
});

test("provider status failure blocks only new Prepare and can be rechecked",async({page})=>{
 await page.route("**/api/hosted/ai",async route=>{if(route.request().postDataJSON().operation==="content-ai-status")await route.fulfill({status:503,json:{ok:false}});else await route.continue();});
 await page.goto(`${origin}/editor/`);await expect(page.locator('[data-hosted-field="note-title"] input')).toBeVisible();
 await expect(page.locator("#ai-prepare")).toBeDisabled();await expect(page.locator("#ai-read")).toBeEnabled();
 await page.locator("#ai-instruction").fill("指示");await expect(page.locator("#ai-prepare")).toBeDisabled();await page.unroute("**/api/hosted/ai");await page.getByRole("button",{name:"providerを再確認"}).click();await expect(page.locator("#ai-prepare")).toBeEnabled();await page.locator("#ai-instruction").fill("   ");await expect(page.locator("#ai-prepare")).toBeDisabled();
});
test("malformed current recovery does not destroy editor or original checkpoint",async({page})=>{
 await open(page);const key=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith("pinsel:hosted:v1:"))!);
 await page.evaluate(key=>localStorage.setItem(key,'{"version":999,"edits":null}'),key);await page.reload();
 await expect(page.locator('[data-hosted-field="note-title"] input')).toBeVisible();await expect(page.locator("#recovery-warning")).toContainText("保持");
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe('{"version":999,"edits":null}');
});

for(const field of ["body","title"]){
 test(`Japanese Markdown ${field}-only fixture: exact preview, persistent Apply, guarded Undo`,async({page})=>{
  test.setTimeout(240000);await stop();fakeField=field;await start();await open(page);const before=await state(page);const selectedId=(await page.locator("#entry option:checked").textContent())!.split(" · ")[1];
  const instruction="日本語の見出し\n\n- 留学の準備\n- **制作の記録**\n\n[参考リンク](https://example.test/guide)";
  const id=await prepare(page,instruction);expect(await state(page)).toEqual(before);await preview(page);expect(await state(page)).toEqual(before);
  if(field==="body"){await expect(page.frameLocator("#preview").getByRole("link",{name:"参考リンク"})).toHaveAttribute("href","https://example.test/guide");await expect(page.frameLocator("#preview").locator("strong").filter({hasText:"制作の記録"})).toBeVisible();}
  else await expect(page.frameLocator("#preview").locator("h1")).toContainText("日本語の見出し");
  await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("適用・保存済み");const after=await state(page);
  let changes=0;for(const p of before.providers)for(const e of p.entries){const next=after.providers.find((x:any)=>x.providerId===p.providerId).entries.find((x:any)=>x.id===e.id);if(e.id===selectedId && e.modelId==="note"){expect(next.values).toEqual({...e.values,[`note-${field}`]:next.values[`note-${field}`]});expect(next.values[`note-${field}`]).not.toEqual(e.values[`note-${field}`]);changes++;}else expect(next).toEqual(e);}expect(changes).toBe(1);

  await stop();await start();await page.reload();await expect(page.locator("#ai-provider")).toContainText("Fake provider");await page.locator("#ai-proposals").selectOption(id);await expect(page.locator("#ai-status")).toContainText("適用・保存済み");expect((await state(page)).draftRevision).toBe(after.draftRevision);
  await page.locator("#ai-undo").click();await expect(page.locator("#ai-status")).toContainText("Undo保存済み");const undone=await state(page);for(const p of before.providers)for(const e of p.entries)expect(undone.providers.find((x:any)=>x.providerId===p.providerId).entries.find((x:any)=>x.id===e.id).values).toEqual(e.values);
  await test.info().attach("sanitized-identities",{body:JSON.stringify({source:spawnSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).stdout.trim(),package:JSON.parse(await readFile(path.join(root,"packages/pinsel-content/package.json"),"utf8")).dependencies["zudo-composer"],contract:JSON.parse(await readFile(path.join(root,"packages/pinsel-content/package.json"),"utf8")).dependencies["@zudo-composer/component-contract"],dirty:spawnSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).stdout.length>0,scope:field,before:before.draftRevision,applied:after.draftRevision,undone:undone.draftRevision}),contentType:"application/json"});
  await prepare(page,"手動編集と競合");await preview(page);if(field==="body"){await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("適用・保存済み");}await page.locator('[data-hosted-field="note-description"] textarea').fill(`手動保存 ${field}`);await save(page);if(field==="body")await page.locator("#ai-undo").click();else{await preview(page);await page.locator("#ai-apply").click();}await expect(page.locator("#ai-status")).toContainText("AIの操作より後に別の保存がありました");await expect(page.locator('[data-hosted-field="note-description"] textarea')).toHaveValue(`手動保存 ${field}`);
 });
}

for(const inference of [{state:"unknown",message:"認証を確認できません"},{state:"unavailable",code:"not-authenticated",message:"未認証"}])test(`saved proposal recovery and Undo survive ${inference.state} provider`,async({page})=>{
 await open(page);const id=await prepare(page,"保存済み回復");await preview(page);let applied=false;
 await page.route("**/api/hosted/ai",async route=>{const op=route.request().postDataJSON().operation;if(op==="content-ai-status")await route.fulfill({json:{ok:true,value:{configured:true,provider:"Test unavailable",canApply:true,inference}}});else if(op==="content-ai-apply"){const response=await route.fetch();expect(response.status()).toBe(200);applied=true;await route.abort();}else await route.continue();});
 await page.locator("#ai-apply").click();await expect.poll(()=>applied).toBe(true);await page.reload();await expect(page.locator("#ai-prepare")).toBeDisabled();await expect(page.locator("#ai-proposals")).toHaveValue(id);await expect(page.locator("#ai-status")).toContainText("適用・保存済み");await page.locator("#ai-undo").click();await expect(page.locator("#ai-status")).toContainText("Undo保存済み");await expect(page.locator('[data-hosted-field="note-title"] input')).toBeEditable();
});

test("malformed AI pointers and empty checkpoint survive edit/save/reload without automatic sends",async({page})=>{
 await open(page);const keys=await page.evaluate(()=>{const current=Object.keys(localStorage).find(k=>k.startsWith("pinsel:hosted:v1:"))!;const prefix=current.split(":").slice(3,-1).join(":");const ai=`pinsel:note-ai:${prefix}:invalid:apply`;localStorage.setItem(current,"");localStorage.setItem(ai,"null");return{current,ai};});
 let mutations=0;page.on("request",request=>{if(request.method()==="POST"&&/\/api\/hosted\/(rpc|ai)$/.test(request.url())){const value=request.postDataJSON();if(value.method==="execute" || (value.operation && !["content-ai-status","pinsel-ai-list","content-ai-read"].includes(value.operation)))mutations++;}});
 await page.reload();await expect(page.locator('[data-hosted-field="note-title"] input')).toBeVisible();await expect(page.locator("#ai-recovery-warning")).toContainText("保持");expect(mutations).toBe(0);
 await page.locator('[data-hosted-field="note-title"] input').fill("通常編集は継続できます");await save(page);await page.reload();await expect(page.locator('[data-hosted-field="note-title"] input')).toHaveValue("通常編集は継続できます");expect(await page.evaluate(({current,ai})=>[localStorage.getItem(current),localStorage.getItem(ai)],keys)).toEqual(["","null"]);
});

test("misbound AI recovery pointer remains untouched on read and Apply",async({page})=>{
 await open(page);const id=await prepare(page,"pointer binding");await preview(page);
 const record=await page.evaluate(id=>{const hosted=Object.keys(localStorage).find(k=>k.startsWith("pinsel:hosted:v1:"))!;const scope=hosted.split(":").slice(3,-1).join(":");const key=`pinsel:note-ai:${scope}:${id}:apply`;const raw=JSON.stringify({version:1,proposalId:id,action:"apply",entry:{providerId:"wrong",modelId:"note",recordId:"other"}});localStorage.setItem(key,raw);return{key,raw};},id);
 await page.locator("#ai-read").click();await preview(page);const before=await state(page);await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("回復記録を保持");expect(await state(page)).toEqual(before);expect(await page.evaluate(key=>localStorage.getItem(key),record.key)).toBe(record.raw);
});

test("invalid Markdown fake proposal is classified safely and leaves canonical content and proposal list unchanged",async({page})=>{
 test.setTimeout(180000);
 await stop();fakeField="body";await start();await open(page);const before=await state(page),ids=await page.locator("#ai-proposals option").evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value));
 let prepares=0;page.on("request",request=>{if(request.url().endsWith("/api/hosted/ai")&&request.postDataJSON()?.operation==="content-ai-prepare")prepares++;});
 await page.locator("#ai-instruction").fill("### PRIVATE_CANDIDATE\n\n[private](http://private.example.test/secret)");await page.locator("#ai-prepare").click();
 await expect(page.locator("#ai-status")).toContainText("入力できない値が含まれています");await expect(page.locator("#ai-status")).not.toContainText("invalid-value:");await expect(page.locator("#ai-status")).toContainText("heading-3-plus");await expect(page.locator("#ai-status")).toContainText("unsafe-link");await expect(page.locator("#ai-status")).not.toContainText("PRIVATE_CANDIDATE");await expect(page.locator("#ai-status")).not.toContainText("private.example");
 expect(await state(page)).toEqual(before);expect(await page.locator("#ai-proposals option").evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value))).toEqual(ids);await expect(page.locator("#ai-apply")).toBeDisabled();expect(prepares).toBe(1);
 await prepare(page,"## 日本語見出し\n\n- 項目\n- **強調**");await preview(page);expect(await state(page)).toEqual(before);await expect(page.frameLocator("#preview").getByRole("heading",{name:"日本語見出し"})).toBeVisible();
});

async function flood(page:Page,entry:unknown,count:number){await page.evaluate(async({entry,count})=>{for(let index=0;index<count;index++){const body=await(await fetch("/api/hosted/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({operation:"content-ai-prepare",payload:{entry,instruction:`newer proposal ${index}`}})})).json();if(!body.ok||body.value.status==="refused")throw new Error(`fixture prepare ${index} failed`);}},{entry,count});}
async function aiCall(page:Page,operation:string,payload:unknown){return page.evaluate(async({operation,payload})=>await(await fetch("/api/hosted/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({operation,payload})})).json(),{operation,payload});}
async function pointers(page:Page){return page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith("pinsel:note-ai:")).map(key=>({key,value:JSON.parse(localStorage.getItem(key)!)})));}
async function loseMutation(page:Page,action:"apply"|"undo"){let lost="";await page.route("**/api/hosted/ai",async route=>{if(route.request().postDataJSON().operation===`content-ai-${action}`){const response=await route.fetch();expect(response.status()).toBe(200);const body=await response.json();expect(body.ok).toBe(true);lost=JSON.parse(body.value.receipt.expected).draftRevision;await route.abort("failed");}else await route.continue();});await page.locator(`#ai-${action}`).click();await expect.poll(()=>lost).not.toBe("");await page.unroute("**/api/hosted/ai");return lost;}
async function reopenAfterRestart(browser:import("@playwright/test").Browser,saved:Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>){await stop();await start();const fresh=await browser.newContext({storageState:saved});const page=await fresh.newPage();const sent:string[]=[];page.on("request",request=>{if(request.method()==="POST"&&request.url().endsWith("/api/hosted/ai")){const operation=request.postDataJSON()?.operation;if(!["content-ai-status","pinsel-ai-list","content-ai-read"].includes(operation))sent.push(operation);}else if(request.method()==="POST"&&request.url().endsWith("/api/hosted/rpc")&&request.postDataJSON()?.method==="execute")sent.push("execute");});await open(page);return{fresh,page,sent};}

test("committed Apply and Undo older than the newest proposal page recover from receipts after restart",async({page,context,browser})=>{
 test.setTimeout(240000);await open(page);const id=await prepare(page,"outside list window");await preview(page);
 const appliedRevision=await loseMutation(page,"apply");const [pointer]=(await pointers(page)).filter(item=>item.value.proposalId===id);expect(pointer.value.action).toBe("apply");
 await flood(page,pointer.value.entry,31);
 const listed=await aiCall(page,"pinsel-ai-list",{entry:pointer.value.entry});expect(listed.value).toHaveLength(30);expect(listed.value.map((item:any)=>item.id)).not.toContain(id);
 const direct=await aiCall(page,"content-ai-read",{proposalId:id});expect(direct.ok).toBe(true);expect(direct.value.applied.revisionId).toBeTruthy();
 let reopened=await reopenAfterRestart(browser,await context.storageState());await page.close();
 await expect(reopened.page.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.page.locator("#ai-status")).toContainText("適用・保存済み");expect((await state(reopened.page)).draftRevision).toBe(appliedRevision);expect(await pointers(reopened.page)).toEqual([]);await expect(reopened.page.locator("#ai-proposals option")).toHaveCount(32);expect(reopened.sent).toEqual([]);
 const undoneRevision=await loseMutation(reopened.page,"undo");expect((await pointers(reopened.page)).map(item=>item.value.action)).toEqual(["undo"]);
 // A later manual edit from an independent browser session (no shared localStorage) after the lost Undo committed.
 const other=await browser.newContext(),manual=await other.newPage();await open(manual);await manual.locator('[data-hosted-field="note-description"] textarea').fill("manual after lost Undo");await save(manual);const manualRevision=(await state(manual)).draftRevision;expect(manualRevision).not.toBe(undoneRevision);await other.close();
 await flood(reopened.page,pointer.value.entry,31);const saved=await reopened.fresh.storageState();await reopened.fresh.close();
 reopened=await reopenAfterRestart(browser,saved);
 await expect(reopened.page.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.page.locator("#ai-status")).toContainText("Undo保存済み");expect(await pointers(reopened.page)).toEqual([]);expect(reopened.sent).toEqual([]);
 expect((await state(reopened.page)).draftRevision).toBe(manualRevision);await expect(reopened.page.locator('[data-hosted-field="note-description"] textarea')).toHaveValue("manual after lost Undo");
 await reopened.fresh.close();
});

test("one unreadable pending pointer neither hides another nor is deleted",async({page,context,browser})=>{
 test.setTimeout(240000);await open(page);const id=await prepare(page,"second pending survivor");await preview(page);await loseMutation(page,"apply");
 const [pointer]=(await pointers(page)).filter(item=>item.value.proposalId===id);
 const missing=await page.evaluate(({key,entry})=>{const scoped=key.split(":").slice(0,-2).join(":"),missingKey=`${scoped}:missing-proposal:apply`,raw=JSON.stringify({version:1,entry,proposalId:"missing-proposal",action:"apply"});localStorage.setItem(missingKey,raw);return{key:missingKey,raw};},{key:pointer.key,entry:pointer.value.entry});
 await flood(page,pointer.value.entry,31);const reopened=await reopenAfterRestart(browser,await context.storageState());await page.close();
 await expect(reopened.page.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.page.locator("#ai-status")).toContainText("適用・保存済み");
 await expect(reopened.page.locator("#ai-pending-warning")).toContainText("missing-proposal");expect(await reopened.page.evaluate(key=>localStorage.getItem(key),missing.key)).toBe(missing.raw);expect((await pointers(reopened.page)).map(item=>item.value.proposalId)).toEqual(["missing-proposal"]);expect(reopened.sent).toEqual([]);
 await reopened.fresh.close();
});

test("startup opens the Note of a valid pending pointer even when a misbound pointer exists, and counts the other",async({page,context,browser})=>{
 test.setTimeout(240000);await open(page);const ids=(await state(page)).providers.flatMap((provider:any)=>provider.entries.filter((entry:any)=>entry.modelId==="note").map((entry:any)=>entry.id));
 const noteValues=await page.locator("#entry option").evaluateAll((nodes,ids)=>nodes.filter(node=>ids.some((id:string)=>node.textContent?.endsWith(` · ${id}`))).map(node=>(node as HTMLOptionElement).value),ids);
 const firstValue=await page.locator("#entry").inputValue(),secondValue=noteValues.find(value=>value!==firstValue)!;await page.locator("#entry").selectOption(secondValue);
 const id=await prepare(page,"second Note pending");await preview(page);await loseMutation(page,"apply");const [pointer]=(await pointers(page)).filter(item=>item.value.proposalId===id);
 const misbound=await page.evaluate(key=>{const scoped=key.split(":").slice(0,-2).join(":"),misboundKey=`${scoped}:misbound-proposal:apply`,raw=JSON.stringify({version:1,entry:{providerId:"wrong",modelId:"note",recordId:"absent"},proposalId:"misbound-proposal",action:"apply"});localStorage.setItem(misboundKey,raw);return{key:misboundKey,raw};},pointer.key);
 const reopened=await reopenAfterRestart(browser,await context.storageState());await page.close();
 await expect(reopened.page.locator("#entry")).toHaveValue(secondValue);await expect(reopened.page.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.page.locator("#ai-status")).toContainText("適用・保存済み");
 await expect(reopened.page.locator("#ai-pending-warning")).toContainText("他の対象 1 件");expect(await reopened.page.evaluate(key=>localStorage.getItem(key),misbound.key)).toBe(misbound.raw);expect(reopened.sent).toEqual([]);
 await reopened.fresh.close();
});
