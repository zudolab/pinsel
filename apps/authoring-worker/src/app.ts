import { HostedContentError, type HostedActor } from "zudo-composer/hosted-content";
import { checkMutationRequest, type IdentityResolver } from "./auth/identity";
import { POLICY, PACK, RENDERER, ROUTES, serviceFor } from "./site/baseline";
import { PreviewBlockedError, previewShellDocument, renderPreviewDocument } from "./preview/preview";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "private, no-store" } });
export function createApp(options: { identity: IdentityResolver; localAi?: (request: Request, env: Env, actor: HostedActor) => Promise<Response | null> }) {
 return { async fetch(request: Request, env: Env): Promise<Response> {
  const identity = await options.identity(request);
  if (!identity.ok) return json({ error: { code: identity.code, message: identity.message } }, identity.status);
  const url = new URL(request.url), actor = identity.actor;
  if (request.method !== "GET" && request.method !== "HEAD") {
   const csrf = checkMutationRequest(request);
   if (!csrf.ok) return json({ error: { code: "forbidden", message: csrf.message } }, 403);
  }
  try {
   if (url.pathname === "/") return Response.redirect(`${url.origin}/editor/`, 302);
   if (url.pathname === "/api/hosted/config") return json({ actorId: actor.id, siteId: "pinsel", policy: POLICY, pack: PACK, renderer: RENDERER, routes: ROUTES, publication: "disabled" });
   const aiResponse = await options.localAi?.(request, env, actor);
   if (aiResponse) return aiResponse;
   if (url.pathname.startsWith("/api/hosted/") || url.pathname.startsWith("/preview")) {
    const service = await serviceFor(env.DB);
    if (url.pathname === "/api/hosted/state" && request.method === "GET") return json(await service.readState(actor));
    if (url.pathname === "/api/hosted/snapshot" && request.method === "GET") return json(await service.readSnapshot(actor, url.searchParams.get("id") ?? ""));
    if (url.pathname === "/api/hosted/rpc" && request.method === "POST") {
     const input = await request.json() as { method: string; argument?: unknown };
     // Explicit bounded dispatch: no caller-selected object method or host tools.
     switch (input.method) {
      case "execute": return json(await service.execute(actor, input.argument));
      case "readState": return json(await service.readState(actor));
      case "readReceipt": return json(await service.readReceipt(actor, input.argument as string));
      case "getPublication": return json(await service.getPublication(actor, input.argument as string));
      case "listModels": return json(await service.listModels(actor));
      case "listEntries": return json(await service.listEntries(actor, input.argument as Parameters<typeof service.listEntries>[1]));
      case "readEntry": return json(await service.readEntry(actor, input.argument as Parameters<typeof service.readEntry>[1]));
      case "listRevisions": return json(await service.listRevisions(actor, input.argument as Parameters<typeof service.listRevisions>[1]));
      case "readRevision": return json(await service.readRevision(actor, input.argument as string));
      case "compareRevisions": return json(await service.compareRevisions(actor, input.argument as Parameters<typeof service.compareRevisions>[1]));
      case "previewFields": return json(await service.previewFields(actor, input.argument as Parameters<typeof service.previewFields>[1]));
      case "readPublicationStatus": return json(await service.readPublicationStatus(actor));
      default: throw new HostedContentError("invalid-request", "Unknown hosted operation");
     }
    }
    if (url.pathname === "/preview/" && request.method === "GET") return new Response(previewShellDocument(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/preview/document" && request.method === "GET") {
     const snapshot = await service.readSnapshot(actor, url.searchParams.get("snapshot") ?? "");
     if (url.searchParams.get("digest") !== snapshot.digest) throw new HostedContentError("invalid-request", "Snapshot digest mismatch");
     const html = renderPreviewDocument(snapshot, url.searchParams.get("route") ?? "");
     return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    return json({ error: { code: "not-found", message: "Unknown route" } }, 404);
   }
   if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return json({ error: { code: "forbidden", message: "This API is unavailable" } }, 403);
   const response = await env.ASSETS.fetch(request);
   const headers = new Headers(response.headers); headers.set("cache-control", "private, no-store"); headers.set("x-content-type-options", "nosniff");
   return new Response(response.body, { status: response.status, headers });
  } catch(error) {
   if (error instanceof PreviewBlockedError) return json({ error: { code: error.code, message: error.message, diagnostics: error.incomplete } }, 400);
   if (error instanceof HostedContentError) return json({ error: { code: error.code, message: error.message, diagnostics: error.diagnostics, restoreDiagnostics: error.restoreDiagnostics } }, error.code === "not-found" ? 404 : error.code === "forbidden" ? 403 : /conflict|reuse/.test(error.code) ? 409 : 400);
   console.error("Hosted request failed", error);
   return json({ error: { code: "unavailable", message: "Request outcome uncertain. Retry Save with the same operation key to recover." } }, 503);
  }
 } };
}
