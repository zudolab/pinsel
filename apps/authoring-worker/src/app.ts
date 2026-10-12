import { createD1ContentDraftStorage, seedD1ContentDraftStorage } from "./storage/d1-content-draft-storage";
import { checkMutationRequest, type IdentityResolver } from "./auth/identity";
import { API_PREFIX, handleApi, handlePreview, json } from "./api/handlers";
import { BASELINE, PROJECT_ID } from "./site/baseline";

// Request pipeline: identity -> refused authoring surfaces -> CSRF for
// mutations -> API / preview -> private static assets (editor bundle, fonts,
// images). Nothing is served to an unverified request, assets included.

/** Composer authoring surfaces and structural APIs the content role never reaches, even by URL. */
export const REFUSED_PATHS = /^\/(?:composer|mapping|sitemapper|content\/schema|api\/(?:models|schema|upload|assets)|api\/v1\/(?:models|schema|upload|assets))(?:\/|$)/;

export interface AppEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}

export interface AppOptions {
  identity: IdentityResolver;
}

export function createApp(options: AppOptions) {
  let seeded: Promise<void> | null = null;
  const ensureSeeded = (db: D1Database) => (seeded ??= seedD1ContentDraftStorage(db, BASELINE, { projectId: PROJECT_ID }).then(() => undefined));

  return {
    async fetch(request: Request, env: AppEnv): Promise<Response> {
      const url = new URL(request.url);
      const identity = await options.identity(request);
      if (!identity.ok) {
        if (url.pathname.startsWith("/api/")) return json({ status: "unauthorized", code: identity.code, message: identity.message }, identity.status);
        return new Response(`${identity.status} ${identity.code}: ${identity.message}`, { status: identity.status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      }
      if (REFUSED_PATHS.test(url.pathname)) return json({ status: "forbidden", code: "forbidden", message: `${url.pathname} is not available to the content editor.` }, 403);
      if (request.method !== "GET" && request.method !== "HEAD") {
        const csrf = checkMutationRequest(request);
        if (!csrf.ok) return json({ status: "forbidden", code: csrf.code, message: csrf.message }, csrf.code === "unsupported-media-type" ? 415 : 403);
      }
      if (url.pathname === "/") return Response.redirect(`${url.origin}/editor/`, 302);
      if (url.pathname.startsWith(API_PREFIX) || url.pathname.startsWith("/preview")) {
        await ensureSeeded(env.DB);
        const context = { adapter: createD1ContentDraftStorage(env.DB, { projectId: PROJECT_ID }), actor: identity.actor, origin: url.origin };
        const handled = url.pathname.startsWith(API_PREFIX) ? await handleApi(request, url, context) : await handlePreview(url, context);
        if (handled) return handled;
        if (url.pathname.startsWith(API_PREFIX)) return json({ status: "not-found" }, 404);
      }
      if (request.method !== "GET" && request.method !== "HEAD") return json({ status: "not-found" }, 404);
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set("cache-control", "private, no-store");
      headers.set("x-robots-tag", "noindex");
      return new Response(asset.body, { status: asset.status, headers });
    },
  };
}
