import type { SiteProject } from "zudo-composer/site-project";
import { Fragment, h, isDescription, type Child } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { DocumentShell } from "../document/document-shell";
import { pinselRegistry } from "../pack";
import { renderRouteDocument, type RouteDocument } from "./render-route-document";

/** Annotate real roots without inserting elements or stealing a child's target. */
export function markSemanticRoots(value: Child, nodeId: string): Child {
  if (Array.isArray(value)) return value.map(child => markSemanticRoots(child, nodeId));
  if (!isDescription(value)) return value;
  if (value.type === Fragment) return markSemanticRoots(value.props.children as Child, nodeId);
  if (typeof value.type === "function") return markSemanticRoots(value.type(value.props), nodeId);
  if (typeof value.type !== "string" || value.props["data-composer-target"]) return value;
  return h(value.type, { ...value.props, "data-composer-target": nodeId });
}

// This module is a Node-only public host adapter; the visitor UI barrel never imports it.
export async function renderDocument(input: {
  route: RouteDocument;
  project?: SiteProject;
  identity: { pathname: string; rendererId: string; rendererVersion: string };
  targets: readonly { renderedNodeId: string }[];
}): Promise<string> {
  if (input.identity.rendererId !== "pinsel-zfb" || input.identity.rendererVersion !== "native-v3") throw new Error("Unsupported Pinsel renderer identity");
  if (!input.project) throw new Error("Captured project is required for document metadata");
  const pathname = input.identity.pathname;
  const selected = input.route.selectedEntry;
  let title: string;
  let description: string;
  if (selected?.modelId === "note") {
    const matches = input.project.providers.content.filter(provider => provider.id === selected.providerId).flatMap(provider => provider.entries).filter(entry => entry.modelId === selected.modelId && entry.id === selected.recordId);
    if (matches.length !== 1 || matches[0]!.lifecycle !== "published") throw new Error("Note metadata requires one published qualified route entry");
    const values = matches[0]!.values;
    if (typeof values["note-title"] !== "string" || !values["note-title"].trim() || typeof values["note-description"] !== "string") throw new Error("Note metadata is incomplete");
    title = `${values["note-title"]} - Pinsel Notes`; description = values["note-description"];
  } else {
    const normalize = (path: string) => path === "/" ? path : path.replace(/\/$/, "");
    const pages = input.project.providers.content.flatMap(provider => provider.entries).filter(entry => entry.modelId === "page-copy" && entry.lifecycle === "published" && normalize(String(entry.values["page-copy-route"])) === normalize(pathname));
    if (pages.length !== 1) throw new Error(`Static route ${pathname} requires exactly one published page-copy metadata record`);
    const values = pages[0]!.values;
    const metaDescription = pathname === "/404.html" && values["page-copy-meta-description"] == null ? "" : values["page-copy-meta-description"];
    if (typeof values["page-copy-meta-title"] !== "string" || !values["page-copy-meta-title"].trim() || typeof metaDescription !== "string" || (pathname !== "/404.html" && !metaDescription.trim())) throw new Error(`Static route ${pathname} has incomplete metadata`);
    title = values["page-copy-meta-title"]; description = metaDescription;
  }
  const canonicalPath = pathname === "/" || pathname.endsWith(".html") ? pathname : `${pathname.replace(/\/$/, "")}/`;
  const canonicalUrl = `https://pinsel-germany.com${canonicalPath}`;
  const selectedTargets = new Set(input.targets.map(target => target.renderedNodeId));
  const body = renderRouteDocument(input.route, pinselRegistry, {
    decorateNode: (rendered, node) => selectedTargets.has(node.id) ? markSemanticRoots(rendered, node.id) : rendered,
  });
  return `<!doctype html>\n${renderToString(h(DocumentShell, {
    pathname: input.identity.pathname,
    title,
    description, robots: "noindex,nofollow", head: [
      h("link", { rel: "stylesheet", href: "/assets/pinsel-native.css" }),
      h("link", { rel: "canonical", href: canonicalUrl }),
      h("meta", { property: "og:type", content: "website" }),
      h("meta", { property: "og:locale", content: "ja_JP" }),
      h("meta", { property: "og:site_name", content: "Pinsel" }),
      h("meta", { property: "og:title", content: title }),
      h("meta", { property: "og:description", content: description }),
      h("meta", { property: "og:url", content: canonicalUrl }),
    ],
    scripts: h("script", { type: "module", src: "/assets/pinsel-native/start.js" }),
  }, body))}`;
}
