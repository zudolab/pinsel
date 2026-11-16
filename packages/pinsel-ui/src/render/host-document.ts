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
  if (input.identity.rendererId !== "pinsel-zfb" || input.identity.rendererVersion !== "native-v2") throw new Error("Unsupported Pinsel renderer identity");
  const entries = input.project?.providers.content.flatMap(provider => provider.entries) ?? [];
  const pathname = input.identity.pathname;
  const noteSlug = /^\/notes\/([^/]+)\/?$/.exec(pathname)?.[1];
  const note = noteSlug && entries.find(entry => entry.modelId === "note" && entry.values["note-slug"] === noteSlug);
  const page = entries.find(entry => entry.modelId === "page-copy" && String(entry.values["page-copy-route"]).replace(/\/$/, "") === pathname.replace(/\/$/, ""));
  const title = note ? `${note.values["note-title"]} - Pinsel Notes` : String(page?.values["page-copy-meta-title"] ?? input.route.displayTitle);
  const description = String(note ? note.values["note-description"] ?? "" : page?.values["page-copy-meta-description"] ?? "");
  const canonicalPath = pathname === "/" || pathname.endsWith(".html") ? pathname : `${pathname.replace(/\/$/, "")}/`;
  const canonicalUrl = `https://pinsel-germany.com${canonicalPath}`;
  const selected = new Set(input.targets.map(target => target.renderedNodeId));
  const body = renderRouteDocument(input.route, pinselRegistry, {
    decorateNode: (rendered, node) => selected.has(node.id) ? markSemanticRoots(rendered, node.id) : rendered,
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
