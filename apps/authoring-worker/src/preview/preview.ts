import { h, type Child } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { DocumentShell, PINSEL_PACK_ID, PINSEL_PACK_VERSION, pinselPack, pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import { PINSEL_ROUTES, planPathname, resolvePageMeta, type PageMeta, type PinselRoute } from "@pinsel/content";
import { compileSiteProjectPlan } from "zudo-composer/content";
import type { ContentBaseline, ContentSnapshotRecord } from "zudo-composer/host-storage";
import { previewClientScript, type PreviewIdentity } from "./preview-client";
import { PREVIEW_STYLES } from "./styles.generated";

// The private preview document the editor's iframe loads. It is the SAME
// renderer as the public site (portable projection -> renderRouteDocument ->
// zudo-react server render) plus one inline client for the host preview
// protocol: announce `ready` with a fresh frameLoadId, acknowledge `rendered`
// when the parent's render request names exactly this document's snapshot,
// revision and route, otherwise navigate to that document. No Preact, no
// client-side rendering.

export const PREVIEW_PACK = { packId: PINSEL_PACK_ID, packVersion: PINSEL_PACK_VERSION } as const;

export type { PreviewIdentity } from "./preview-client";

export type PreviewRenderOutcome =
  | { status: "ok"; html: string; identity: PreviewIdentity }
  | { status: "unknown-route" | "revision-mismatch"; html: string; message: string }
  | { status: "blocked"; message: string };

/** An approved output route (`/lessons/`) and its compiled-plan pathname (`/lessons`); other sites' routes pass through. */
function pinselRoute(route: string): PinselRoute | undefined {
  return (PINSEL_ROUTES as readonly string[]).includes(route) ? (route as PinselRoute) : undefined;
}

export function planPathFor(route: string): string {
  const known = pinselRoute(route);
  return known ? planPathname(known) : route;
}

function metaFor(snapshot: ContentSnapshotRecord, route: string): PageMeta {
  const known = pinselRoute(route);
  if (known) {
    try {
      return resolvePageMeta(known, snapshot.project.providers.content.flatMap((provider) => provider.entries));
    } catch {
      // A snapshot without the route's page copy still previews, under a generic title.
    }
  }
  return { title: `Pinsel preview ${route}`, description: "" };
}

function document(options: { pathname: string; title: string; description?: string; body: Child; self: PreviewIdentity | null; error: string | null }): string {
  const head = [
    h("style", { rawHtml: PREVIEW_STYLES }),
    h("script", { rawHtml: previewClientScript(PREVIEW_PACK, options.self, options.error) }),
  ];
  return `<!doctype html>\n${renderToString(
    h(DocumentShell, { pathname: options.pathname, title: options.title, description: options.description ?? "", robots: "noindex,nofollow", head }, options.body),
  )}`;
}

/** The empty frame the editor loads first; every render request navigates it to a snapshot document. */
export function previewShellDocument(): string {
  return document({ pathname: "/preview/", title: "Pinsel preview", body: h("p", { class: "preview-waiting", hidden: true }, "preview"), self: null, error: null });
}

/** The snapshot's route rendered with the public renderer; `requestedRevision` must equal the snapshot's draft revision. */
export async function renderPreviewDocument(snapshot: ContentSnapshotRecord, route: string, requestedRevision: number | null): Promise<PreviewRenderOutcome> {
  const identity: PreviewIdentity = { snapshotId: snapshot.snapshotId, revision: requestedRevision ?? snapshot.draftRevision, route };
  if (requestedRevision !== null && requestedRevision !== snapshot.draftRevision) {
    const message = `Snapshot ${snapshot.snapshotId.slice(0, 12)} was captured at revision ${snapshot.draftRevision}, not ${requestedRevision}.`;
    return { status: "revision-mismatch", message, html: document({ pathname: route, title: "Pinsel preview", body: h("p", { class: "preview-error" }, message), self: identity, error: message }) };
  }
  const compiled = await compileSiteProjectPlan(snapshot.project, pinselPack.manifest);
  if (compiled.status !== "ready") {
    return { status: "blocked", message: compiled.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("; ") };
  }
  const planPath = planPathFor(route);
  const routeDocument = compiled.plan.routes.find((candidate) => candidate.pathname === planPath);
  if (!routeDocument) {
    const message = `The snapshot has no route ${route}.`;
    return { status: "unknown-route", message, html: document({ pathname: route, title: "Pinsel preview", body: h("p", { class: "preview-error" }, message), self: identity, error: message }) };
  }
  const body = renderRouteDocument(routeDocument, pinselRegistry);
  const meta = metaFor(snapshot, route);
  return { status: "ok", identity, html: document({ pathname: route, title: meta.title, description: meta.description, body, self: identity, error: null }) };
}

const routeCache = new Map<string, Promise<string[]>>();

/** Routes the baseline's structure declares, in approved order; cached per baseline revision. */
export function previewRoutesOf(baseline: ContentBaseline, approved: readonly string[]): Promise<string[]> {
  let routes = routeCache.get(baseline.baselineRevision);
  if (!routes) {
    routes = compileSiteProjectPlan(baseline.project, pinselPack.manifest).then((compiled) => {
      const declared = new Set(compiled.status === "ready" ? compiled.plan.routes.map((route) => route.pathname) : []);
      return approved.filter((route) => declared.has(planPathFor(route)));
    });
    routes.catch(() => routeCache.delete(baseline.baselineRevision));
    routeCache.set(baseline.baselineRevision, routes);
  }
  return routes;
}

/** Body markup of a route exactly as the public build emits it: the parity target. */
export function renderRouteBody(routeDocument: Parameters<typeof renderRouteDocument>[0]): string {
  return renderToString(renderRouteDocument(routeDocument, pinselRegistry));
}
