import { createD1ContentDraftStorage, seedD1ContentDraftStorage } from "./storage/d1-content-draft-storage";
import { checkMutationRequest, type IdentityResolver } from "./auth/identity";
import { API_PREFIX, handleApi, handlePreview, json, type ApiContext } from "./api/handlers";
import { selectPublisher, type PublisherEnv, type PublisherFactory } from "./publish/port";
import { PINSEL_SITE, type AuthoringSite } from "./site/baseline";

// Request pipeline: identity -> refused authoring surfaces -> CSRF for
// mutations -> API / preview / injected admin routes -> private static assets
// (editor bundle, fonts, images). Nothing is served to an unverified request,
// assets included.

/** Composer authoring surfaces and structural APIs the content role never reaches, even by URL. */
export const REFUSED_PATHS = /^\/(?:composer|mapping|sitemapper|content\/schema|api\/(?:models|schema|upload|assets)|api\/v1\/(?:models|schema|upload|assets))(?:\/|$)/;

export interface AppEnv extends PublisherEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}

/** A route only some entries compile in (the local seed endpoint); returns null when the path is not its own. */
export type AdminHandler = (request: Request, url: URL, context: ApiContext) => Promise<Response | null>;

export interface AppOptions {
  identity: IdentityResolver;
  /** Defaults to Pinsel; tests inject other sites. */
  site?: AuthoringSite;
  /** Providers this build can select through `PUBLISHER_PROVIDER`; production registers none until the GitHub provider lands. */
  publishers?: Readonly<Record<string, PublisherFactory>>;
  admin?: AdminHandler;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

function identityPage(status: number, code: string, message: string): Response {
  const body = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${status} ${escapeHtml(code)}</title></head><body><h1>アクセスできません</h1><p>${escapeHtml(message)}</p><p><code>${status} ${escapeHtml(code)}</code></p></body></html>`;
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export function createApp(options: AppOptions) {
  const site = options.site ?? PINSEL_SITE;
  const publishers = options.publishers ?? {};
  let seeded: Promise<void> | null = null;
  const ensureSeeded = (db: D1Database) =>
    (seeded ??= seedD1ContentDraftStorage(db, site.canonical, { projectId: site.projectId })
      .then(() => undefined)
      .catch((error: unknown) => {
        seeded = null;
        throw error;
      }));

  return {
    async fetch(request: Request, env: AppEnv): Promise<Response> {
      const url = new URL(request.url);
      const identity = await options.identity(request);
      if (!identity.ok) {
        if (url.pathname.startsWith("/api/")) return json({ status: "unauthorized", code: identity.code, message: identity.message }, identity.status);
        return identityPage(identity.status, identity.code, identity.message);
      }
      if (REFUSED_PATHS.test(url.pathname)) return json({ status: "forbidden", code: "forbidden", message: `${url.pathname} is not available to the content editor.` }, 403);
      if (request.method !== "GET" && request.method !== "HEAD") {
        const csrf = checkMutationRequest(request);
        if (!csrf.ok) return json({ status: "forbidden", code: csrf.code, message: csrf.message }, csrf.code === "unsupported-media-type" ? 415 : 403);
      }
      if (url.pathname === "/") return Response.redirect(`${url.origin}/editor/`, 302);
      const isApi = url.pathname.startsWith(API_PREFIX);
      const isAdmin = url.pathname.startsWith("/admin/");
      if (isApi || isAdmin || url.pathname.startsWith("/preview")) {
        try {
          const context: ApiContext = {
            db: env.DB,
            adapter: createD1ContentDraftStorage(env.DB, { projectId: site.projectId }),
            actor: identity.actor,
            origin: url.origin,
            site,
            publisher: selectPublisher(env as AppEnv & Record<string, unknown>, publishers),
          };
          // The admin seed decides for itself whether to seed; every other route reads a seeded store.
          if (isAdmin) {
            const handled = options.admin ? await options.admin(request, url, context) : null;
            return handled ?? json({ status: "not-found" }, 404);
          }
          await ensureSeeded(env.DB);
          const handled = isApi ? await handleApi(request, url, context) : await handlePreview(url, context);
          if (handled) return handled;
        } catch (error) {
          // Storage failures (for example unapplied migrations) are reported, never left as an opaque 500.
          return json({ status: "unavailable", message: error instanceof Error ? error.message : String(error) }, 503);
        }
        if (isApi) return json({ status: "not-found" }, 404);
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
