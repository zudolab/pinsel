import { createHostedPreviewHost } from "zudo-composer/hosted-content/preview";
const config = JSON.parse(document.querySelector("#pinsel-preview-config")!.textContent!);
const host = createHostedPreviewHost({ hostWindow: window, parent: window.parent, origin: location.origin, ...config, frameSession: crypto.randomUUID(),
 async render(request, context) {
  const params = new URLSearchParams({ snapshot: request.snapshotId, digest: request.snapshotDigest, route: request.routeId });
  const response = await fetch(`/preview/document?${params}`, { signal: context.signal });
  if (!response.ok) throw new Error(`Preview failed (${response.status})`);
  const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
  const identity = JSON.parse(parsed.querySelector("#pinsel-rendered-identity")?.textContent ?? "null");
  if (!identity || ["snapshotId", "snapshotDigest", "draftRevision", "definition", "routeId"].some(key => identity[key] !== request[key as keyof typeof request]) || identity.baseline.gitSha !== request.baseline.gitSha || identity.baseline.contentDigest !== request.baseline.contentDigest) throw new Error("Rendered snapshot identity mismatch");
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
   if (!image.complete) await new Promise<void>((resolve, reject) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => reject(new Error(`Missing preview image: ${image.src}`)), { once: true }); });
   if (!image.naturalWidth) throw new Error(`Missing preview image: ${image.src}`);
   await image.decode();
  }));
  await document.fonts.ready;
  if (!context.isCurrent()) return;
 }
});
host.ready();
window.addEventListener("pagehide", () => host.dispose(), { once: true });
