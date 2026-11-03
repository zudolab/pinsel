import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../.."),origin="http://127.0.0.1:8797";
let directory:string,process_:ChildProcess|undefined;
async function stop(){const child=process_;process_=undefined;if(!child||child.exitCode!==null)return;await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Dogfood shutdown timeout")),15000);child.once("exit",()=>{clearTimeout(timer);resolve();});child.kill("SIGTERM");});}
async function start(){let log="";const child=spawn(process.execPath,["scripts/dev-dogfood.mjs"],{cwd:root,env:{...process.env,CI:"true",PINSEL_AI_PROVIDER:"fake",PINSEL_DOGFOOD_PORT:"8797",PINSEL_DOGFOOD_STATE:directory},stdio:["ignore","pipe","pipe"]});process_=child;child.stdout?.on("data",data=>{log=(log+String(data)).slice(-6000);});child.stderr?.on("data",data=>{log=(log+String(data)).slice(-6000);});const deadline=Date.now()+120000;while(Date.now()<deadline){if(child.exitCode!==null)throw new Error(log);try{if((await fetch(`${origin}/api/hosted/state`)).ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}throw new Error(`Dogfood startup timeout\n${log}`);}
test.beforeAll(async()=>{test.setTimeout(180000);directory=await mkdtemp(path.join(tmpdir(),"pinsel-ai-browser-"));await start();});
test.afterAll(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
async function open(page:Page){await page.goto(`${origin}/editor/`);await expect(page.locator("#ai-provider")).toContainText("Fake provider");}
async function state(page:Page){return page.evaluate(async()=>await(await fetch("/api/hosted/state")).json());}
async function save(page:Page){await page.getByRole("button",{name:"保存",exact:true}).click();await expect(page.locator("#host-status")).toContainText("saved");}
async function prepare(page:Page,instruction:string){await page.locator("#ai-instruction").fill(instruction);await page.locator("#ai-prepare").click();await expect(page.locator("#ai-diff")).toContainText(instruction);return page.locator("#ai-proposals").inputValue();}
async function preview(page:Page){await page.locator("#ai-preview").click();await expect(page.locator("#ai-status")).toContainText("この候補の実プレビューを確認");await expect(page.locator("#ai-apply")).toBeEnabled();}
test("fake proposal is read-only until exact preview+explicit Apply, persists over real restart and safely Undoes",async({page})=>{
 test.setTimeout(180000);await open(page);const before=await state(page);
 const id=await prepare(page,"S5 fake browser");expect((await state(page)).draftRevision).toBe(before.draftRevision);await expect(page.locator("#ai-apply")).toBeDisabled();
 await preview(page);await expect(page.frameLocator("#preview").locator("h1")).toContainText("S5 fake browser");await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("適用・保存済み");
 const after=await state(page);expect(after.draftRevision).not.toBe(before.draftRevision);
 const noteId=await page.locator("#entry option:checked").textContent();
 for(const provider of before.providers)for(const original of provider.entries){const current=after.providers.find((item:any)=>item.providerId===provider.providerId).entries.find((item:any)=>item.modelId===original.modelId&&item.id===original.id);if(original.modelId==="note"&&noteId?.includes(original.id)){for(const key of Object.keys(original.values).filter(key=>!["note-title","note-body"].includes(key)))expect(current.values[key]).toEqual(original.values[key]);}else expect(current).toEqual(original);}
 await stop();await start();await page.reload();await expect(page.locator("#ai-provider")).toContainText("Fake provider");await page.locator("#ai-proposals").selectOption(id);await expect(page.locator("#ai-status")).toContainText("適用・保存済み");await page.locator("#ai-undo").click();await expect(page.locator("#ai-status")).toContainText("Undo保存済み");
 const restored=await state(page);for(const provider of before.providers)for(const original of provider.entries)expect(restored.providers.find((item:any)=>item.providerId===provider.providerId).entries.find((item:any)=>item.id===original.id).values).toEqual(original.values);
});
test("dirty editor blocks inference; manual saved edit after proposal refuses stale Apply",async({page})=>{
 await open(page);const title=page.locator('[data-hosted-field="note-title"] input');await title.fill("manual before proposal");await page.locator("#ai-instruction").fill("not yet");await page.locator("#ai-prepare").click();await expect(page.locator("#ai-status")).toContainText("通常編集の保存");await save(page);
 await prepare(page,"stale proposal");await title.fill("newer manual value");await save(page);await preview(page);await page.locator("#ai-apply").click();await expect(page.locator("#ai-status")).toContainText("revision-conflict");await expect(title).toHaveValue("newer manual value");
});
test("lost committed Apply recovers after new browser context; later manual edit guards Undo",async({page,context,browser})=>{
 await open(page);const id=await prepare(page,"lost apply");await preview(page);let committedRevision="";
 await page.route("**/api/hosted/ai",async route=>{const request=route.request().postDataJSON();if(request.operation==="content-ai-apply"){const response=await route.fetch();expect(response.status()).toBe(200);const body=await response.json();expect(body.ok).toBe(true);committedRevision=JSON.parse(body.value.receipt.expected).draftRevision;await route.abort("failed");}else await route.continue();});
 await page.locator("#ai-apply").click();await expect.poll(()=>committedRevision).not.toBe("");const saved=await context.storageState();await page.close();const fresh=await browser.newContext({storageState:saved});const reopened=await fresh.newPage();await open(reopened);await expect(reopened.locator("#ai-proposals")).toHaveValue(id);await expect(reopened.locator("#ai-status")).toContainText("適用・保存済み");expect((await state(reopened)).draftRevision).toBe(committedRevision);
 await reopened.locator('[data-hosted-field="note-description"] textarea').fill("manual after AI");await save(reopened);await reopened.locator("#ai-undo").click();await expect(reopened.locator("#ai-status")).toContainText("revision-conflict");await expect(reopened.locator('[data-hosted-field="note-description"] textarea')).toHaveValue("manual after AI");await fresh.close();
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
