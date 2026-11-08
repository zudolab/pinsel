import { readCheckpoint, readAiPointer } from "./recovery";
import { mountHostedContentEditor, createHostedPreviewController, buildHostedPreviewLocation, hostedEditorLabelsJa, hostedErrorMessagesJa, type HostedContentEditorHandle, type HostedRecoveryCheckpoint } from "zudo-composer/hosted-content/editor";
import type { ContentEntryRef, HostedPolicy, HostedSnapshot } from "zudo-composer/hosted-content";
import { mountNoteAi } from "./note-ai";
import { transport, AuthenticationExpired } from "./transport";
import { errorMessageJa, formatLocalTime, previewStatusText, revisionLabel, saveStatusText, snapshotDownloadLabel } from "./messages-ja";
import { revealPreviewStatus } from "./reveal";
import "zudo-composer/hosted-content/editor.css";
import "./host.css";

const root = document.querySelector<HTMLElement>("#editor")!;
root.innerHTML = `<header class="pinsel-header"><h1>Pinsel 編集</h1><p>ローカルの下書きと履歴。公開配信は停止中です。</p></header><main class="pinsel-workspace"><section class="pinsel-controls"><label>編集する項目 <select id="entry"></select></label><label>プレビューページ <select id="route"></select></label><p id="host-status" role="status" aria-live="polite"></p><div id="composer"></div><section id="note-ai" class="pinsel-ai"></section><section class="pinsel-history"><h2>変更履歴</h2><button id="history-refresh" type="button" class="pinsel-button">履歴を読み込む</button><div id="history"></div></section><p><a id="snapshot-download" hidden>確定スナップショットを保存</a></p><p>配信は無効です。スナップショットをダウンロードし、<code>pnpm build:snapshot -- &lt;file&gt;</code> でローカル出力できます。</p></section><section class="pinsel-preview"><h2>保存済みスナップショットのプレビュー</h2><p id="preview-status" role="status" tabindex="-1">未確認</p><iframe id="preview" title="Pinsel 実プレビュー" sandbox="allow-scripts allow-same-origin"></iframe></section></main>`;
const status = document.querySelector<HTMLElement>("#host-status")!;
const showError = (error: unknown) => { status.removeAttribute("data-phase"); status.textContent = errorMessageJa(error); };
try {
 const response = await fetch("/api/hosted/config");
 if (!response.ok) throw new Error(`Authoring unavailable (${response.status})`);
 const config = await response.json() as { actorId: string; siteId: string; policy: HostedPolicy; pack: { packId: string; packVersion: string }; renderer: { rendererId: string; rendererVersion: string }; routes: string[] };
 let state = await transport.readState();
 const entrySelect = document.querySelector<HTMLSelectElement>("#entry")!, routeSelect = document.querySelector<HTMLSelectElement>("#route")!;
 const refs: ContentEntryRef[] = [];
 for (const provider of state.providers) for (const entry of provider.entries) {
  const permission = config.policy.models.find(model => model.providerId === provider.providerId && model.modelId === entry.modelId);
  if (!permission?.fields.length || !permission.entryIds.includes(entry.id)) continue;
  const ref = { providerId: provider.providerId, modelId: entry.modelId, recordId: entry.id };
  refs.push(ref);
  const model = provider.models.find(model => model.id === entry.modelId)!;
  const option = new Option(`${model.document.name ?? model.id} · ${entry.id}`, String(refs.length - 1));
  entrySelect.add(option);
 }
 for (const route of config.routes) routeSelect.add(new Option(route, route));
 const preferred = refs.findIndex(ref => ref.modelId === "note");
 entrySelect.value = String(preferred >= 0 ? preferred : 0);
 const guessRoute = (ref: ContentEntryRef) => ref.modelId === "note" ? `/notes/${ref.recordId}/` : ref.modelId.startsWith("faq") ? "/faq/" : ref.modelId === "course" ? "/lessons/" : "/";
 routeSelect.value = guessRoute(refs[Number(entrySelect.value)]!);
 // Each tab retains its own checkpoint across refresh/restart. This prevents
 // simultaneous tabs from acknowledging one another's pending operations.
 let tab = sessionStorage.getItem("pinsel-editor-tab");
 let releaseSession: (() => void) | undefined;
 async function claimSession(id: string): Promise<(() => void) | null> {
  if (!navigator.locks) throw new Error("このブラウザには安全な編集セッションのロック機能がありません。");
  return new Promise(resolve => { void navigator.locks.request(`pinsel-editor:${config.siteId}:${config.actorId}:${id}`, { ifAvailable: true }, lock => {
   if (!lock) { resolve(null); return; }
   return new Promise<void>(release => { resolve(release); });
  }); });
 }
 if (tab) releaseSession = (await claimSession(tab)) ?? undefined;
 if (!releaseSession) { tab = crypto.randomUUID(); releaseSession = (await claimSession(tab))!; }
 sessionStorage.setItem("pinsel-editor-tab", tab!);
 window.addEventListener("pagehide", () => releaseSession?.(), { once: true });
 // Display-only sidecar outside the checkpoint prefix, so checkpoint validation never sees it.
 const recoveryTimeKey = (key: string) => key.replace("pinsel:hosted:v1:", "pinsel:hosted-time:v1:");
 let recoveryKey = `pinsel:hosted:v1:${config.siteId}:${config.actorId}:${tab}`;
 const warning=document.createElement("p");warning.id="recovery-warning";warning.setAttribute("role","status");document.querySelector(".pinsel-controls")!.prepend(warning);
 const readRecovery = (): HostedRecoveryCheckpoint | undefined => { const saved = localStorage.getItem(recoveryKey); return saved !== null ? readCheckpoint(saved,state) : undefined; };
 async function preserveInvalidRecovery() {
  try { readRecovery(); } catch {
   warning.textContent="不正または未対応の回復記録を元のキーに保持しました。自動送信・削除は行いません。新しいセッションで通常編集できます。ブラウザデータを消さず、管理者に回復記録の調査を依頼してください。";
   const fresh=crypto.randomUUID(),release=await claimSession(fresh);if(!release)throw new Error("新しい編集セッションを取得できません");
   releaseSession?.();releaseSession=release;recoveryKey=`pinsel:hosted:v1:${config.siteId}:${config.actorId}:${fresh}`;sessionStorage.setItem("pinsel-editor-tab",fresh);
  }
 }
 await preserveInvalidRecovery();
 let handle: HostedContentEditorHandle | undefined;
 let controller: ReturnType<typeof createHostedPreviewController> | undefined;
 const noteAi = mountNoteAi({ recoveryKey: `pinsel:note-ai:${config.siteId}:${config.actorId}`, onBusy(value) { entrySelect.disabled = value; routeSelect.disabled = value; }, element: document.querySelector<HTMLElement>("#note-ai")!, editor: () => handle!, preview: () => controller! });
 let selected = Number(entrySelect.value), selectedRoute = routeSelect.value;
 const initialRecovery = readRecovery();
 const pendingAiEntry = Object.keys(localStorage).filter(key=>key.startsWith(`pinsel:note-ai:${config.siteId}:${config.actorId}:`)).map(key=>readAiPointer(localStorage.getItem(key)!,key,`pinsel:note-ai:${config.siteId}:${config.actorId}`)?.entry).find(entry=>!!entry&&refs.some(ref=>ref.providerId===entry.providerId&&ref.modelId===entry.modelId&&ref.recordId===entry.recordId));
 const recoveryEntry = initialRecovery?.edits[0]?.entry ?? (initialRecovery?.pending && "entry" in initialRecovery.pending.request ? initialRecovery.pending.request.entry : undefined) ?? pendingAiEntry;
 if (recoveryEntry) {
  const index = refs.findIndex(entry => entry.providerId === recoveryEntry.providerId && entry.modelId === recoveryEntry.modelId && entry.recordId === recoveryEntry.recordId);
  if (index >= 0) { selected = index; selectedRoute = guessRoute(recoveryEntry); entrySelect.value = String(index); routeSelect.value = selectedRoute; }
 }
 let snapshotUrl: string | undefined;
 function showSnapshot(snapshot: HostedSnapshot) {
  if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
  snapshotUrl = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
  const download = document.querySelector<HTMLAnchorElement>("#snapshot-download")!;
  download.href = snapshotUrl; download.download = `pinsel-snapshot-${snapshot.id}.json`; download.hidden = false;
  download.textContent = snapshotDownloadLabel(snapshot); download.title = `スナップショットID ${snapshot.id}`;
 }
 async function mount() {
  historyLoad++; document.querySelector("#history")!.replaceChildren();
  handle?.dispose(); controller?.dispose();
  const frame = document.querySelector<HTMLIFrameElement>("#preview")!;
  controller = createHostedPreviewController({ frame, hostWindow: window, location: buildHostedPreviewLocation("/preview/", location.origin), pack: config.pack, renderer: config.renderer,
   onState(preview) {
    if(preview.status !== "rendered") noteAi.invalidate();
    const target = document.querySelector<HTMLElement>("#preview-status")!, previous = target.dataset.status;
    target.dataset.status = preview.status; target.textContent = previewStatusText(preview);
    // At one-column widths the preview sits far below the buttons that start it.
    if (preview.status === "pending" && previous !== "pending") revealPreviewStatus(target);
   },
  });
  frame.src = "/preview/";
  const entry = refs[selected]!;
  const model = state.providers.find(provider => provider.providerId === entry.providerId)!.models.find(model => model.id === entry.modelId)!;
  const permissions = config.policy.models.find(model => model.providerId === entry.providerId && model.modelId === entry.modelId)!.fields;
  const fieldId = model.document.fields.find(field => permissions.some(permission => permission.fieldId === field.id) && !["reference", "reference-list", "slug", "asset-use"].includes(field.kind))!.id;
  handle = mountHostedContentEditor(document.querySelector<HTMLElement>("#composer")!, { transport, policy: { ...config.policy, models: config.policy.models.map(model => ({ ...model, entryIds: model.providerId === entry.providerId && model.modelId === entry.modelId ? [entry.recordId] : [] })) }, selection: { entry, fieldId }, presentation: "record", routeId: selectedRoute, submission: false,
   preview: controller, createOperationKey: () => crypto.randomUUID(), recovery: readRecovery(), persistRecovery(checkpoint) { localStorage.setItem(recoveryKey, JSON.stringify(checkpoint)); try { localStorage.setItem(recoveryTimeKey(recoveryKey), new Date().toISOString()); } catch { /* the time is a label only */ } },
   isAuthenticationExpired: error => error instanceof AuthenticationExpired, onAuthenticationExpired: showError,
   labels: { ...hostedEditorLabelsJa, submit: "公開は無効です" }, errorMessages: hostedErrorMessagesJa,
  });
  handle.subscribe(next => { if(next.dirty || next.pending) noteAi.invalidate(); status.dataset.phase = next.phase; status.textContent = saveStatusText(next); if (next.reviewedSnapshot) showSnapshot(next.reviewedSnapshot); });
  await handle.ready;
  await noteAi.select(entry);
 }
 async function switchSelection() {
  try { await handle?.flush(); if (handle?.state.dirty || handle?.state.pending) throw new Error("保存・回復を完了してから移動してください"); selected = Number(entrySelect.value); selectedRoute = routeSelect.value; await mount(); }
  catch(error) { entrySelect.value = String(selected); routeSelect.value = selectedRoute; showError(error); }
 }
 entrySelect.onchange = () => { routeSelect.value = guessRoute(refs[Number(entrySelect.value)]!); void switchSelection(); };
 routeSelect.onchange = () => { void switchSelection(); };
 // History is paged by the Composer cursor; each load is bound to the entry it
 // was started for, so switching entries never mixes two entries' revisions.
 let historyLoad = 0;
 async function loadHistory(cursor?: string) {
  const load = ++historyLoad, entry = refs[selected]!, list = document.querySelector("#history")!;
  try {
   const page = await transport.listRevisions!({ entry, limit: 50, ...(cursor ? { cursor } : {}) });
   if (load !== historyLoad || entry !== refs[selected]) return;
   if (!cursor) list.replaceChildren();
   list.querySelector(".pinsel-history-more")?.remove();
   for (const revision of page.revisions) {
    const item = document.createElement("details"), summary = document.createElement("summary"), values = document.createElement("pre"), restore = document.createElement("button");
    summary.textContent = revisionLabel(revision); summary.title = revision.createdAt; if (revision.source === "content-ai") item.dataset.source = "content-ai";
    values.textContent = JSON.stringify(revision.values, null, 2); restore.textContent = "この履歴を新しい下書きとして復元"; restore.type = "button"; restore.className = "pinsel-button";
    restore.onclick = async () => { try { await handle!.restore(entry, revision.id); status.textContent = "履歴を復元しました。プレビューで確認できます。"; } catch(error) { showError(error); } };
    item.append(summary, values, restore); list.append(item);
   }
   if (!cursor && !page.revisions.length) list.textContent = "まだ編集履歴はありません。";
   if (page.nextCursor) {
    const more = document.createElement("button"), next = page.nextCursor;
    more.className = "pinsel-history-more pinsel-button"; more.type = "button"; more.textContent = "さらに古い履歴を読み込む";
    more.onclick = () => { more.disabled = true; void loadHistory(next).finally(() => { more.disabled = false; }); };
    list.append(more);
   }
  } catch(error) { showError(error); }
 }
 document.querySelector<HTMLButtonElement>("#history-refresh")!.onclick = () => loadHistory();
 // Discover outstanding sessions even after closing the browser and reopening
 // the root URL. Selecting one is explicit: concurrent tabs never share silently.
 const recoveryPanel = document.createElement("section"), recoveryLabel = document.createElement("label"), recoverySelect = document.createElement("select"), recoveryButton = document.createElement("button");
 recoverySelect.setAttribute("aria-label", "保存済み回復セッション"); recoverySelect.add(new Option("未完了の編集セッション", ""));
 const prefix = `pinsel:hosted:v1:${config.siteId}:${config.actorId}:`;
 function recoveryOptionLabel(key: string, checkpoint: HostedRecoveryCheckpoint) {
  const ref = checkpoint.edits[0]?.entry ?? (checkpoint.pending && "entry" in checkpoint.pending.request ? checkpoint.pending.request.entry : undefined);
  const index = ref ? refs.findIndex(item => item.providerId === ref.providerId && item.modelId === ref.modelId && item.recordId === ref.recordId) : -1;
  const target = index >= 0 ? entrySelect.options[index]!.text : ref ? `${ref.modelId} · ${ref.recordId}` : "スナップショット保存";
  const savedAt = localStorage.getItem(recoveryTimeKey(key));
  return `${target} · ${checkpoint.pending ? "応答回復待ち" : "未保存"} · ${savedAt ? `${formatLocalTime(savedAt)} 時点` : "記録時刻不明"}`;
 }
 for (let index = 0; index < localStorage.length; index++) {
  const key = localStorage.key(index)!;
  if (!key.startsWith(prefix) || key === recoveryKey) continue;
  try { const checkpoint = readCheckpoint(localStorage.getItem(key)!,state); if (checkpoint.pending || checkpoint.edits?.length) recoverySelect.add(new Option(recoveryOptionLabel(key, checkpoint), key)); } catch { warning.textContent="不正または未対応の回復記録を保持しています。自動送信・削除は行いません。ブラウザデータを消さず管理者に調査を依頼してください。"; }
 }
 recoveryButton.textContent = "このセッションを回復"; recoveryButton.type = "button"; recoveryButton.className = "pinsel-button";
 recoveryButton.onclick = async () => {
  if (!recoverySelect.value) return;
  try {
   if (handle?.state.dirty || handle?.state.pending) throw new Error("現在のタブの保存・回復を先に完了してください");
   readCheckpoint(localStorage.getItem(recoverySelect.value)!,state);
   const release = await claimSession(recoverySelect.value.slice(prefix.length));
   if (!release) throw new Error("このセッションは別のタブで開いています。そのタブを閉じてから回復してください。");
   releaseSession?.(); releaseSession = release;
   recoveryKey = recoverySelect.value; sessionStorage.setItem("pinsel-editor-tab", recoveryKey.slice(prefix.length));
   const recovery = readRecovery();
   const ref = recovery?.edits[0]?.entry ?? (recovery?.pending && "entry" in recovery.pending.request ? recovery.pending.request.entry : undefined);
   if (ref) { const index = refs.findIndex(item => item.providerId === ref.providerId && item.modelId === ref.modelId && item.recordId === ref.recordId); if (index >= 0) { selected = index; entrySelect.value = String(index); selectedRoute = guessRoute(ref); routeSelect.value = selectedRoute; } }
   await mount(); status.textContent = "回復セッションを読み込みました。「保存」で同じ操作の結果を確認します。";
  } catch(error) { showError(error); }
 };
 recoveryPanel.className = "pinsel-recovery"; recoveryLabel.textContent = "保存済み回復セッション"; recoveryLabel.append(recoverySelect);
 recoveryPanel.append(recoveryLabel, recoveryButton); document.querySelector(".pinsel-controls")!.prepend(recoveryPanel);
 await mount();
 window.addEventListener("beforeunload", event => { if (handle?.state.dirty || handle?.state.pending) { event.preventDefault(); event.returnValue = ""; } });
} catch(error) { showError(error); }
