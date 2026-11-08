import { test, expect, type Page } from "@playwright/test";
import { startLocalWorker, type LocalWorker } from "./local-worker";
let worker:LocalWorker;
test.beforeAll(async()=>{test.setTimeout(180000);worker=await startLocalWorker({port:8796,stateDir:"hosted-e2e"});});
test.afterAll(async()=>{await worker?.stop();});
async function open(page:Page){await page.goto(`${worker.origin}/editor/`);await expect(page.locator('[data-hosted-field="note-title"] input')).toBeVisible();}
async function choose(page:Page,model:string){
 const option=page.locator("#entry option").filter({hasText:model});
 // Config/state are fetched after navigation. Wait for the actual target option
 // instead of sampling an empty select immediately after Worker restart/reload.
 await expect(option).toHaveCount(1);
 await page.locator("#entry").selectOption(await option.getAttribute("value") as string);
}
async function save(page:Page){await page.getByRole("button",{name:"保存",exact:true}).click();await expect(page.locator("#host-status")).toHaveAttribute("data-phase","saved");await expect(page.locator("#host-status")).toHaveText("保存状態: 保存しました");}
test("real Note/FAQ/pricing editing, exact preview, history and restart",async({page})=>{
 await open(page);
 await page.locator('[data-hosted-field="note-title"] input').fill("Browser Note A");
 await page.locator('[data-hosted-field="note-description"] textarea, [data-hosted-field="note-description"] input').fill("Browser description");
 await save(page);
 await page.getByRole("button",{name:"プレビュー",exact:true}).click();await expect(page.locator("#preview-status")).toContainText("確認済み");
 await expect(page.frameLocator("#preview").locator("h1")).toContainText("Browser Note A");
 await page.locator('[data-hosted-field="note-title"] input').fill("Browser Note B");await save(page);
 await page.getByRole("button",{name:"履歴を読み込む"}).click();const revisions=page.locator("#history details");await expect(revisions).toHaveCount(3);await expect(revisions.first().locator("summary")).toHaveText(/^#\d+ \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} 項目を編集$/);
 await revisions.nth(1).locator("summary").click();await revisions.nth(1).getByRole("button").click();await expect(page.locator('[data-hosted-field="note-title"] input')).toHaveValue("Browser Note A");
 await choose(page,"faq-exam-02");await page.locator('[data-hosted-field="faq-item-answer"] textarea').fill("Browser FAQ answer");await save(page);
 await choose(page,"two-month");await page.locator('[data-hosted-field="course-price"] input').fill("¥67,890");await save(page);
 await worker.restart();await page.reload();await choose(page,"two-month");await expect(page.locator('[data-hosted-field="course-price"] input')).toHaveValue("¥67,890");
 await choose(page,"faq-exam-02");await expect(page.locator('[data-hosted-field="faq-item-answer"] textarea')).toHaveValue("Browser FAQ answer");
});
test("two tabs refuse stale writes and retain local input",async({context})=>{
 const first=await context.newPage(),second=await context.newPage();await open(first);await open(second);
 await first.locator('[data-hosted-field="note-title"] input').fill("First wins");await save(first);
 await second.locator('[data-hosted-field="note-title"] input').fill("Second retained");await second.getByRole("button",{name:"保存",exact:true}).click();
 await expect(second.locator("#host-status")).toHaveAttribute("data-phase","conflict");await expect(second.locator("#host-status")).toContainText("内容が更新されました");await expect(second.locator("#host-status")).not.toContainText("conflict");await expect(second.locator('[data-hosted-field="note-title"] input')).toHaveValue("Second retained");
 await first.close();await second.close();
});
test("lost response recovers the same operation after closing its tab; opener tabs have separate checkpoints",async({context,browser})=>{
 const page=await context.newPage();await open(page);
 const popupPromise=page.waitForEvent("popup");await page.evaluate(()=>window.open("/editor/"));const popup=await popupPromise;await expect(popup.locator('[data-hosted-field="note-title"] input')).toBeVisible();
 expect(await popup.evaluate(()=>sessionStorage.getItem("pinsel-editor-tab"))).not.toBe(await page.evaluate(()=>sessionStorage.getItem("pinsel-editor-tab")));await popup.close();
 let committed=false, committedRevision="", operationKey="";
 await page.route("**/api/hosted/rpc",async route=>{const request=route.request().postDataJSON();if(request.method==="execute"&&request.argument.kind==="set-fields"){const response=await route.fetch();expect(response.status()).toBe(200);committedRevision=(await response.json()).state.draftRevision;operationKey=request.argument.operationKey;committed=true;await route.abort("failed");}else if(request.method==="readReceipt"&&committed)await route.abort("failed");else await route.continue();});
 await page.locator('[data-hosted-field="note-title"] input').fill("Response loss retained");await page.getByRole("button",{name:"保存",exact:true}).click();await expect.poll(()=>committed).toBe(true);await expect(page.locator("#host-status")).toHaveAttribute("data-phase","recovering");
 const oldTab=await page.evaluate(()=>sessionStorage.getItem("pinsel-editor-tab"));await page.close();
 const fresh=await browser.newContext({storageState:await context.storageState()});const reopened=await fresh.newPage();await open(reopened);const chooser=reopened.getByRole("combobox",{name:"保存済み回復セッション"});const option=await chooser.locator("option").evaluateAll((options,id)=>(options.find(option=>option.value.endsWith(id!)) as HTMLOptionElement).value,oldTab);await chooser.selectOption(option);await expect(chooser.locator("option:checked")).toHaveText(/^ノート記事 · \S+ · 応答回復待ち · \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} 時点$/);await reopened.getByRole("button",{name:"このセッションを回復",exact:true}).click();await save(reopened);await expect(reopened.locator('[data-hosted-field="note-title"] input')).toHaveValue("Response loss retained");const receipt=await reopened.evaluate(async key=>(await(await fetch("/api/hosted/rpc",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({method:"readReceipt",argument:key})})).json()),operationKey);expect(receipt.operationKey).toBe(operationKey);expect(receipt.result.state.draftRevision).toBe(committedRevision);await fresh.close();
});

test("unsaved FAQ resumes visibly on reload before any save",async({page})=>{
 await open(page);await choose(page,"faq-exam-02");const answer=page.locator('[data-hosted-field="faq-item-answer"] textarea');await answer.fill("Unsaved FAQ checkpoint");await expect(page.locator("#host-status")).toHaveAttribute("data-phase","dirty");
 page.once("dialog",dialog=>dialog.accept());await page.reload();await expect(page.locator("#entry option:checked")).toContainText("faq-exam-02");await expect(answer).toHaveValue("Unsaved FAQ checkpoint");await expect(page.locator("#host-status")).toHaveAttribute("data-phase","dirty");await save(page);
});
test("history pages past the first 50 revisions and restores an older one",async({page})=>{
 test.setTimeout(240000);
 await open(page);await choose(page,"faq-exam-04");const answer=page.locator('[data-hosted-field="faq-item-answer"] textarea');
 for(let index=1;index<=55;index++){await answer.fill(`Paged answer ${index}`);await save(page);}
 await page.getByRole("button",{name:"履歴を読み込む"}).click();const revisions=page.locator("#history details");await expect(revisions).toHaveCount(50);
 const more=page.getByRole("button",{name:"さらに古い履歴を読み込む"});await more.click();await expect(revisions).toHaveCount(56);await expect(more).toHaveCount(0);
 const sequences=await revisions.locator("summary").allTextContents();expect(new Set(sequences).size).toBe(56);
 const oldest=revisions.filter({hasText:'"Paged answer 1"'});await expect(oldest).toHaveCount(1);
 await oldest.locator("summary").click();await oldest.getByRole("button").click();await expect(answer).toHaveValue("Paged answer 1");
 await choose(page,"faq-exam-05");await expect(revisions).toHaveCount(0);
});
test("an empty required field names the entry and field instead of a raw preview error",async({page})=>{
 await open(page);await choose(page,"four-month");const price=page.locator('[data-hosted-field="course-price"] input');const original=await price.inputValue();
 await price.fill("");await save(page);
 await page.getByRole("button",{name:"プレビュー",exact:true}).click();
 const status=page.locator("#preview-status");await expect(status).toContainText("コース・料金「four-month」の「価格（表示）」が空です");
 await expect(status).toHaveAttribute("data-status","error");await expect(status).not.toContainText(/error|Preview failed/);
 await price.fill(original);await save(page);await page.getByRole("button",{name:"プレビュー",exact:true}).click();await expect(status).toContainText("確認済み");
});
for(const reducedMotion of ["reduce","no-preference"] as const)test(`at 390px the preview status is brought into view after プレビュー (${reducedMotion})`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion});await open(page);
 const status=page.locator("#preview-status");await expect(status).not.toBeInViewport();
 await page.getByRole("button",{name:"プレビュー",exact:true}).click();
 await expect(status).toBeInViewport();await expect(status).toBeFocused();await expect(status).toContainText("確認済み");
});
