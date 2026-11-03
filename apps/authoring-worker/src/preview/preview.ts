import { h } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { DocumentShell, pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import { PINSEL_ROUTES, planPathname, resolvePageMeta, type PinselRoute } from "@pinsel/content";
import { HostedContentError, type HostedSiteProjection, type HostedSnapshot } from "zudo-composer/hosted-content";
import { PACK, RENDERER } from "../site/baseline";
import { PREVIEW_STYLES } from "./styles.generated";
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
export function previewShellDocument(): string {
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/fonts/fonts.css"><style>${PREVIEW_STYLES}</style></head><body><p>プレビューを準備しています</p><script id="pinsel-preview-config" type="application/json">${safeJson({ pack: PACK, renderer: RENDERER })}</script><script type="module" src="/editor/static/preview.js"></script></body></html>`;
}
/** Render only a stored snapshot's immutable projected route through the real site renderer. */
export function renderPreviewDocument(snapshot: HostedSnapshot, route: string): string {
 if (!(PINSEL_ROUTES as readonly string[]).includes(route)) throw new HostedContentError("not-found", "Unknown preview route");
 const plan = snapshot.renderData as unknown as HostedSiteProjection;
 if (plan.status !== "ready") throw new HostedContentError("incomplete", "Snapshot projection is blocked");
 const document = plan.routes.find(item => item.pathname === planPathname(route as PinselRoute));
 if (!document) throw new HostedContentError("not-found", "Route is absent from snapshot");
 const meta = resolvePageMeta(route as PinselRoute, snapshot.providers.flatMap(provider => provider.entries));
 const identity = { snapshotId: snapshot.id, snapshotDigest: snapshot.digest, draftRevision: snapshot.draftRevision, baseline: snapshot.baseline, definition: snapshot.definition, routeId: route };
 return `<!doctype html>\n${renderToString(h(DocumentShell, { pathname: route, title: meta.title, description: meta.description, robots: "noindex,nofollow", head: [h("style", { rawHtml: PREVIEW_STYLES }), h("script", { id: "pinsel-rendered-identity", type: "application/json", rawHtml: safeJson(identity) })] }, renderRouteDocument(document, pinselRegistry)))}`;
}
export function renderRouteBody(route: Parameters<typeof renderRouteDocument>[0]): string { return renderToString(renderRouteDocument(route, pinselRegistry)); }
