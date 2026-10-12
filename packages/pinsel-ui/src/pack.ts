import { defineComponent, defineComponentPack } from "@zudo-composer/component-contract";
import { Heading, type HeadingProps } from "./heading/heading";
import { PricingCard, PricingCards, type PricingCardProps, type PricingCardsProps } from "./pricing-cards/pricing-cards";
import { Prose, type ProseProps } from "./prose/prose";
import type { RenderRegistry, RenderableComponent } from "./render/types";
import { Section, type SectionProps } from "./section/section";
import { SiteFrame, type SiteFrameProps } from "./site-frame/site-frame";

// The Pinsel component pack. Ids and props are the contract the structure
// manifest (pinsel-content) authors against; the pack version moves when a
// prop or slot changes. `source.module` names this package's own subpath so
// the manifest satisfies the contract's public-bare-import rule.
const MODULE = "@pinsel/ui";
const source = <const TName extends string>(exportName: TName) => ({ module: MODULE, exportKind: "named", exportName }) as const;
const text = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "text", prop, label }) as const;
const bool = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "boolean", prop, label }) as const;
const number = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "number", prop, label, min: 0, step: 1 }) as const;
const markdown = <const TProp extends string>(prop: TProp, label: string) =>
  ({ prop, label, schema: { type: "string" }, editor: { kind: "text", multiline: true, mode: "markdown-source" } }) as const;

const siteFrame = defineComponent<SiteFrameProps>()(SiteFrame, {
  id: "pinsel.site-frame",
  schemaVersion: 1,
  title: "Site frame",
  category: "Chrome",
  description: "Skip link, header, the main outlet and the footer of every page.",
  source: source("SiteFrame"),
  defaults: { brandWord: "Pinsel", brandSub: "ART STUDY IN GERMANY", instagramLabel: "yuko_takatsudo", copyright: "© 2015–2026 Pinsel Germany. All rights reserved.", backToTopLabel: "ページの先頭へ" },
  fields: [text("brandWord", "ブランド名"), text("brandSub", "ブランド副題"), text("instagramLabel", "Instagram 表示名"), text("copyright", "コピーライト"), text("backToTopLabel", "「ページの先頭へ」")],
  slots: [{ id: "main", prop: "main", label: "Main", cardinality: "many" }],
  staticProps: [{ prop: "route", reason: "Injected by the renderer from the compiled route." }],
});

const section = defineComponent<SectionProps>()(Section, {
  id: "pinsel.section",
  schemaVersion: 1,
  title: "Section",
  category: "Layout",
  description: "Reading-zone section with an eyebrow and an h2.",
  source: source("Section"),
  defaults: { id: "", eyebrow: "", title: "" },
  fields: [text("id", "Fragment id"), text("eyebrow", "Eyebrow"), text("title", "見出し")],
  slots: [{ id: "content", prop: "content", label: "Content", cardinality: "many" }],
});

const heading = defineComponent<HeadingProps>()(Heading, {
  id: "pinsel.heading",
  schemaVersion: 1,
  title: "Heading",
  category: "Typography",
  description: "A plain heading element.",
  source: source("Heading"),
  defaults: { level: "h2", text: "", id: "" },
  fields: [{ kind: "select", prop: "level", label: "Level", options: ["h2", "h3", "h4"] }, text("text", "テキスト"), text("id", "Fragment id")],
});

const prose = defineComponent<ProseProps>()(Prose, {
  id: "pinsel.prose",
  schemaVersion: 1,
  title: "Prose",
  category: "Typography",
  description: "Markdown body limited to headings, paragraphs, flat lists, links and strong text.",
  source: source("Prose"),
  defaults: { markdown: "" },
  fields: [markdown("markdown", "本文")],
});

const pricingCards = defineComponent<PricingCardsProps>()(PricingCards, {
  id: "pinsel.pricing-cards",
  schemaVersion: 1,
  title: "Pricing cards",
  category: "Sections",
  description: "The home pricing grid, its note and the lessons link.",
  source: source("PricingCards"),
  defaults: { note: "", moreLabel: "", moreHref: "/lessons/" },
  fields: [text("note", "注記"), text("moreLabel", "詳細リンク"), text("moreHref", "詳細リンク先")],
  slots: [{ id: "items", prop: "items", label: "Courses", accepts: ["pinsel.pricing-card"], cardinality: "many" }],
});

const pricingCard = defineComponent<PricingCardProps>()(PricingCard, {
  id: "pinsel.pricing-card",
  schemaVersion: 1,
  title: "Pricing card",
  category: "Sections",
  description: "One course with price, unit, description and the contact link.",
  source: source("PricingCard"),
  defaults: { name: "", price: "", unit: "", description: "", featured: false, courseIndex: 1, taxLabel: "税込", popularBadge: "POPULAR", linkLabel: "このコースについて相談する" },
  fields: [
    text("name", "コース名"),
    text("price", "価格（表示）"),
    text("unit", "回数・単位"),
    text("description", "説明"),
    bool("featured", "人気表示"),
    number("courseIndex", "表示順"),
    text("taxLabel", "税込表記"),
    text("popularBadge", "人気バッジ"),
    text("linkLabel", "リンク文言"),
  ],
});

export const PINSEL_PACK_ID = "pinsel";
export const PINSEL_PACK_VERSION = "0.1.0";

export const pinselPack = defineComponentPack({
  packId: PINSEL_PACK_ID,
  packVersion: PINSEL_PACK_VERSION,
  components: [siteFrame, section, heading, prose, pricingCards, pricingCard],
});

/** The renderer registry for `renderRouteDocument`: every pack component by id. */
export const pinselRegistry: RenderRegistry = {
  manifest: pinselPack.manifest,
  components: Object.fromEntries(
    Object.entries(pinselPack.runtime.components).map(([id, entry]) => [id, entry.component as unknown as RenderableComponent]),
  ),
};
