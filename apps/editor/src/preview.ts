import { createHostedPreviewHost } from "zudo-composer/hosted-content/preview";
import { previewFailureMessage } from "./preview-messages";
const config = JSON.parse(document.querySelector("#pinsel-preview-config")!.textContent!);
const host = createHostedPreviewHost({ hostWindow: window, parent: window.parent, origin: location.origin, ...config, frameSession: crypto.randomUUID(),
 async render(request, context) {
  try { await renderSnapshot(request, context); }
  catch (error) {
   // A failed render must not leave the loading text or an older snapshot looking current.
   if (context.isCurrent()) { const notice = document.createElement("p"); notice.textContent = "このスナップショットはプレビューできませんでした。編集画面のメッセージを確認してください。"; document.body.className = ""; document.body.replaceChildren(notice); }
   throw error;
  }
 }
});
async function renderSnapshot(request: Parameters<Parameters<typeof createHostedPreviewHost>[0]["render"]>[0], context: Parameters<Parameters<typeof createHostedPreviewHost>[0]["render"]>[1]) {
  const params = new URLSearchParams({ snapshot: request.snapshotId, digest: request.snapshotDigest, route: request.routeId });
  if (request.snapshotId.startsWith("ai-")) params.set("proposal", request.snapshotId.slice(3));
  const endpoint = request.snapshotId.startsWith("ai-") ? "/preview/ai-document" : "/preview/document";
  const response = await fetch(`${endpoint}?${params}`, { signal: context.signal });
  if (!response.ok) throw new Error(previewFailureMessage(response.status, await response.json().catch(() => null)));
  const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
  const identity = JSON.parse(parsed.querySelector("#pinsel-rendered-identity")?.textContent ?? "null");
  if (!identity || ["snapshotId", "snapshotDigest", "draftRevision", "definition", "routeId"].some(key => identity[key] !== request[key as keyof typeof request]) || identity.baseline.gitSha !== request.baseline.gitSha || identity.baseline.contentDigest !== request.baseline.contentDigest) throw new Error("表示されたプレビューが要求したスナップショットと一致しません。もう一度プレビューしてください。");
  if (!context.isCurrent()) return;
  // The host script keeps running while the visitor body is replaced. Snapshot
  // data cannot inject executable scripts: the shared renderer escapes fields.
  parsed.body.querySelectorAll("script").forEach(script => script.remove());
  parsed.querySelectorAll("img").forEach(image => { image.loading = "eager"; });
  document.body.className = parsed.body.className;
  for (const name of ["lang", "id", "data-motion"]) { const value = parsed.documentElement.getAttribute(name); if (value !== null) document.documentElement.setAttribute(name, value); }
  document.body.replaceChildren(...Array.from(parsed.body.childNodes));
  document.title = parsed.title;
  await Promise.all(Array.from(document.images).map(async image => {
   if (!image.complete) await new Promise<void>((resolve, reject) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => reject(new Error(`プレビューの画像を読み込めません: ${image.src}`)), { once: true }); });
   if (!image.naturalWidth) throw new Error(`プレビューの画像を読み込めません: ${image.src}`);
   await image.decode();
  }));
  await document.fonts.ready;
  if (!context.isCurrent()) return;
}
host.ready();
window.addEventListener("pagehide", () => host.dispose(), { once: true });
