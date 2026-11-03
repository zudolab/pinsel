import { readAiPointer } from "./recovery";
import type { ContentAiOperation, ContentAiPrepareResult, ContentAiStatus, ContentEntryRef, HostedSnapshot } from "zudo-composer/hosted-content";
import type { HostedContentEditorHandle, HostedPreviewController } from "zudo-composer/hosted-content/editor";
type Options = { element: HTMLElement; recoveryKey: string; onBusy(value: boolean): void; editor(): HostedContentEditorHandle; preview(): HostedPreviewController };
async function ai<T>(operation: string, payload: unknown = {}): Promise<T> {
 const response = await fetch("/api/hosted/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, payload }), ...(operation==="content-ai-status"?{signal:AbortSignal.timeout(7000)}:{}) });
 const body = await response.json();
 if (!response.ok || !body.ok) throw Object.assign(new Error(`${body.error?.code ?? "unavailable"}: ${body.error?.message ?? "AI request outcome uncertain. Read/retry the saved proposal to recover."}`), { code: body.error?.code, uncertain: response.status >= 500 });
 return body.value as T;
}
export function mountNoteAi(options: Options) {
 const panel = options.element;
 panel.innerHTML = `<h2>Note AI — タイトル・本文</h2><p id="ai-provider" role="status"></p><button id="ai-recheck" type="button">providerを再確認</button><p id="ai-recovery-warning" role="status"></p><label>変更の指示<textarea id="ai-instruction" maxlength="2000" rows="3"></textarea></label><button id="ai-prepare" type="button">提案を作る</button><label>保存済み提案<select id="ai-proposals"><option value="">選択してください</option></select></label><button id="ai-read" type="button">提案・結果を再確認</button><p id="ai-status" role="status"></p><div id="ai-diff"></div><div class="ai-actions"><button id="ai-preview" type="button" disabled>候補を実プレビュー</button><button id="ai-apply" type="button" disabled>明示的に適用して保存</button><button id="ai-undo" type="button" disabled>適用をUndo</button></div>`;
 const get = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
 const status = get("ai-status"), select = get<HTMLSelectElement>("ai-proposals"), instruction = get<HTMLTextAreaElement>("ai-instruction");
 let entry: ContentEntryRef | null = null, operation: ContentAiOperation | null = null, renderedIdentity: unknown = null, busy = false, loading = false, generation = 0, providerReady = false, checking = false;
 const sameEntry = (left: ContentEntryRef | null, right: ContentEntryRef | null) => !!left && !!right && left.providerId === right.providerId && left.modelId === right.modelId && left.recordId === right.recordId;
 const state = () => {
  select.disabled = busy || loading; get<HTMLButtonElement>("ai-read").disabled = busy || loading; instruction.disabled = busy || loading;
  get<HTMLButtonElement>("ai-prepare").disabled = busy || loading || checking || !providerReady;
  get<HTMLButtonElement>("ai-recheck").disabled = busy || checking;
  get<HTMLButtonElement>("ai-preview").disabled = busy || loading || !operation || !!operation.applied;
  get<HTMLButtonElement>("ai-apply").disabled = busy || loading || !operation || !!operation.undone || (!operation.applied && !renderedIdentity);
  get<HTMLButtonElement>("ai-undo").disabled = busy || loading || !operation?.applied || !!operation.undone;
 };
 const safe = async (work: () => Promise<void>) => { if(busy || loading)return; busy=true;options.onBusy(true);state();try{await work();}catch(error){status.textContent=error instanceof Error?error.message:String(error);}finally{busy=false;options.onBusy(false);state();} };
 function draw() {
  const diff=get("ai-diff");diff.replaceChildren();
  if(!operation){state();return;}
  const summary=document.createElement("p");summary.textContent=`${operation.proposal.provider}: ${operation.proposal.summary}`;diff.append(summary);
  for(const change of operation.proposal.differences){const row=document.createElement("details"),label=document.createElement("summary"),before=document.createElement("pre"),after=document.createElement("pre");row.open=true;label.textContent=change.label;before.textContent=`変更前\n${String(change.before??"")}`;after.textContent=`提案\n${String(change.after??"")}`;row.append(label,before,after);diff.append(row);}
  status.textContent=operation.undone?`Undo保存済み ${operation.undone.revisionId}`:operation.applied?`適用・保存済み ${operation.applied.revisionId}`:"提案はまだ保存内容へ適用されていません。差分と実プレビューを確認してください。";
  state();
 }
 const pendingActions = () => Object.keys(localStorage).filter(key => key.startsWith(`${options.recoveryKey}:`)).flatMap(key => {
  const value=readAiPointer(localStorage.getItem(key)!,key,options.recoveryKey);
  if(!value){get("ai-recovery-warning").textContent="不正または未対応のAI回復記録を保持しています。自動送信・削除せず、保存済み提案から結果を確認してください。";return [];}
  return [{key,value}];
 });
 async function checkProvider(current=generation) {
  checking=true;providerReady=false;state();
  try { const value=await ai<ContentAiStatus>("content-ai-status");if(current!==generation)return;
   providerReady=value?.configured===true && value.inference?.state==="ready";
   get("ai-provider").textContent=value?.configured?`${value.provider} — ${value.inference?.state ?? "unknown"}: ${value.inference && ("detail" in value.inference?value.inference.detail:value.inference.message) || "状態を確認できません"}`:"AI host未設定。pnpm dev:dogfoodで起動してください。";
  }catch {if(current===generation)get("ai-provider").textContent="provider状態の取得に失敗しました。起動・認証を確認して「providerを再確認」を押してください。";}
  finally {if(current===generation){checking=false;if(!providerReady)get("ai-provider").textContent+=" 新規提案は停止中です。起動・認証を確認し、providerを再確認してください。保存済み提案・Undo・通常編集は利用できます。";state();}}
 }
 get<HTMLButtonElement>("ai-recheck").onclick=()=>{void checkProvider();};

 async function read() {
  const id=select.value, current=generation;operation=null;renderedIdentity=null;draw();if(!id)return;
  const value=await ai<ContentAiOperation>("content-ai-read",{proposalId:id});if(current!==generation||id!==select.value)return;if(!sameEntry(value.proposal.entry,entry))throw new Error("提案の編集対象が一致しません。対象Noteを再選択してください。");operation=value;
  for(const pending of pendingActions())if(pending.value.proposalId===operation.proposal.id&&sameEntry(pending.value.entry,operation.proposal.entry)&&((pending.value.action==="apply"&&operation.applied)||(pending.value.action==="undo"&&operation.undone)))localStorage.removeItem(pending.key);
  draw();
 }
 async function list(requestedEntry = entry, current = generation) {
  const records=await ai<{id:string;createdAt:string;summary:string;provider:string}[]>("pinsel-ai-list",{entry:requestedEntry});
  if(current!==generation || !sameEntry(requestedEntry,entry))return;
  const previous=select.value;select.replaceChildren(new Option("選択してください",""));
  for(const record of records)select.add(new Option(`${record.createdAt} · ${record.provider} · ${record.summary.slice(0,60)}`,record.id));
  if(records.some(record=>record.id===previous))select.value=previous;
 }
 async function mutate(action: "apply" | "undo", payload: { proposalId: string; renderedIdentity?: unknown }) {
  const key=`${options.recoveryKey}:${payload.proposalId}:${action}`;
  const previous=localStorage.getItem(key);if(previous!==null&&(!readAiPointer(previous,key,options.recoveryKey)||!sameEntry(readAiPointer(previous,key,options.recoveryKey)!.entry,entry)))throw new Error("この操作の不正または未対応の回復記録を保持しています。再送せず管理者へ調査を依頼してください。");
  localStorage.setItem(key,JSON.stringify({version:1,entry,proposalId:payload.proposalId,action}));
  try { return await ai(`content-ai-${action}`,payload); }
  catch(error) {
   const failure=error as {code?:string;uncertain?:boolean};
   if(!failure.uncertain&&["invalid-request","invalid-value","forbidden","not-found","revision-conflict","baseline-conflict","definition-conflict","operation-key-reuse"].includes(failure.code??""))localStorage.removeItem(key);
   throw error;
  }
 }
 const clean = () => { const value=options.editor().state;if(value.dirty||value.pending)throw new Error("通常編集の保存・回復を完了してからAI操作を実行してください。"); };
 get<HTMLButtonElement>("ai-prepare").onclick=()=>{void safe(async()=>{clean();if(!providerReady)throw new Error("providerを再確認してください。");renderedIdentity=null;const result=await ai<ContentAiPrepareResult>("content-ai-prepare",{entry,instruction:instruction.value});if(result.status==="refused"){status.textContent=result.message;return;}await list();select.value=result.proposal.id;await read();});};
 get<HTMLButtonElement>("ai-read").onclick=()=>{void safe(read);};select.onchange=()=>{void safe(read);};
 get<HTMLButtonElement>("ai-preview").onclick=()=>{void safe(async()=>{
  clean();renderedIdentity=null;const proposal=operation!.proposal, expectedGeneration=generation;
  const candidate=await ai<{snapshot:HostedSnapshot;route:string;candidateDigest:string}>("pinsel-ai-preview",{proposalId:proposal.id});
  const result=await options.preview().render(candidate.snapshot,candidate.route);clean();
  if(expectedGeneration!==generation||operation?.proposal.id!==proposal.id||select.value!==proposal.id)throw new Error("編集対象が変わりました。候補を再確認してください。");
  renderedIdentity={proposalId:proposal.id,candidateDigest:candidate.candidateDigest,snapshotId:result.snapshotId,snapshotDigest:result.snapshotDigest,draftRevision:result.draftRevision,baseline:result.baseline,definition:result.definition,routeId:result.routeId,packId:result.packId,packVersion:result.packVersion,rendererId:result.rendererId,rendererVersion:result.rendererVersion};
  status.textContent="この候補の実プレビューを確認しました。適用はまだ行われていません。";
 });};
 get<HTMLButtonElement>("ai-apply").onclick=()=>{void safe(async()=>{clean();if(!operation || select.value!==operation.proposal.id || !sameEntry(operation.proposal.entry,entry))throw new Error("選択中の提案を再確認してください。");
  if(!operation!.applied){const preview=options.preview().state,proof=renderedIdentity as {snapshotId?:string;snapshotDigest?:string;routeId?:string}|null;if(!proof||preview.status!=="rendered"||preview.result.snapshotId!==proof.snapshotId||preview.result.snapshotDigest!==proof.snapshotDigest||preview.result.routeId!==proof.routeId)throw new Error("候補プレビューが無効になりました。再度確認してください。");}
  await mutate("apply",{proposalId:operation!.proposal.id,...(renderedIdentity?{renderedIdentity}:{})});await options.editor().refresh();await read();});};
 get<HTMLButtonElement>("ai-undo").onclick=()=>{void safe(async()=>{clean();if(!operation || select.value!==operation.proposal.id || !sameEntry(operation.proposal.entry,entry))throw new Error("選択中の提案を再確認してください。");await mutate("undo",{proposalId:operation!.proposal.id});await options.editor().refresh();await read();});};
 return {
  async select(next:ContentEntryRef){entry=next;generation++;providerReady=false;checking=false;loading=true;const current=generation;operation=null;renderedIdentity=null;select.replaceChildren(new Option("選択してください",""));panel.hidden=entry.modelId!=="note";draw();if(panel.hidden){loading=false;state();return;}
   void checkProvider(current);
   try{await list(next,current);if(current!==generation || !sameEntry(next,entry))return;
    const pending=pendingActions().map(item=>item.value).find(value=>value.entry?.providerId===entry!.providerId&&value.entry.modelId===entry!.modelId&&value.entry.recordId===entry!.recordId);
    if(pending){select.value=pending.proposalId;if(select.value)await read();}
   }catch(error){if(current===generation)status.textContent=String(error);}finally{if(current===generation){loading=false;state();}}
  },
  invalidate(){renderedIdentity=null;state();},
 };
}
