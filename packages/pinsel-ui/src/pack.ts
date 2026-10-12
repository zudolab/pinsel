import { defineComponent, defineComponentPack } from "@zudo-composer/component-contract";
import { ArchiveLayout, type ArchiveLayoutProps } from "./archive-layout/archive-layout";
import { ArticleHeading, type ArticleHeadingProps } from "./article-heading/article-heading";
import { ArticleLayout, RelatedNote, type ArticleLayoutProps, type RelatedNoteProps } from "./article-layout/article-layout";
import { ART_SIZES, ART_SLOTS, ArtWindow, type ArtWindowProps } from "./art-window/art-window";
import { Breadcrumb, type BreadcrumbProps } from "./breadcrumb/breadcrumb";
import { Checklist, ChecklistItem, type ChecklistItemProps, type ChecklistProps } from "./checklist/checklist";
import { ConsultationIntro, type ConsultationIntroProps } from "./consultation-intro/consultation-intro";
import { ContactForm, CourseOption, type ContactFormProps, type CourseOptionProps } from "./contact-form/contact-form";
import { ContactLayout, Step, type ContactLayoutProps, type StepProps } from "./contact-layout/contact-layout";
import { CourseStep, CourseSteps, type CourseStepProps, type CourseStepsProps } from "./course-steps/course-steps";
import { Cta, type CtaProps } from "./cta/cta";
import { Faq, FaqCategory, FaqItem, type FaqCategoryProps, type FaqItemProps, type FaqProps } from "./faq/faq";
import { FeatureCard, FeatureGrid, type FeatureCardProps, type FeatureGridProps } from "./feature-grid/feature-grid";
import { FooterLink, type FooterLinkProps } from "./footer-link/footer-link";
import { Fragment, type FragmentProps } from "./fragment/fragment";
import { GraduatesSection, type GraduatesSectionProps } from "./graduates-section/graduates-section";
import { Heading, type HeadingProps } from "./heading/heading";
import { Hero, type HeroProps } from "./hero/hero";
import { HeroMeta, type HeroMetaProps } from "./hero-meta/hero-meta";
import { Instructor, type InstructorProps } from "./instructor/instructor";
import { LegalRow, LegalTable, type LegalRowProps, type LegalTableProps } from "./legal-table/legal-table";
import { Message, type MessageProps } from "./message/message";
import { MoreLink, type MoreLinkProps } from "./more-link/more-link";
import { NavLink, type NavLinkProps } from "./nav-link/nav-link";
import { NotFound, type NotFoundProps } from "./not-found/not-found";
import { NoteCard, NoteCards, type NoteCardProps, type NoteCardsProps } from "./note-cards/note-cards";
import { PageHeading, Stat, type PageHeadingProps, type StatProps } from "./page-heading/page-heading";
import { Paragraphs, type ParagraphsProps } from "./paragraphs/paragraphs";
import { PriceDetail, PriceDetailCard, type PriceDetailCardProps, type PriceDetailProps } from "./price-detail/price-detail";
import { PricingCard, PricingCards, type PricingCardProps, type PricingCardsProps } from "./pricing-cards/pricing-cards";
import { Prose, type ProseProps } from "./prose/prose";
import type { RenderRegistry, RenderableComponent } from "./render/types";
import { ResultPreview, ResultPreviews, type ResultPreviewProps, type ResultPreviewsProps } from "./result-previews/result-previews";
import { ResultRow, ResultsYearSection, type ResultRowProps, type ResultsYearSectionProps } from "./results-year/results-year";
import { Section, type SectionProps } from "./section/section";
import { SectionAfter, type SectionAfterProps } from "./section-after/section-after";
import { SiteFrame, type SiteFrameProps } from "./site-frame/site-frame";
import { Specialization, SpecializationGrid, type SpecializationGridProps, type SpecializationProps } from "./specialization-grid/specialization-grid";
import { StudentIndex, StudentLink, type StudentIndexProps, type StudentLinkProps } from "./student-index/student-index";
import { Timeline, TimelineEntry, type TimelineEntryProps, type TimelineProps } from "./timeline/timeline";
import { Toc, TocItem, type TocItemProps, type TocProps } from "./toc/toc";
import { TwoColumn, type TwoColumnProps } from "./two-column/two-column";
import { VoiceDetail, type VoiceDetailProps } from "./voice-detail/voice-detail";
import { VoicePreview, VoicePreviews, type VoicePreviewProps, type VoicePreviewsProps } from "./voice-previews/voice-previews";

// The Pinsel component pack. Ids and props are the contract the structure
// manifest (pinsel-content) authors against; the pack version moves when a
// prop or slot changes. `source.module` names this package's own subpath so
// the manifest satisfies the contract's public-bare-import rule.
//
// Every component also receives two renderer-injected props, never authored:
// `route` ({ pathname }) and `position` ({ index, count }: the node's 1-based
// place among its siblings). Positional ids and numbering (`#faq-2`,
// `#student-3`, `01`) come from `position`, so they follow collection order.
const MODULE = "@pinsel/ui";
const source = <const TName extends string>(exportName: TName) => ({ module: MODULE, exportKind: "named", exportName }) as const;
const text = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "text", prop, label }) as const;
const longText = <const TProp extends string>(prop: TProp, label: string) =>
  ({ prop, label, schema: { type: "string" }, editor: { kind: "text", multiline: true } }) as const;
const bool = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "boolean", prop, label }) as const;
const number = <const TProp extends string>(prop: TProp, label: string) => ({ kind: "number", prop, label, min: 0, step: 1 }) as const;
const markdown = <const TProp extends string>(prop: TProp, label: string) =>
  ({ prop, label, schema: { type: "string" }, editor: { kind: "text", multiline: true, mode: "markdown-source" } }) as const;
const textList = <const TProp extends string>(prop: TProp, label: string) =>
  ({ prop, label, schema: { type: "array", items: { schema: { type: "string" }, editor: { kind: "text", multiline: true } } }, editor: { kind: "list" } }) as const;
const many = <const TProp extends string>(prop: TProp, label: string, accepts?: readonly string[]) =>
  ({ id: prop, prop, label, cardinality: "many", ...(accepts ? { accepts } : {}) }) as const;
const ROUTE = { prop: "route", reason: "Injected by the renderer from the compiled route." } as const;
const POSITION = { prop: "position", reason: "Injected by the renderer: the node's place among its siblings." } as const;

// ---- Chrome ---------------------------------------------------------------

const siteFrame = defineComponent<SiteFrameProps>()(SiteFrame, {
  id: "pinsel.site-frame",
  schemaVersion: 1,
  title: "Site frame",
  category: "Chrome",
  description: "Skip link, header, the main outlet and the footer of every page.",
  source: source("SiteFrame"),
  defaults: {
    brandWord: "Pinsel",
    brandSub: "ART STUDY IN GERMANY",
    instagramLabel: "yuko_takatsudo",
    copyright: "© 2015–2026 Pinsel Germany. All rights reserved.",
    backToTopLabel: "ページの先頭へ",
    contactLabel: "お問い合わせ",
  },
  fields: [
    text("brandWord", "ブランド名"),
    text("brandSub", "ブランド副題"),
    text("instagramLabel", "Instagram 表示名"),
    text("copyright", "コピーライト（{year} は現在年）"),
    text("backToTopLabel", "「ページの先頭へ」"),
    text("contactLabel", "お問い合わせボタン"),
  ],
  slots: [
    { id: "main", prop: "main", label: "Main", cardinality: "many" },
    many("headerNav", "Header navigation", ["pinsel.nav-link"]),
    many("footerNav", "Footer navigation", ["pinsel.footer-link"]),
  ],
  staticProps: [ROUTE],
});

const navLink = defineComponent<NavLinkProps>()(NavLink, {
  id: "pinsel.nav-link",
  schemaVersion: 1,
  title: "Header nav item",
  category: "Chrome",
  description: "One header navigation link; aria-current on its own section.",
  source: source("NavLink"),
  defaults: { href: "/", label: "" },
  fields: [text("href", "リンク先"), text("label", "表示名")],
  staticProps: [ROUTE],
});

const footerLink = defineComponent<FooterLinkProps>()(FooterLink, {
  id: "pinsel.footer-link",
  schemaVersion: 1,
  title: "Footer nav item",
  category: "Chrome",
  description: "One footer navigation entry: English label, title, description.",
  source: source("FooterLink"),
  defaults: { href: "/", label: "", title: "", description: "" },
  fields: [text("href", "リンク先"), text("label", "英語ラベル"), text("title", "見出し"), text("description", "説明")],
});

const breadcrumb = defineComponent<BreadcrumbProps>()(Breadcrumb, {
  id: "pinsel.breadcrumb",
  schemaVersion: 1,
  title: "Breadcrumb",
  category: "Chrome",
  description: "トップ › [parent ›] current page.",
  source: source("Breadcrumb"),
  defaults: { label: "", parentLabel: "", parentHref: "" },
  fields: [text("label", "現在のページ"), text("parentLabel", "親ページ名"), text("parentHref", "親ページ")],
});

// ---- Layout ---------------------------------------------------------------

const section = defineComponent<SectionProps>()(Section, {
  id: "pinsel.section",
  schemaVersion: 1,
  title: "Section",
  category: "Layout",
  description: "Reading-zone section with an eyebrow and an h2; an empty title renders no heading.",
  source: source("Section"),
  defaults: { id: "", eyebrow: "", title: "", intro: "", label: "", layout: "default" },
  fields: [
    text("id", "Fragment id"),
    text("eyebrow", "Eyebrow"),
    text("title", "見出し"),
    text("intro", "見出し横の導入文"),
    text("label", "aria-label（見出しなし）"),
    { kind: "select", prop: "layout", label: "Layout", options: ["default", "instructor"] },
  ],
  slots: [many("content", "Content")],
});

const fragment = defineComponent<FragmentProps>()(Fragment, {
  id: "pinsel.fragment",
  schemaVersion: 1,
  title: "Fragment",
  category: "Layout",
  description: "Renders its children without a wrapper; an attachment point between page-level blocks.",
  source: source("Fragment"),
  slots: [many("content", "Content")],
});

const sectionAfter = defineComponent<SectionAfterProps>()(SectionAfter, {
  id: "pinsel.section-after",
  schemaVersion: 1,
  title: "Section after",
  category: "Layout",
  description: "The spaced closing block of a section.",
  source: source("SectionAfter"),
  slots: [many("content", "Content")],
});

const twoColumn = defineComponent<TwoColumnProps>()(TwoColumn, {
  id: "pinsel.two-column",
  schemaVersion: 1,
  title: "Two columns",
  category: "Layout",
  description: "Two equal columns, stacked on mobile.",
  source: source("TwoColumn"),
  slots: [many("columns", "Columns")],
});

const archiveLayout = defineComponent<ArchiveLayoutProps>()(ArchiveLayout, {
  id: "pinsel.archive-layout",
  schemaVersion: 1,
  title: "Archive layout",
  category: "Layout",
  description: "Results / FAQ: sticky aside table of contents beside the archive body.",
  source: source("ArchiveLayout"),
  defaults: { tocLabel: "" },
  fields: [text("tocLabel", "目次ラベル")],
  slots: [many("toc", "Table of contents", ["pinsel.toc-item"]), many("body", "Body")],
});

const toc = defineComponent<TocProps>()(Toc, {
  id: "pinsel.toc",
  schemaVersion: 1,
  title: "Table of contents",
  category: "Layout",
  description: "Numbered in-page navigation; wide on lessons, an aside rail elsewhere.",
  source: source("Toc"),
  defaults: { label: "このページの内容", wide: false },
  fields: [text("label", "ラベル"), bool("wide", "横幅いっぱい")],
  slots: [many("items", "Items", ["pinsel.toc-item"])],
});

const tocItem = defineComponent<TocItemProps>()(TocItem, {
  id: "pinsel.toc-item",
  schemaVersion: 1,
  title: "TOC item",
  category: "Layout",
  description: "One numbered fragment link; an empty target links #<prefix><position>.",
  source: source("TocItem"),
  defaults: { label: "", target: "", prefix: "" },
  fields: [text("label", "表示名"), text("target", "Fragment id"), text("prefix", "Fragment id 接頭辞")],
  staticProps: [POSITION],
});

// ---- Typography -----------------------------------------------------------

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

const paragraphs = defineComponent<ParagraphsProps>()(Paragraphs, {
  id: "pinsel.paragraphs",
  schemaVersion: 1,
  title: "Paragraphs",
  category: "Typography",
  description: "Plain-text paragraphs in a .prose block: a long text (blank lines split) followed by a list.",
  source: source("Paragraphs"),
  defaults: { text: "", paragraphs: [] },
  fields: [longText("text", "本文"), textList("paragraphs", "段落")],
});

const moreLink = defineComponent<MoreLinkProps>()(MoreLink, {
  id: "pinsel.more-link",
  schemaVersion: 1,
  title: "More link",
  category: "Typography",
  description: "A section-closing text link (もっと見る).",
  source: source("MoreLink"),
  defaults: { href: "/", label: "" },
  fields: [text("href", "リンク先"), text("label", "リンク文言")],
});

// ---- Art ------------------------------------------------------------------

const artWindow = defineComponent<ArtWindowProps>()(ArtWindow, {
  id: "pinsel.art-window",
  schemaVersion: 1,
  title: "Art window",
  category: "Art",
  description: "Decorative watercolor window between reading surfaces; never behind text.",
  source: source("ArtWindow"),
  defaults: { slot: "middle", size: "large", drift: 1, instance: "" },
  fields: [
    { kind: "select", prop: "slot", label: "Art", options: ART_SLOTS },
    { kind: "select", prop: "size", label: "Size", options: ART_SIZES },
    { prop: "drift", label: "Drift", schema: { type: "number", min: -1, max: 1, step: 2 }, editor: { kind: "number" } },
    text("instance", "SVG id 接尾辞（同じ絵が2つある場合）"),
  ],
});

// ---- Sections -------------------------------------------------------------

const hero = defineComponent<HeroProps>()(Hero, {
  id: "pinsel.hero",
  schemaVersion: 1,
  title: "Hero",
  category: "Sections",
  description: "The home hero: label, three-line h1, lead, actions, hero art.",
  source: source("Hero"),
  defaults: { label: "", titleLines: [], lead: "", primaryLabel: "", primaryHref: "/lessons/", pricingLabel: "", pricingHref: "#pricing" },
  fields: [
    text("label", "ラベル"),
    textList("titleLines", "見出し（行ごと）"),
    longText("lead", "本文"),
    text("primaryLabel", "主ボタン"),
    text("primaryHref", "主ボタン リンク先"),
    text("pricingLabel", "料金リンク"),
    text("pricingHref", "料金リンク先"),
  ],
});

const heroMeta = defineComponent<HeroMetaProps>()(HeroMeta, {
  id: "pinsel.hero-meta",
  schemaVersion: 1,
  title: "Hero meta",
  category: "Sections",
  description: "The two-line band under the home hero.",
  source: source("HeroMeta"),
  defaults: { line: "", intro: "" },
  fields: [text("line", "キャッチ"), longText("intro", "紹介文")],
});

const checklist = defineComponent<ChecklistProps>()(Checklist, {
  id: "pinsel.checklist",
  schemaVersion: 1,
  title: "Checklist",
  category: "Sections",
  description: "こんな方へ: checked list items.",
  source: source("Checklist"),
  slots: [many("items", "Items", ["pinsel.checklist-item"])],
});

const checklistItem = defineComponent<ChecklistItemProps>()(ChecklistItem, {
  id: "pinsel.checklist-item",
  schemaVersion: 1,
  title: "Checklist item",
  category: "Sections",
  description: "One checked item.",
  source: source("ChecklistItem"),
  defaults: { text: "" },
  fields: [text("text", "項目")],
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
  slots: [many("items", "Courses", ["pinsel.pricing-card"])],
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

const instructor = defineComponent<InstructorProps>()(Instructor, {
  id: "pinsel.instructor",
  schemaVersion: 1,
  title: "Instructor",
  category: "Sections",
  description: "Portrait and identity: home (title, bio, link), lessons (bio, link), about (birth line, Instagram).",
  source: source("Instructor"),
  defaults: { variant: "home", name: "", latinName: "", subtitle: "", bio: "", portraitAlt: "", detailLabel: "", detailHref: "/about/", instagramLabel: "" },
  fields: [
    { kind: "select", prop: "variant", label: "Variant", options: ["home", "lessons", "about"] },
    text("name", "氏名"),
    text("latinName", "氏名（ローマ字）"),
    text("subtitle", "肩書・生年"),
    longText("bio", "紹介文"),
    text("portraitAlt", "写真の代替テキスト"),
    text("detailLabel", "詳細リンク"),
    text("detailHref", "詳細リンク先"),
    text("instagramLabel", "Instagram リンク文言"),
  ],
});

const resultPreviews = defineComponent<ResultPreviewsProps>()(ResultPreviews, {
  id: "pinsel.result-previews",
  schemaVersion: 1,
  title: "Result previews",
  category: "Sections",
  description: "The home 合格実績 cards.",
  source: source("ResultPreviews"),
  slots: [many("items", "Results", ["pinsel.result-preview"])],
});

const resultPreview = defineComponent<ResultPreviewProps>()(ResultPreview, {
  id: "pinsel.result-preview",
  schemaVersion: 1,
  title: "Result preview",
  category: "Sections",
  description: "Year, school, department.",
  source: source("ResultPreview"),
  defaults: { yearLabel: "", school: "", detail: "" },
  fields: [text("yearLabel", "年"), text("school", "大学名"), text("detail", "学科")],
});

const voicePreviews = defineComponent<VoicePreviewsProps>()(VoicePreviews, {
  id: "pinsel.voice-previews",
  schemaVersion: 1,
  title: "Voice previews",
  category: "Sections",
  description: "The home 生徒の声 excerpts.",
  source: source("VoicePreviews"),
  slots: [many("items", "Voices", ["pinsel.voice-preview"])],
});

const voicePreview = defineComponent<VoicePreviewProps>()(VoicePreview, {
  id: "pinsel.voice-preview",
  schemaVersion: 1,
  title: "Voice preview",
  category: "Sections",
  description: "Quote with author and school.",
  source: source("VoicePreview"),
  defaults: { quote: "", author: "", school: "" },
  fields: [longText("quote", "抜粋"), text("author", "名前"), text("school", "合格校")],
});

const faq = defineComponent<FaqProps>()(Faq, {
  id: "pinsel.faq",
  schemaVersion: 1,
  title: "FAQ list",
  category: "Sections",
  description: "details/summary question list.",
  source: source("Faq"),
  slots: [many("items", "Questions", ["pinsel.faq-item"])],
});

const faqItem = defineComponent<FaqItemProps>()(FaqItem, {
  id: "pinsel.faq-item",
  schemaVersion: 1,
  title: "FAQ item",
  category: "Sections",
  description: "One question: details#<prefix>-<position>, optionally open when first.",
  source: source("FaqItem"),
  defaults: { question: "", answer: "", prefix: "q", openFirst: false },
  fields: [text("question", "質問"), longText("answer", "回答"), text("prefix", "id 接頭辞"), bool("openFirst", "先頭を開く")],
  staticProps: [POSITION],
});

const faqCategory = defineComponent<FaqCategoryProps>()(FaqCategory, {
  id: "pinsel.faq-category",
  schemaVersion: 1,
  title: "FAQ category",
  category: "Sections",
  description: "section#faq-<position> with its h2 and question list.",
  source: source("FaqCategory"),
  defaults: { title: "" },
  fields: [text("title", "カテゴリー名")],
  slots: [many("content", "Questions", ["pinsel.faq"])],
  staticProps: [POSITION],
});

const cta = defineComponent<CtaProps>()(Cta, {
  id: "pinsel.cta",
  schemaVersion: 1,
  title: "CTA",
  category: "Sections",
  description: "The closing CONTACT section and its art.",
  source: source("Cta"),
  defaults: { heading: "まずはお気軽にご相談ください。", subCopy: "", buttonLabel: "お問い合わせ", large: true },
  fields: [text("heading", "見出し"), text("subCopy", "補足文"), text("buttonLabel", "ボタン"), bool("large", "大きな絵")],
});

const pageHeading = defineComponent<PageHeadingProps>()(PageHeading, {
  id: "pinsel.page-heading",
  schemaVersion: 1,
  title: "Page heading",
  category: "Sections",
  description: "Breadcrumb, eyebrow + h1, description, optional stats and the shallow hero art.",
  source: source("PageHeading"),
  defaults: { title: "", description: "", eyebrow: "", artSize: "small" },
  fields: [
    text("title", "ページ見出し"),
    longText("description", "ページ説明"),
    text("eyebrow", "Eyebrow"),
    { kind: "select", prop: "artSize", label: "Art", options: ["small", "medium", "ribbon", "none"] },
  ],
  slots: [many("stats", "Stats", ["pinsel.stat"])],
});

const stat = defineComponent<StatProps>()(Stat, {
  id: "pinsel.stat",
  schemaVersion: 1,
  title: "Stat",
  category: "Sections",
  description: "One results figure.",
  source: source("Stat"),
  defaults: { number: "", label: "" },
  fields: [text("number", "数値（表示）"), text("label", "ラベル")],
});

const courseSteps = defineComponent<CourseStepsProps>()(CourseSteps, {
  id: "pinsel.course-steps",
  schemaVersion: 1,
  title: "Course steps",
  category: "Sections",
  description: "The lessons 授業内容 cards.",
  source: source("CourseSteps"),
  slots: [many("items", "Steps", ["pinsel.course-step"])],
});

const courseStep = defineComponent<CourseStepProps>()(CourseStep, {
  id: "pinsel.course-step",
  schemaVersion: 1,
  title: "Course step",
  category: "Sections",
  description: "Numbered step card.",
  source: source("CourseStep"),
  defaults: { title: "", description: "" },
  fields: [text("title", "見出し"), longText("description", "説明")],
  staticProps: [POSITION],
});

const priceDetail = defineComponent<PriceDetailProps>()(PriceDetail, {
  id: "pinsel.price-detail",
  schemaVersion: 1,
  title: "Price detail",
  category: "Sections",
  description: "The lessons クラス価格 cards.",
  source: source("PriceDetail"),
  slots: [many("items", "Courses", ["pinsel.price-detail-card"])],
});

const priceDetailCard = defineComponent<PriceDetailCardProps>()(PriceDetailCard, {
  id: "pinsel.price-detail-card",
  schemaVersion: 1,
  title: "Price detail card",
  category: "Sections",
  description: "Course name, price and the per-month note.",
  source: source("PriceDetailCard"),
  defaults: { name: "", price: "", note: "" },
  fields: [text("name", "コース名"), text("price", "価格（表示）"), text("note", "補足")],
});

const consultationIntro = defineComponent<ConsultationIntroProps>()(ConsultationIntro, {
  id: "pinsel.consultation-intro",
  schemaVersion: 1,
  title: "Consultation intro",
  category: "Sections",
  description: "The lessons 有料進路相談 price summary and its two topic lists.",
  source: source("ConsultationIntro"),
  defaults: { name: "", price: "", note: "", topicsTitle: "", topics: [], faqTitle: "", faqTopics: [] },
  fields: [
    text("name", "名称"),
    text("price", "価格（表示）"),
    text("note", "補足"),
    text("topicsTitle", "面談で話す内容 見出し"),
    textList("topics", "面談で話す内容"),
    text("faqTitle", "よくある質問 見出し"),
    textList("faqTopics", "よくある質問"),
  ],
});

const timeline = defineComponent<TimelineProps>()(Timeline, {
  id: "pinsel.timeline",
  schemaVersion: 1,
  title: "Timeline",
  category: "Sections",
  description: "Year + text rows; plain, as a CV column (h2) or as the lessons career block (h3).",
  source: source("Timeline"),
  defaults: { variant: "plain", title: "" },
  fields: [{ kind: "select", prop: "variant", label: "Variant", options: ["plain", "cv", "career"] }, text("title", "見出し")],
  slots: [many("items", "Entries", ["pinsel.timeline-entry"])],
});

const timelineEntry = defineComponent<TimelineEntryProps>()(TimelineEntry, {
  id: "pinsel.timeline-entry",
  schemaVersion: 1,
  title: "Timeline entry",
  category: "Sections",
  description: "One year and its text.",
  source: source("TimelineEntry"),
  defaults: { year: "", text: "" },
  fields: [text("year", "年"), text("text", "内容")],
});

const specializationGrid = defineComponent<SpecializationGridProps>()(SpecializationGrid, {
  id: "pinsel.specialization-grid",
  schemaVersion: 1,
  title: "Specialization grid",
  category: "Sections",
  description: "The lessons 専攻分野 grid.",
  source: source("SpecializationGrid"),
  slots: [many("items", "Specializations", ["pinsel.specialization"])],
});

const specialization = defineComponent<SpecializationProps>()(Specialization, {
  id: "pinsel.specialization",
  schemaVersion: 1,
  title: "Specialization",
  category: "Sections",
  description: "German and Japanese name.",
  source: source("Specialization"),
  defaults: { de: "", ja: "" },
  fields: [text("de", "ドイツ語名"), text("ja", "日本語名")],
});

const graduatesSection = defineComponent<GraduatesSectionProps>()(GraduatesSection, {
  id: "pinsel.graduates-section",
  schemaVersion: 1,
  title: "Graduates section",
  category: "Sections",
  description: "section#graduates: the passage beside the approved R7-10 illustration.",
  source: source("GraduatesSection"),
  defaults: { eyebrow: "For Graduates", title: "", paragraphs: [] },
  fields: [text("eyebrow", "Eyebrow"), text("title", "見出し"), textList("paragraphs", "本文（段落ごと）")],
});

const noteCards = defineComponent<NoteCardsProps>()(NoteCards, {
  id: "pinsel.note-cards",
  schemaVersion: 1,
  title: "Note cards",
  category: "Sections",
  description: "Numbered note links; the editorial variant on the notes index.",
  source: source("NoteCards"),
  defaults: { editorial: false },
  fields: [bool("editorial", "ノート一覧レイアウト")],
  slots: [many("items", "Notes", ["pinsel.note-card"])],
});

const noteCard = defineComponent<NoteCardProps>()(NoteCard, {
  id: "pinsel.note-card",
  schemaVersion: 1,
  title: "Note card",
  category: "Sections",
  description: "Index number, title, description, arrow.",
  source: source("NoteCard"),
  defaults: { href: "/notes/", title: "", description: "" },
  fields: [text("href", "リンク先"), text("title", "見出し"), longText("description", "説明")],
  staticProps: [POSITION],
});

const message = defineComponent<MessageProps>()(Message, {
  id: "pinsel.message",
  schemaVersion: 1,
  title: "Message",
  category: "Sections",
  description: "The about #message block.",
  source: source("Message"),
  defaults: { eyebrow: "Message", title: "", paragraphs: [] },
  fields: [text("eyebrow", "Eyebrow"), text("title", "見出し"), textList("paragraphs", "本文（段落ごと）")],
});

const featureGrid = defineComponent<FeatureGridProps>()(FeatureGrid, {
  id: "pinsel.feature-grid",
  schemaVersion: 1,
  title: "Feature grid",
  category: "Sections",
  description: "The about レッスンの特長 cards.",
  source: source("FeatureGrid"),
  slots: [many("items", "Features", ["pinsel.feature-card"])],
});

const featureCard = defineComponent<FeatureCardProps>()(FeatureCard, {
  id: "pinsel.feature-card",
  schemaVersion: 1,
  title: "Feature card",
  category: "Sections",
  description: "Title and description.",
  source: source("FeatureCard"),
  defaults: { title: "", description: "" },
  fields: [text("title", "見出し"), longText("description", "説明")],
});

const resultsYear = defineComponent<ResultsYearSectionProps>()(ResultsYearSection, {
  id: "pinsel.results-year",
  schemaVersion: 1,
  title: "Results year",
  category: "Sections",
  description: "section#year-<label>: h2 with the declared count and the school rows.",
  source: source("ResultsYearSection"),
  defaults: { label: "", count: 0 },
  fields: [text("label", "年度"), number("count", "件数")],
  slots: [many("rows", "Rows", ["pinsel.result-row"])],
});

const resultRow = defineComponent<ResultRowProps>()(ResultRow, {
  id: "pinsel.result-row",
  schemaVersion: 1,
  title: "Result row",
  category: "Sections",
  description: "School and department; links out when a URL is set.",
  source: source("ResultRow"),
  defaults: { school: "", department: "", url: "" },
  fields: [text("school", "大学名"), text("department", "学科"), { kind: "text", prop: "url", label: "大学サイト", format: "url" }],
});

const studentIndex = defineComponent<StudentIndexProps>()(StudentIndex, {
  id: "pinsel.student-index",
  schemaVersion: 1,
  title: "Student index",
  category: "Sections",
  description: "The voices index linking #student-N.",
  source: source("StudentIndex"),
  slots: [many("items", "Students", ["pinsel.student-link"])],
});

const studentLink = defineComponent<StudentLinkProps>()(StudentLink, {
  id: "pinsel.student-link",
  schemaVersion: 1,
  title: "Student link",
  category: "Sections",
  description: "Author and school, linking #student-<position>.",
  source: source("StudentLink"),
  defaults: { author: "", school: "" },
  fields: [text("author", "名前"), text("school", "合格校")],
  staticProps: [POSITION],
});

const voiceDetail = defineComponent<VoiceDetailProps>()(VoiceDetail, {
  id: "pinsel.voice-detail",
  schemaVersion: 1,
  title: "Voice detail",
  category: "Sections",
  description: "article#student-<position>: meta header and the full quote; the middle art follows #artAfter.",
  source: source("VoiceDetail"),
  defaults: { author: "", yearLabel: "", school: "", department: "", quote: "", artAfter: 2 },
  fields: [text("author", "名前"), text("yearLabel", "合格年度"), text("school", "合格校"), text("department", "学科"), longText("quote", "本文"), number("artAfter", "この番号の後に絵")],
  staticProps: [POSITION],
});

const articleHeading = defineComponent<ArticleHeadingProps>()(ArticleHeading, {
  id: "pinsel.article-heading",
  schemaVersion: 1,
  title: "Article heading",
  category: "Sections",
  description: "A note's breadcrumb, heading block and ribbon art.",
  source: source("ArticleHeading"),
  defaults: { title: "", description: "", eyebrow: "Pinsel Notes", slug: "", parentLabel: "Notes", parentHref: "/notes/" },
  fields: [
    text("title", "タイトル"),
    longText("description", "説明"),
    text("eyebrow", "Eyebrow"),
    text("slug", "スラッグ"),
    text("parentLabel", "親ページ名"),
    text("parentHref", "親ページ"),
  ],
});

const articleLayout = defineComponent<ArticleLayoutProps>()(ArticleLayout, {
  id: "pinsel.article-layout",
  schemaVersion: 1,
  title: "Article layout",
  category: "Sections",
  description: "Contents rail from the body's h2s, the prose, and the All Notes list.",
  source: source("ArticleLayout"),
  defaults: { markdown: "", contentsLabel: "Contents", allNotesLabel: "All Notes" },
  fields: [markdown("markdown", "本文"), text("contentsLabel", "目次ラベル"), text("allNotesLabel", "記事一覧 見出し")],
  slots: [many("related", "All notes", ["pinsel.related-note"])],
});

const relatedNote = defineComponent<RelatedNoteProps>()(RelatedNote, {
  id: "pinsel.related-note",
  schemaVersion: 1,
  title: "Related note",
  category: "Sections",
  description: "One All Notes entry; the current note is not a link.",
  source: source("RelatedNote"),
  defaults: { href: "/notes/", title: "" },
  fields: [text("href", "リンク先"), text("title", "タイトル")],
  staticProps: [ROUTE],
});

const notFound = defineComponent<NotFoundProps>()(NotFound, {
  id: "pinsel.not-found",
  schemaVersion: 1,
  title: "Not found",
  category: "Sections",
  description: "The 404 block and its art.",
  source: source("NotFound"),
  defaults: { title: "", body: "", linkLabel: "" },
  fields: [text("title", "見出し"), longText("body", "本文"), text("linkLabel", "リンク文言")],
});

// ---- Forms ----------------------------------------------------------------

const contactLayout = defineComponent<ContactLayoutProps>()(ContactLayout, {
  id: "pinsel.contact-layout",
  schemaVersion: 1,
  title: "Contact layout",
  category: "Forms",
  description: "お申し込みの流れ aside beside the form panel.",
  source: source("ContactLayout"),
  defaults: { stepsTitle: "" },
  fields: [text("stepsTitle", "流れ 見出し")],
  slots: [many("steps", "Steps", ["pinsel.step"]), many("panel", "Panel", ["pinsel.contact-form"])],
});

const step = defineComponent<StepProps>()(Step, {
  id: "pinsel.step",
  schemaVersion: 1,
  title: "Step",
  category: "Forms",
  description: "One numbered step of the application flow.",
  source: source("Step"),
  defaults: { title: "", description: "" },
  fields: [text("title", "見出し"), text("description", "説明")],
  staticProps: [POSITION],
});

const contactForm = defineComponent<ContactFormProps>()(ContactForm, {
  id: "pinsel.contact-form",
  schemaVersion: 1,
  title: "Contact form",
  category: "Forms",
  description: "The preview-only inquiry form and its success panel; nothing is sent.",
  source: source("ContactForm"),
  defaults: {
    formAriaLabel: "",
    errorMessage: "",
    nameLabel: "",
    emailLabel: "",
    courseLabel: "",
    courseUndecidedOption: "",
    messageLabel: "",
    requiredLabel: "",
    optionalLabel: "",
    submitLabel: "",
    submittingLabel: "",
    valueMissingMessage: "",
    emailFormatMessage: "",
    previewNotice: "",
    successPreviewEyebrow: "",
    successTitle: "",
    successBody: "",
    successPreviewNotice: "",
    backLabel: "",
  },
  fields: [
    text("formAriaLabel", "フォーム名（読み上げ）"),
    longText("errorMessage", "送信失敗 メッセージ"),
    text("nameLabel", "お名前 ラベル"),
    text("emailLabel", "メールアドレス ラベル"),
    text("courseLabel", "ご希望のコース ラベル"),
    text("courseUndecidedOption", "コース未定の選択肢"),
    text("messageLabel", "ご相談内容 ラベル"),
    text("requiredLabel", "必須 表記"),
    text("optionalLabel", "任意 表記"),
    text("submitLabel", "送信ボタン"),
    text("submittingLabel", "送信中 表記"),
    text("valueMissingMessage", "未入力エラー（{label} はラベル）"),
    text("emailFormatMessage", "メール形式エラー"),
    longText("previewNotice", "プレビュー注記（フォーム）"),
    text("successPreviewEyebrow", "プレビュー注記 見出し（完了画面）"),
    text("successTitle", "送信完了 見出し"),
    longText("successBody", "送信完了 本文"),
    longText("successPreviewNotice", "プレビュー注記（完了画面）"),
    text("backLabel", "入力画面に戻る"),
  ],
  slots: [many("courseOptions", "Course options", ["pinsel.course-option"])],
});

const courseOption = defineComponent<CourseOptionProps>()(CourseOption, {
  id: "pinsel.course-option",
  schemaVersion: 1,
  title: "Course option",
  category: "Forms",
  description: "One course in the form's select, after 未定.",
  source: source("CourseOption"),
  defaults: { label: "" },
  fields: [text("label", "選択肢名")],
});

const legalTable = defineComponent<LegalTableProps>()(LegalTable, {
  id: "pinsel.legal-table",
  schemaVersion: 1,
  title: "Legal table",
  category: "Forms",
  description: "details#legal: 特定商取引法に基づく表記.",
  source: source("LegalTable"),
  defaults: { summary: "" },
  fields: [text("summary", "見出し")],
  slots: [many("rows", "Rows", ["pinsel.legal-row"])],
});

const legalRow = defineComponent<LegalRowProps>()(LegalRow, {
  id: "pinsel.legal-row",
  schemaVersion: 1,
  title: "Legal row",
  category: "Forms",
  description: "One th/td row.",
  source: source("LegalRow"),
  defaults: { term: "", value: "" },
  fields: [text("term", "項目"), text("value", "内容")],
});

export const PINSEL_PACK_ID = "pinsel";
export const PINSEL_PACK_VERSION = "0.2.0";

export const pinselPack = defineComponentPack({
  packId: PINSEL_PACK_ID,
  packVersion: PINSEL_PACK_VERSION,
  components: [
    // The six Gate-1 components keep their position and contract.
    siteFrame,
    section,
    heading,
    prose,
    pricingCards,
    pricingCard,
    navLink,
    footerLink,
    breadcrumb,
    fragment,
    sectionAfter,
    twoColumn,
    archiveLayout,
    toc,
    tocItem,
    paragraphs,
    moreLink,
    artWindow,
    hero,
    heroMeta,
    checklist,
    checklistItem,
    instructor,
    resultPreviews,
    resultPreview,
    voicePreviews,
    voicePreview,
    faq,
    faqItem,
    faqCategory,
    cta,
    pageHeading,
    stat,
    courseSteps,
    courseStep,
    priceDetail,
    priceDetailCard,
    consultationIntro,
    timeline,
    timelineEntry,
    specializationGrid,
    specialization,
    graduatesSection,
    noteCards,
    noteCard,
    message,
    featureGrid,
    featureCard,
    resultsYear,
    resultRow,
    studentIndex,
    studentLink,
    voiceDetail,
    articleHeading,
    articleLayout,
    relatedNote,
    notFound,
    contactLayout,
    step,
    contactForm,
    courseOption,
    legalTable,
    legalRow,
  ],
});

/** The renderer registry for `renderRouteDocument`: every pack component by id. */
export const pinselRegistry: RenderRegistry = {
  manifest: pinselPack.manifest,
  components: Object.fromEntries(
    Object.entries(pinselPack.runtime.components).map(([id, entry]) => [id, entry.component as unknown as RenderableComponent]),
  ),
};
