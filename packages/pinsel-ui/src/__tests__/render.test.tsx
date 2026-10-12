import { describe, expect, it } from "vitest";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { validateRuntimeParity } from "@zudo-composer/component-contract";

import { bodyClassForPathname } from "../document/document-shell";
import { parseMarkdown } from "../markdown/safe-markdown";
import { pinselPack, pinselRegistry } from "../pack";
import { PricingCard, PricingCards } from "../pricing-cards/pricing-cards";
import { Prose } from "../prose/prose";
import { RouteRenderError, renderRouteDocument, type RouteCompositionDocument, type RouteDocument } from "../render/render-route-document";
import { SiteFrame } from "../site-frame/site-frame";

const LABELS = { taxLabel: "税込", popularBadge: "POPULAR", linkLabel: "このコースについて相談する" };
const FRAME = { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–2026 Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" };

describe("component pack", () => {
  it("is a valid contract pack with runtime parity", () => {
    expect(() => validateRuntimeParity(pinselPack.manifest, pinselPack.runtime)).not.toThrow();
    expect(pinselPack.manifest.components.map((component) => component.id)).toEqual(expect.arrayContaining(["pinsel.site-frame", "pinsel.section", "pinsel.prose", "pinsel.pricing-cards", "pinsel.pricing-card"]));
    expect(Object.keys(pinselRegistry.components).sort()).toEqual(pinselPack.manifest.components.map((component) => component.id).sort());
  });
});

describe("PricingCards", () => {
  it("renders the approved card markup with the contact link per course", () => {
    const html = renderToString(
      <PricingCards note="※ 注記" moreLabel="クラスの詳細はこちら" moreHref="/lessons/" items={[<PricingCard name="2ヶ月コース" price="¥50,000" unit="全4回（月2回）" description="ポートフォリオ制作指導" featured courseIndex={2} {...LABELS} />]} />,
    );
    expect(html).toContain('<article class="pricing-card"><div class="pricing-card__top"><h3>2ヶ月コース</h3><span class="pricing-card__popular">POPULAR</span></div><p class="price">¥50,000<span>税込</span></p>');
    expect(html).toContain('<a class="text-link" href="/contact/?course=2">');
    expect(html).toContain('<p class="price-note">※ 注記</p>');
    expect(html).not.toContain("<script");
  });
});

describe("SiteFrame", () => {
  it("keeps the DOM hooks the visitor scripts need and marks the current route", () => {
    const html = renderToString(<SiteFrame {...FRAME} route={{ pathname: "/lessons/" }} main={["body"]} />);
    for (const hook of ['class="site-header"', 'class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"', 'id="site-navigation" class="site-nav"', "data-motion-toggle", "data-motion-label", '<main id="main" tabindex="-1">body</main>', 'class="skip-link" href="#main"']) {
      expect(html).toContain(hook);
    }
    expect(html).toContain('<a class="site-nav__item" href="/lessons/" aria-current="page">オンラインクラス</a>');
    expect(html).toContain('<a class="site-nav__item" href="/about/">講師紹介</a>');
    expect(html.match(/<a class="site-nav__item"/g)).toHaveLength(6);
    expect(html).not.toContain("料金");
  });
});

describe("safe markdown", () => {
  it("renders only the approved subset and never raw HTML", () => {
    const blocks = parseMarkdown("## 見出し\n\n段落 **強調** [問い合わせ](/contact/) [bad](javascript:alert(1))\n\n- 一\n- 二\n\n<b>html</b>");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "paragraph", "list", "paragraph"]);
    const html = renderToString(<Prose markdown={"## 見出し\n\n段落 **強調** [問い合わせ](/contact/)\n\n<b>html</b>"} />);
    expect(html).toContain('<h2 id="section-1">見出し</h2>');
    expect(html).toContain('<strong>強調</strong> <a href="/contact/">問い合わせ</a>');
    expect(html).toContain("&lt;b&gt;html&lt;/b&gt;");
  });
});

describe("renderRouteDocument", () => {
  const frame: RouteCompositionDocument = {
    schemaVersion: 2,
    id: "frame",
    name: "Frame",
    root: [{ id: "frame-root", componentId: "pinsel.site-frame", componentVersion: 2, props: {}, slots: { main: [] } }],
    publication: { kind: "global-template", outlet: { id: "outlet", label: "Main", target: { parentId: "frame-root", slotId: "main" } } },
  };
  const page: RouteCompositionDocument = {
    schemaVersion: 2,
    id: "home",
    name: "Home",
    root: [
      {
        id: "pricing", componentId: "pinsel.section", componentVersion: 2, props: { id: "pricing", eyebrow: "COURSE & PRICING", title: "コースと料金" },
        slots: { content: [{ id: "cards", componentId: "pinsel.pricing-cards", componentVersion: 1, props: { note: "n", moreLabel: "m", moreHref: "/lessons/" }, slots: { items: [{ id: "c1", componentId: "pinsel.pricing-card", componentVersion: 1, props: { name: "進路相談", price: "¥10,000", unit: "1回", description: "d", featured: false, courseIndex: 1 }, slots: {} }] } }] },
      },
    ],
    binding: { sourceRecordId: "frame", outletId: "outlet" },
  };
  const route: RouteDocument = {
    pathname: "/",
    displayTitle: "Home",
    sitemapNode: { id: "home", path: "/" },
    source: { kind: "composition", ref: { providerId: "files", recordId: "home" } },
    ancestors: [],
    composition: {
      local: { providerId: "files", recordId: "home" },
      routeRecordId: "home",
      document: page,
      linkedSource: { ref: { providerId: "files", recordId: "frame" }, outlet: { id: "outlet", label: "Main", target: { parentId: "frame-root", slotId: "main" } }, document: frame },
    },
  };

  it("projects the local document into the template outlet and renders every node", () => {
    const html = renderToString(renderRouteDocument(route, pinselRegistry));
    expect(html).toMatch(/^<a class="skip-link" href="#main">本文へスキップ<\/a><main id="main" tabindex="-1">/);
    expect(html).toContain('<main id="main" tabindex="-1"><section class="section container reading-zone" id="pricing">');
    expect(html).toContain('<h3>進路相談</h3>');
    expect(html).toContain('href="/contact/?course=1"');
    expect(html).toMatch(/<\/main>$/);
  });

  it("refuses an unknown component and a mismatched outlet", () => {
    const unknown: RouteDocument = { ...route, composition: { ...route.composition, document: { ...page, root: [{ id: "x", componentId: "pinsel.nope", componentVersion: 1, props: {}, slots: {} }] } } };
    expect(() => renderRouteDocument(unknown, pinselRegistry)).toThrow(RouteRenderError);
    const broken: RouteDocument = { ...route, composition: { ...route.composition, linkedSource: { ...route.composition.linkedSource!, outlet: { id: "other", label: "x", target: { parentId: "frame-root", slotId: "main" } } } } };
    expect(() => renderRouteDocument(broken, pinselRegistry)).toThrow(/outlet does not verify/);
  });
});

describe("renderRouteDocument contract", () => {
  const version = (componentId: string) => pinselPack.manifest.components.find((component) => component.id === componentId)?.schemaVersion ?? 1;
  const node = (id: string, componentId: string, props: Record<string, unknown> = {}, slots: Record<string, unknown[]> = {}) => ({ id, componentId, componentVersion: version(componentId), props, slots });
  const routeWith = (root: unknown[]): RouteDocument =>
    ({
      pathname: "/faq/",
      displayTitle: "FAQ",
      sitemapNode: { id: "faq", path: "/faq/" },
      source: { kind: "composition", ref: { providerId: "files", recordId: "faq" } },
      ancestors: [],
      composition: { local: { providerId: "files", recordId: "faq" }, routeRecordId: "faq", document: { schemaVersion: 2, id: "faq", name: "FAQ", root } },
    }) as unknown as RouteDocument;

  it("injects each node's position among its siblings", () => {
    const items = ["一", "二", "三"].map((question, index) => node(`q${index}`, "pinsel.faq-item", { question, answer: "a", idPrefix: "category-1", openFirst: true }));
    const html = renderToString(renderRouteDocument(routeWith([node("cat", "pinsel.faq-category", { fragmentId: "faq-1", title: "c" }, { items })]), pinselRegistry));
    expect(html).toContain('<section class="faq-category reading-zone" id="faq-1"><h2>c</h2><div class="faq-list"><details id="category-1-1" open>');
    expect(html).toContain('<details id="category-1-1" open>');
    expect(html).toContain('<details id="category-1-3">');
  });

  it("refuses undeclared props, injected props, undeclared slots and children a slot does not accept", () => {
    expect(() => renderRouteDocument(routeWith([node("x", "pinsel.checklist-item", { text: "t", colour: "red" })]), pinselRegistry)).toThrow(/does not declare/);
    expect(() => renderRouteDocument(routeWith([node("x", "pinsel.checklist-item", { position: { index: 9 } })]), pinselRegistry)).toThrow(/does not declare/);
    expect(() => renderRouteDocument(routeWith([node("x", "pinsel.checklist", {}, { other: [] })]), pinselRegistry)).toThrow(/does not declare/);
    expect(() => renderRouteDocument(routeWith([node("x", "pinsel.checklist", {}, { items: [node("y", "pinsel.faq-item", { question: "q" })] })]), pinselRegistry)).toThrow(/not accepted/);
  });

  it("renders every pack component from its manifest defaults", () => {
    for (const component of pinselPack.manifest.components) {
      const html = renderToString(renderRouteDocument(routeWith([node("n", component.id)]), pinselRegistry));
      expect(typeof html, component.id).toBe("string");
      expect(html, component.id).not.toContain("<script");
    }
  });
});

describe("bodyClassForPathname", () => {
  it("names the page like the prototype, with a clean 404 class", () => {
    expect(bodyClassForPathname("/")).toBe("page-home");
    expect(bodyClassForPathname("/notes/free-tuition/")).toBe("page-notes");
    expect(bodyClassForPathname("/404.html")).toBe("page-not-found");
  });
});
