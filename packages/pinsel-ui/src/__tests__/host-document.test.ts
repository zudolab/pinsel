import type { SiteProject } from "zudo-composer/site-project";
import { describe, expect, it } from "vitest";
import { Fragment, h } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { markSemanticRoots, renderDocument } from "../render/host-document";
import { pinselPack, pinselRegistry } from "../pack";
import { renderRouteDocument, type RouteDocument } from "../render/render-route-document";

const node = (id: string, componentId: string, props: Record<string, unknown> = {}, slots: Record<string, unknown[]> = {}) => ({
  id, componentId, componentVersion: pinselPack.manifest.components.find(component => component.id === componentId)!.schemaVersion, props, slots,
});
const route = (root: unknown[]): RouteDocument => ({
  pathname: "/faq", displayTitle: "FAQ", sitemapNode: { id: "faq", path: "/faq" },
  source: { kind: "composition", ref: { providerId: "files", recordId: "faq" } }, ancestors: [],
  composition: { local: { providerId: "files", recordId: "faq" }, routeRecordId: "faq", document: { schemaVersion: 2, id: "faq", name: "FAQ", root } },
}) as unknown as RouteDocument;

describe("Pinsel host document adapter", () => {
  it("marks fragment roots without wrappers or stealing child ownership", () => {
    const child = markSemanticRoots(h("a", { href: "/faq" }, "FAQ"), "child");
    const roots = h(Fragment, {}, child, h("main", {}, "body"));
    expect(renderToString(markSemanticRoots(roots, "parent"))).toBe('<a href="/faq" data-composer-target="child">FAQ</a><main data-composer-target="parent">body</main>');
  });
  it("keeps exact nested production output and positional behavior while exposing targets", async () => {
    const document = route([node("category", "pinsel.faq-category", { title: "Q", fragmentId: "faq-1" }, { items: [
      node("a", "pinsel.faq-item", { question: "First", answer: "A", idPrefix: "faq", openFirst: true }),
      node("b", "pinsel.faq-item", { question: "Second", answer: "B", idPrefix: "faq", openFirst: true }),
    ] })]);
    const ordinary = renderToString(renderRouteDocument(document, pinselRegistry));
    const decorated = renderToString(renderRouteDocument(document, pinselRegistry, { decorateNode: (value, item) => markSemanticRoots(value, item.id) }));
    expect(decorated.replace(/ data-composer-target="[^"]*"/g, "")).toBe(ordinary);
    expect(decorated).toContain('data-composer-target="a"');
    expect(decorated).toContain('id="faq-2"');
    const html = await renderDocument({ route: document, identity: { pathname: "/faq", rendererId: "pinsel-zfb", rendererVersion: "native-v1" }, targets: [{ renderedNodeId: "a" }] });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('data-composer-target="a"');
    expect(html).not.toContain('data-composer-target="b"');
    expect(html).toContain('src="/assets/pinsel-native/start.js"');
  });
  it("reads metadata from the reviewed captured Content rather than a live baseline", async () => {
    const project = { providers: { content: [{ entries: [{ id: "page-faq", modelId: "page-copy", values: {
      "page-copy-route": "/faq/", "page-copy-meta-title": "Edited FAQ", "page-copy-meta-description": "Saved description",
    } }] }] } } as unknown as SiteProject;
    const html = await renderDocument({ route: route([]), project, identity: { pathname: "/faq", rendererId: "pinsel-zfb", rendererVersion: "native-v1" }, targets: [] });
    expect(html).toContain("<title>Edited FAQ</title>");
    expect(html).toContain('name="description" content="Saved description"');
  });

});
