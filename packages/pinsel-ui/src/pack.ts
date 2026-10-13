import { defineComponent, defineComponentPack, type JsonValue, type TrustedComponentPack } from "@zudo-composer/component-contract";
import { ART_SIZES, ART_SLOTS } from "./art-window/art-window";
import { Breadcrumb } from "./breadcrumb/breadcrumb";
import { Checklist, ChecklistItem } from "./checklist/checklist";
import { CourseOption } from "./contact-form/contact-form";
import { Step } from "./contact-layout/contact-layout";
import * as C from "./contract/contract-components";
import { CourseStep, CourseSteps } from "./course-steps/course-steps";
import { FeatureCard, FeatureGrid } from "./feature-grid/feature-grid";
import { FooterLink } from "./footer-link/footer-link";
import { HeroMeta } from "./hero-meta/hero-meta";
import { LegalRow } from "./legal-table/legal-table";
import { NavLink } from "./nav-link/nav-link";
import { NoteCards } from "./note-cards/note-cards";
import { Stat } from "./page-heading/page-heading";
import { PriceDetail, PriceDetailCard } from "./price-detail/price-detail";
import { PricingCard, PricingCards } from "./pricing-cards/pricing-cards";
import { Prose } from "./prose/prose";
import type { RenderRegistry, RenderableComponent } from "./render/types";
import { ResultPreview, ResultPreviews } from "./result-previews/result-previews";
import { ResultRow, ResultsYearSection } from "./results-year/results-year";
import { SectionAfter } from "./section-after/section-after";
import { Specialization, SpecializationGrid } from "./specialization-grid/specialization-grid";
import { StudentIndex, StudentLink } from "./student-index/student-index";
import { TextLink } from "./text-link/text-link";
import { TimelineEntry } from "./timeline/timeline";
import { Toc } from "./toc/toc";
import { VoicePreview, VoicePreviews } from "./voice-previews/voice-previews";

// The Pinsel component pack. It implements the component contract the
// structure manifest authors against, packages/pinsel-content/src/site/
// component-contract.ts, exactly: ids, schema versions, prop kinds and
// defaults, slots and their `accepts` (`pnpm --filter @pinsel/content
// content:validate` lists any drift). Change the contract and this pack
// together and bump the pack version. `source.module` names this package so
// the manifest satisfies the contract's public-bare-import rule.
//
// Every component also receives two renderer-injected props, never authored:
// `route` ({ pathname }; plan pathnames have no trailing slash) and
// `position` ({ index, count }: the node's 1-based place in its immediate
// parent slot). Positional ids and numbering (`#student-3`, `01`) use it.

export const PINSEL_PACK_ID = "pinsel";
export const PINSEL_PACK_VERSION = "0.2.0";

type Kind = "text" | "multiline" | "number" | "boolean" | readonly string[];
type PropSpec = readonly [prop: string, kind: Kind, fallback: JsonValue, label: string];
type SlotSpec = readonly [id: string, cardinality: "single" | "many", accepts?: readonly string[]];

interface Spec {
  id: string;
  title: string;
  category: "Chrome" | "Layout" | "Typography" | "Sections" | "Art" | "Forms";
  description: string;
  component: (props: never) => unknown;
  exportName: string;
  schemaVersion?: number;
  props?: readonly PropSpec[];
  slots?: readonly SlotSpec[];
}

function field([prop, kind, , label]: PropSpec): Record<string, unknown> {
  if (Array.isArray(kind)) return { kind: "select", prop, label, options: [...kind] };
  if (kind === "multiline") return { prop, label, schema: { type: "string" }, editor: { kind: "text", multiline: true } };
  if (kind === "number") return { kind: "number", prop, label, step: 1 };
  return { kind, prop, label };
}

function define(spec: Spec) {
  const props = spec.props ?? [];
  const author = defineComponent<Record<string, unknown>>() as unknown as (component: unknown, definition: unknown) => unknown;
  return author(spec.component, {
    id: `pinsel.${spec.id}`,
    schemaVersion: spec.schemaVersion ?? 1,
    title: spec.title,
    category: spec.category,
    description: spec.description,
    source: { module: "@pinsel/ui", exportKind: "named", exportName: spec.exportName },
    defaults: Object.fromEntries(props.map(([prop, , fallback]) => [prop, fallback])),
    fields: props.map(field),
    slots: (spec.slots ?? []).map(([id, cardinality, accepts]) => ({ id, prop: id, label: id, cardinality, ...(accepts ? { accepts: [...accepts] } : {}) })),
    staticProps: [
      { prop: "route", reason: "Injected by the renderer from the compiled route." },
      { prop: "position", reason: "Injected by the renderer: the node's place in its parent slot." },
    ],
  });
}

const t = (prop: string, label: string, fallback = ""): PropSpec => [prop, "text", fallback, label];
const ml = (prop: string, label: string): PropSpec => [prop, "multiline", "", label];
const n = (prop: string, label: string, fallback = 0): PropSpec => [prop, "number", fallback, label];
const b = (prop: string, label: string, fallback = false): PropSpec => [prop, "boolean", fallback, label];
const sel = (prop: string, label: string, options: readonly string[], fallback: string): PropSpec => [prop, options, fallback, label];
const many = (id: string, accepts?: readonly string[]): SlotSpec => [id, "many", accepts];
const one = (id: string, accepts?: readonly string[]): SlotSpec => [id, "single", accepts];
const items = (...accepts: string[]): SlotSpec => many("items", accepts.map((id) => `pinsel.${id}`));

const SPECS: readonly Spec[] = [
  // Chrome
  { id: "site-frame", schemaVersion: 2, title: "Site frame", category: "Chrome", description: "Skip link, header, <main id=main> and footer: the root of every page.", component: C.SiteFrameRoot, exportName: "SiteFrameRoot", slots: [one("header", ["pinsel.site-header"]), many("main"), one("footer", ["pinsel.site-footer"])] },
  { id: "site-header", title: "Site header", category: "Chrome", description: "Brand, menu toggle, navigation, the green contact button, motion toggle.", component: C.SiteHeaderBlock, exportName: "SiteHeaderBlock", props: [t("brandWord", "ブランド名"), t("brandSub", "ブランド副題"), t("contactLabel", "お問い合わせボタン")], slots: [many("nav", ["pinsel.nav-item", "pinsel.group"])] },
  { id: "nav-item", title: "Header nav item", category: "Chrome", description: "One header link; aria-current on its own section.", component: NavLink, exportName: "NavLink", props: [t("href", "リンク先"), t("label", "表示名")] },
  { id: "site-footer", title: "Site footer", category: "Chrome", description: "Identity, Instagram, footer links, copyright and back-to-top.", component: C.SiteFooterBlock, exportName: "SiteFooterBlock", props: [t("brandWord", "ブランド名"), t("brandSub", "ブランド副題"), t("instagramLabel", "Instagram 表示名"), t("copyright", "コピーライト（{year} は現在年）"), t("backToTopLabel", "「ページの先頭へ」")], slots: [many("nav", ["pinsel.footer-nav-item"])] },
  { id: "footer-nav-item", title: "Footer nav item", category: "Chrome", description: "English label, title and description.", component: FooterLink, exportName: "FooterLink", props: [t("href", "リンク先"), t("label", "英語ラベル"), t("title", "見出し"), t("description", "説明")] },

  // Generic
  { id: "group", title: "Group", category: "Layout", description: "Renders its items without a wrapper; the attachment host.", component: C.Group, exportName: "Group", slots: [many("items")] },
  { id: "art-window", title: "Art window", category: "Art", description: "Decorative watercolor window; never behind text.", component: C.ArtWindowBlock, exportName: "ArtWindowBlock", props: [sel("slot", "Art", ART_SLOTS, "middle"), sel("size", "Size", ART_SIZES, "large"), sel("drift", "Drift", ["1", "-1"], "1"), n("range", "Motion range", 52)] },
  { id: "section", schemaVersion: 2, title: "Section", category: "Layout", description: "Reading-zone section with an eyebrow and an h2.", component: C.SectionBlock, exportName: "SectionBlock", props: [t("id", "Fragment id"), t("eyebrow", "Eyebrow"), t("title", "見出し"), sel("variant", "Variant", ["default", "instructor"], "default")], slots: [many("content")] },
  { id: "plain-section", title: "Plain section", category: "Layout", description: "Reading-zone section without a heading.", component: C.PlainSection, exportName: "PlainSection", props: [t("ariaLabel", "aria-label")], slots: [many("content")] },
  { id: "section-after", title: "Section after", category: "Layout", description: "The spaced closing block of a section.", component: SectionAfter, exportName: "SectionAfter", slots: [many("content")] },
  { id: "text-link", title: "Text link", category: "Typography", description: "Arrow per destination, Instagram icon for instagram.com.", component: TextLink, exportName: "TextLink", props: [t("href", "リンク先"), t("label", "リンク文言")] },
  { id: "eyebrow", title: "Eyebrow", category: "Typography", description: "p.eyebrow.", component: C.Eyebrow, exportName: "Eyebrow", props: [t("text", "テキスト")] },
  { id: "prose-block", title: "Prose block", category: "Typography", description: "div.prose around paragraphs.", component: C.ProseBlock, exportName: "ProseBlock", slots: [items("paragraph", "paragraphs")] },
  { id: "paragraph", title: "Paragraph", category: "Typography", description: "One <p>, line breaks kept.", component: C.Paragraph, exportName: "Paragraph", props: [ml("text", "本文")] },
  { id: "paragraphs", title: "Paragraphs", category: "Typography", description: "One <p> per line.", component: C.ParagraphLines, exportName: "ParagraphLines", props: [ml("text", "本文（行ごとに段落）")] },
  { id: "prose", title: "Prose", category: "Typography", description: "Note Markdown through the safe subset.", component: Prose, exportName: "Prose", props: [ml("markdown", "本文（Markdown）")] },

  // Page heads
  { id: "breadcrumb", title: "Breadcrumb", category: "Chrome", description: "トップ › [parent ›] current page.", component: Breadcrumb, exportName: "Breadcrumb", props: [t("label", "現在のページ"), t("parentHref", "親ページ"), t("parentLabel", "親ページ名")] },
  { id: "page-heading", title: "Page heading", category: "Sections", description: "Eyebrow + h1, description and what follows it (results stats).", component: C.PageHeadingBlock, exportName: "PageHeadingBlock", props: [t("eyebrow", "Eyebrow"), t("title", "ページ見出し"), t("description", "ページ説明")], slots: [many("after", ["pinsel.stats", "pinsel.group"])] },
  { id: "stats", title: "Stats", category: "Sections", description: "div.stats.", component: C.Stats, exportName: "Stats", slots: [items("stat")] },
  { id: "stat", title: "Stat", category: "Sections", description: "One results figure.", component: Stat, exportName: "Stat", props: [t("number", "数値（表示）"), t("label", "ラベル")] },

  // Home
  { id: "hero", title: "Hero", category: "Sections", description: "The home hero: label, h1 lines, lead, actions, art.", component: C.HeroBlock, exportName: "HeroBlock", props: [t("label", "ラベル"), ml("titleLines", "見出し（行ごと）"), ml("lead", "本文"), t("primaryLabel", "主ボタン"), t("primaryHref", "主ボタン リンク先"), t("pricingLabel", "料金リンク"), t("pricingHref", "料金リンク先")], slots: [one("art", ["pinsel.art-window"])] },
  { id: "hero-meta", title: "Hero meta", category: "Sections", description: "The band under the home hero.", component: HeroMeta, exportName: "HeroMeta", props: [t("line", "キャッチ"), t("intro", "紹介文")] },
  { id: "checklist", title: "Checklist", category: "Sections", description: "こんな方へ.", component: Checklist, exportName: "Checklist", slots: [items("checklist-item")] },
  { id: "checklist-item", title: "Checklist item", category: "Sections", description: "One checked item.", component: ChecklistItem, exportName: "ChecklistItem", props: [t("text", "項目")] },
  { id: "pricing-cards", title: "Pricing cards", category: "Sections", description: "The home pricing grid, note and lessons link.", component: PricingCards, exportName: "PricingCards", props: [t("note", "注記"), t("moreLabel", "詳細リンク"), t("moreHref", "詳細リンク先", "/lessons/")], slots: [items("pricing-card")] },
  {
    id: "pricing-card",
    title: "Pricing card",
    category: "Sections",
    description: "One course and its contact link.",
    component: PricingCard,
    exportName: "PricingCard",
    props: [t("name", "コース名"), t("price", "価格（表示）"), t("unit", "回数・単位"), t("description", "説明"), b("featured", "人気表示"), n("courseIndex", "表示順", 1), t("taxLabel", "税込表記", "税込"), t("popularBadge", "人気バッジ", "POPULAR"), t("linkLabel", "リンク文言", "このコースについて相談する")],
  },
  { id: "instructor", title: "Instructor", category: "Sections", description: "Modest portrait beside the identity block.", component: C.InstructorBlock, exportName: "InstructorBlock", props: [t("name", "氏名"), t("latinName", "氏名（ローマ字）"), t("portraitAlt", "写真の代替テキスト"), b("about", "講師紹介ページ")], slots: [many("identity", ["pinsel.instructor-subtitle", "pinsel.instructor-bio", "pinsel.instructor-bio-link", "pinsel.text-link", "pinsel.group"])] },
  { id: "instructor-subtitle", title: "Instructor subtitle", category: "Sections", description: "p.instructor__subtitle.", component: C.InstructorSubtitle, exportName: "InstructorSubtitle", props: [t("text", "肩書・生年")] },
  { id: "instructor-bio", title: "Instructor bio", category: "Sections", description: "div.instructor__bio > p.", component: C.InstructorBio, exportName: "InstructorBio", props: [t("text", "紹介文")] },
  { id: "instructor-bio-link", title: "Instructor bio link", category: "Sections", description: "The about page Instagram link.", component: C.InstructorBioLink, exportName: "InstructorBioLink", props: [t("href", "リンク先"), t("label", "リンク文言")] },
  { id: "results-preview", title: "Result previews", category: "Sections", description: "The home 合格実績 cards.", component: ResultPreviews, exportName: "ResultPreviews", slots: [items("result-preview")] },
  { id: "result-preview", title: "Result preview", category: "Sections", description: "Year, school, department.", component: ResultPreview, exportName: "ResultPreview", props: [t("yearLabel", "年"), t("school", "大学名"), t("detail", "学科")] },
  { id: "voices-preview", title: "Voice previews", category: "Sections", description: "The home 生徒の声 excerpts.", component: VoicePreviews, exportName: "VoicePreviews", slots: [items("voice-preview")] },
  { id: "voice-preview", title: "Voice preview", category: "Sections", description: "Quote, author, school.", component: VoicePreview, exportName: "VoicePreview", props: [t("quote", "抜粋"), t("author", "名前"), t("school", "合格校")] },
  { id: "faq-list", title: "FAQ list", category: "Sections", description: "div.faq-list.", component: C.FaqList, exportName: "FaqList", slots: [items("faq-item")] },
  { id: "faq-item", title: "FAQ item", category: "Sections", description: "details#<idPrefix>-<position>, optionally open when first.", component: C.FaqItemBlock, exportName: "FaqItemBlock", props: [t("question", "質問"), t("answer", "回答"), t("idPrefix", "id 接頭辞", "q"), b("openFirst", "先頭を開く")] },
  { id: "cta", title: "CTA", category: "Sections", description: "The closing CONTACT section.", component: C.CtaBlock, exportName: "CtaBlock", props: [t("title", "見出し"), t("buttonLabel", "ボタン")], slots: [one("subcopy", ["pinsel.cta-subcopy"]), one("art", ["pinsel.art-window"])] },
  { id: "cta-subcopy", title: "CTA sub copy", category: "Sections", description: "The page's CTA copy without the repeated opening sentence.", component: C.CtaSubcopy, exportName: "CtaSubcopy", props: [t("text", "補足文")] },

  // Lessons
  { id: "toc", title: "Table of contents", category: "Layout", description: "Numbered in-page navigation.", component: Toc, exportName: "Toc", props: [t("label", "ラベル"), b("wide", "横幅いっぱい")], slots: [items("toc-item", "note-toc-items", "group")] },
  { id: "toc-item", title: "TOC item", category: "Layout", description: "href, or #<fragmentPrefix><position>; number, or the position.", component: C.TocItemBlock, exportName: "TocItemBlock", props: [t("label", "表示名"), t("href", "リンク先"), t("fragmentPrefix", "Fragment 接頭辞"), n("number", "番号")] },
  { id: "note-toc-items", title: "Note TOC items", category: "Layout", description: "One entry per ## heading of a note.", component: C.NoteTocItems, exportName: "NoteTocItems", props: [ml("markdown", "本文（Markdown）")] },
  { id: "course-steps", title: "Course steps", category: "Sections", description: "The lessons 授業内容 cards.", component: CourseSteps, exportName: "CourseSteps", slots: [items("course-step")] },
  { id: "course-step", title: "Course step", category: "Sections", description: "Numbered step card.", component: CourseStep, exportName: "CourseStep", props: [t("title", "見出し"), t("description", "説明")] },
  { id: "price-detail", title: "Price detail", category: "Sections", description: "The lessons クラス価格 cards.", component: PriceDetail, exportName: "PriceDetail", slots: [items("price-detail-card")] },
  { id: "price-detail-card", title: "Price detail card", category: "Sections", description: "Name, price, note.", component: PriceDetailCard, exportName: "PriceDetailCard", props: [t("name", "コース名"), t("price", "価格（表示）"), t("note", "補足")] },
  { id: "consultation-intro", title: "Consultation intro", category: "Sections", description: "The 有料進路相談 price and its two topic lists.", component: C.ConsultationIntroBlock, exportName: "ConsultationIntroBlock", props: [t("topicsTitle", "面談で話す内容 見出し"), ml("topics", "面談で話す内容（行ごと）"), t("faqTitle", "よくある質問 見出し"), ml("faqTopics", "よくある質問（行ごと）")], slots: [one("course", ["pinsel.consultation-price"])] },
  { id: "consultation-price", title: "Consultation price", category: "Sections", description: "Name, price, note.", component: C.ConsultationPrice, exportName: "ConsultationPrice", props: [t("name", "名称"), t("price", "価格（表示）"), t("note", "補足")] },
  { id: "lesson-career", title: "Lesson career", category: "Sections", description: "The lessons 経歴 block.", component: C.LessonCareer, exportName: "LessonCareer", props: [t("title", "見出し")], slots: [items("timeline-item")] },
  { id: "timeline-item", title: "Timeline item", category: "Sections", description: "Year and text.", component: TimelineEntry, exportName: "TimelineEntry", props: [t("year", "年"), t("text", "内容")] },
  { id: "specialization-grid", title: "Specialization grid", category: "Sections", description: "The 専攻分野 grid.", component: SpecializationGrid, exportName: "SpecializationGrid", slots: [items("specialization-item")] },
  { id: "specialization-item", title: "Specialization", category: "Sections", description: "German and Japanese name.", component: Specialization, exportName: "Specialization", props: [t("de", "ドイツ語名"), t("ja", "日本語名")] },
  { id: "graduate-content", title: "Graduate content", category: "Sections", description: "The graduates passage beside the R7-10 illustration.", component: C.GraduateContent, exportName: "GraduateContent", props: [ml("paragraphs", "本文（行ごとに段落）")] },
  { id: "note-cards", title: "Note cards", category: "Sections", description: "Numbered note links; editorial on the notes index.", component: NoteCards, exportName: "NoteCards", props: [b("editorial", "ノート一覧レイアウト")], slots: [items("note-card")] },
  { id: "note-card", title: "Note card", category: "Sections", description: "Index, title, description, arrow.", component: C.NoteCardBlock, exportName: "NoteCardBlock", props: [t("href", "リンク先"), t("slug", "記事スラッグ"), t("title", "見出し"), t("description", "説明")] },

  // About
  { id: "cv", title: "CV", category: "Sections", description: "The about 経歴 / 学歴 columns.", component: C.Cv, exportName: "Cv", props: [t("careerTitle", "経歴 見出し"), t("educationTitle", "学歴 見出し")], slots: [many("career", ["pinsel.timeline-item"]), many("education", ["pinsel.timeline-item"])] },
  { id: "message", title: "Message", category: "Sections", description: "The about #message block.", component: C.MessageBlock, exportName: "MessageBlock", props: [t("eyebrow", "Eyebrow"), t("title", "見出し")], slots: [many("content", ["pinsel.prose-block", "pinsel.group"])] },
  { id: "feature-grid", title: "Feature grid", category: "Sections", description: "The レッスンの特長 cards.", component: FeatureGrid, exportName: "FeatureGrid", slots: [items("feature-card")] },
  { id: "feature-card", title: "Feature card", category: "Sections", description: "Title and description.", component: FeatureCard, exportName: "FeatureCard", props: [t("title", "見出し"), t("description", "説明")] },

  // Results / FAQ
  { id: "archive-layout", title: "Archive layout", category: "Layout", description: "Aside rail beside the archive body.", component: C.ArchiveLayoutBlock, exportName: "ArchiveLayoutBlock", slots: [many("aside"), many("body")] },
  { id: "year-section", title: "Results year", category: "Sections", description: "section#year-<label> with the declared count.", component: ResultsYearSection, exportName: "ResultsYearSection", props: [t("label", "年度"), n("count", "件数")], slots: [items("result-row")] },
  { id: "result-row", title: "Result row", category: "Sections", description: "School and department; links out when a URL is set.", component: ResultRow, exportName: "ResultRow", props: [t("school", "大学名"), t("department", "学科"), t("url", "大学サイト")] },
  { id: "faq-category", title: "FAQ category", category: "Sections", description: "section#<fragmentId> with its question list.", component: C.FaqCategoryBlock, exportName: "FaqCategoryBlock", props: [t("fragmentId", "Fragment id"), t("title", "カテゴリー名")], slots: [items("faq-item")] },

  // Voices
  { id: "student-index", title: "Student index", category: "Sections", description: "The voices index.", component: StudentIndex, exportName: "StudentIndex", slots: [items("student-link")] },
  { id: "student-link", title: "Student link", category: "Sections", description: "Links #student-<position>.", component: StudentLink, exportName: "StudentLink", props: [t("author", "名前"), t("school", "合格校")] },
  { id: "voice-list", title: "Voice list", category: "Sections", description: "The testimonials with the art after #artAfter.", component: C.VoiceList, exportName: "VoiceList", props: [n("artAfter", "この番号の後に絵", 2)], slots: [items("voice-detail"), one("art", ["pinsel.art-window"])] },
  { id: "voice-detail", title: "Voice detail", category: "Sections", description: "article#student-<position>.", component: C.VoiceDetailBlock, exportName: "VoiceDetailBlock", props: [t("author", "名前"), t("yearLabel", "合格年度"), t("school", "合格校"), t("department", "学科"), ml("quote", "本文（行ごとに段落）")] },

  // Notes
  { id: "article-heading", title: "Article heading", category: "Sections", description: "A note's heading block.", component: C.ArticleHeadingBlock, exportName: "ArticleHeadingBlock", props: [t("title", "タイトル"), t("description", "説明"), t("slug", "スラッグ")], slots: [one("eyebrow", ["pinsel.eyebrow"])] },
  { id: "article-layout", title: "Article layout", category: "Layout", description: "Contents rail beside the article.", component: C.ArticleLayoutBlock, exportName: "ArticleLayoutBlock", slots: [many("aside"), many("body")] },
  { id: "article-related", title: "All notes", category: "Sections", description: "The All Notes list.", component: C.ArticleRelated, exportName: "ArticleRelated", props: [t("title", "見出し")], slots: [items("note-link")] },
  { id: "note-link", title: "Note link", category: "Sections", description: "One All Notes entry; the current note is not a link.", component: C.NoteLink, exportName: "NoteLink", props: [t("slug", "スラッグ"), t("title", "タイトル")] },

  // Contact
  { id: "contact-layout", title: "Contact layout", category: "Forms", description: "The steps aside beside the form panel.", component: C.ContactLayoutBlock, exportName: "ContactLayoutBlock", slots: [many("aside"), many("panel")] },
  { id: "contact-aside", title: "Contact aside", category: "Forms", description: "お申し込みの流れ.", component: C.ContactAside, exportName: "ContactAside", props: [t("title", "見出し")], slots: [items("step-flow-item")] },
  { id: "step-flow-item", title: "Step", category: "Forms", description: "One numbered step.", component: Step, exportName: "Step", props: [t("title", "見出し"), t("description", "説明")] },
  {
    id: "contact-form",
    title: "Contact form",
    category: "Forms",
    description: "The preview-only inquiry form and success panel; nothing is sent.",
    component: C.ContactFormBlock,
    exportName: "ContactFormBlock",
    props: [
      t("formAriaLabel", "フォーム名（読み上げ）"),
      t("nameLabel", "お名前 ラベル"),
      t("emailLabel", "メールアドレス ラベル"),
      t("courseLabel", "ご希望のコース ラベル"),
      t("undecidedOption", "コース未定の選択肢"),
      t("messageLabel", "ご相談内容 ラベル"),
      t("requiredLabel", "必須 表記"),
      t("optionalLabel", "任意 表記"),
      t("submitLabel", "送信ボタン"),
      t("submittingLabel", "送信中 表記"),
      t("successTitle", "送信完了 見出し"),
      t("successBody", "送信完了 本文"),
      t("errorMessage", "送信失敗 メッセージ"),
      t("backLabel", "入力画面に戻る"),
      t("valueMissingMessage", "未入力エラー（{label} はラベル）"),
      t("emailFormatMessage", "メール形式エラー"),
      t("previewNotice", "プレビュー注記（フォーム）"),
      t("successPreviewEyebrow", "プレビュー注記 見出し（完了画面）"),
      t("successPreviewNotice", "プレビュー注記（完了画面）"),
    ],
    slots: [many("options", ["pinsel.course-option"])],
  },
  { id: "course-option", title: "Course option", category: "Forms", description: "One course after 未定.", component: CourseOption, exportName: "CourseOption", props: [t("label", "選択肢名")] },
  { id: "legal", title: "Legal table", category: "Forms", description: "details#legal: 特定商取引法に基づく表記.", component: C.Legal, exportName: "Legal", props: [t("summary", "見出し")], slots: [items("legal-row")] },
  { id: "legal-row", title: "Legal row", category: "Forms", description: "One th/td row.", component: LegalRow, exportName: "LegalRow", props: [t("term", "項目"), t("value", "内容")] },

  // 404
  { id: "not-found", title: "Not found", category: "Sections", description: "The 404 block.", component: C.NotFoundBlock, exportName: "NotFoundBlock", props: [t("title", "見出し"), t("body", "本文"), t("linkLabel", "リンク文言")] },
];

export const pinselPack = defineComponentPack({
  packId: PINSEL_PACK_ID,
  packVersion: PINSEL_PACK_VERSION,
  components: SPECS.map(define) as never,
}) as unknown as TrustedComponentPack;

/** The renderer registry for `renderRouteDocument`: every pack component by id. */
export const pinselRegistry: RenderRegistry = {
  manifest: pinselPack.manifest,
  components: Object.fromEntries(
    Object.entries(pinselPack.runtime.components).map(([id, entry]) => [id, entry.component as unknown as RenderableComponent]),
  ),
};
