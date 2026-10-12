import type { JsonValue } from "@zudo-composer/component-contract";

// The component contract the structure manifest (src/site/structure.ts)
// authors against: component ids, schema versions, prop names/kinds/defaults
// and slots. `@pinsel/ui`'s pack (packages/pinsel-ui/src/pack.ts) must ship
// exactly these; `checkPackAgainstContract` (content:validate) and the
// contract test enforce it. Rendering rules per component are #8's; the notes
// below only fix what the structure relies on.
//
// Pinned Composer facts that shape this contract:
// - every node gets its props from ONE Content entry (the mapping that created
//   it), so a component whose copy lives in two models takes the second part
//   through a slot filled by a nested attachment;
// - a slot child cannot read its parent's props; the renderer injects
//   `route: { pathname }` and `slotIndex` (1-based position among the parent
//   slot's children) into every component, which positional ids and the
//   "01" numbering use;
// - list fields cannot be bound, so multi-line props are one item per line.

export const CONTRACT_PACK_ID = "pinsel";
export const CONTRACT_PACK_VERSION = "0.2.0";

export type ContractPropKind = "text" | "multiline" | "number" | "boolean" | { select: readonly string[] };

export interface ContractProp {
  kind: ContractPropKind;
  default: JsonValue;
}

export interface ContractSlot {
  id: string;
  cardinality: "single" | "many";
  accepts?: readonly string[];
}

export interface ContractComponent {
  id: string;
  schemaVersion: number;
  description: string;
  props: Readonly<Record<string, ContractProp>>;
  slots: readonly ContractSlot[];
}

const text = (fallback = ""): ContractProp => ({ kind: "text", default: fallback });
const lines = (): ContractProp => ({ kind: "multiline", default: "" });
const flag = (fallback = false): ContractProp => ({ kind: "boolean", default: fallback });
const count = (fallback = 0): ContractProp => ({ kind: "number", default: fallback });
const choice = (options: readonly string[], fallback: string): ContractProp => ({ kind: { select: options }, default: fallback });
const many = (id: string, accepts?: readonly string[]): ContractSlot => ({ id, cardinality: "many", ...(accepts ? { accepts } : {}) });
const one = (id: string, accepts?: readonly string[]): ContractSlot => ({ id, cardinality: "single", ...(accepts ? { accepts } : {}) });

const component = (id: string, description: string, props: Record<string, ContractProp> = {}, slots: ContractSlot[] = [], schemaVersion = 1): ContractComponent => ({
  id: `pinsel.${id}`,
  schemaVersion,
  description,
  props,
  slots,
});

export const ART_SLOTS = ["hero", "middle", "closing"] as const;
export const ART_SIZES = ["hero", "large", "closing", "medium", "small", "ribbon"] as const;

export const PINSEL_COMPONENT_CONTRACT: readonly ContractComponent[] = [
  // Chrome
  component("site-frame", "Skip link, the header slot, <main id=main tabindex=-1> around the main slot, the footer slot. Root of every page composition (no global template: Composer 7ca114a3 never materialises a template's attachments).", {}, [one("header", ["pinsel.site-header"]), many("main"), one("footer", ["pinsel.site-footer"])], 2),
  component("site-header", "div.site-header > header: brand, menu toggle, nav#site-navigation (nav slot, then the green contact button labelled contactLabel → /contact/ with aria-current), motion toggle.", { brandWord: text(), brandSub: text(), contactLabel: text() }, [many("nav", ["pinsel.nav-item", "pinsel.group"])]),
  component("nav-item", "a.site-nav__item; aria-current=page when route.pathname starts with href.", { href: text(), label: text() }),
  component("site-footer", "footer.site-footer: brand, Instagram link (INSTAGRAM_URL, instagramLabel), nav slot inside ul.footer-nav, footer-bottom copyright + #top link.", { brandWord: text(), brandSub: text(), instagramLabel: text(), copyright: text(), backToTopLabel: text() }, [many("nav", ["pinsel.footer-nav-item"])]),
  component("footer-nav-item", "li > a: .eyebrow label, .footer-nav__title, .footer-nav__description.", { href: text(), label: text(), title: text(), description: text() }),

  // Generic
  component("group", "Renders its items with no wrapper element; the attachment host for injected entries.", {}, [many("items")]),
  component("art-window", "div.art-window--{size}[aria-hidden][data-parallax][data-drift][data-motion-range=range] with the inline water-paper SVG for `slot` (shallow SVG when slot=hero and size≠hero).", { slot: choice(ART_SLOTS, "middle"), size: choice(ART_SIZES, "large"), drift: choice(["1", "-1"], "1"), range: count(52) }),
  component("section", "section.section.container.reading-zone[#id] (+ .instructor-layout when variant=instructor) > .section-heading(eyebrow, h2 title) + content slot.", { id: text(), eyebrow: text(), title: text(), variant: choice(["default", "instructor"], "default") }, [many("content")], 2),
  component("plain-section", "section.section.container.reading-zone[aria-label] with only the content slot (no heading).", { ariaLabel: text() }, [many("content")]),
  component("section-after", "div.section-after around the content slot.", {}, [many("content")]),
  component("text-link", "a.text-link (instagram icon for instagram.com, arrow-up-right for https, else arrow-right).", { href: text(), label: text() }),
  component("eyebrow", "p.eyebrow with the text.", { text: text() }),
  component("prose-block", "div.prose around the items slot.", {}, [many("items", ["pinsel.paragraph", "pinsel.paragraphs"])]),
  component("paragraph", "One <p> with `text` as is (a newline inside stays a newline, e.g. the lessons schedule note).", { text: lines() }),
  component("paragraphs", "One <p> per line of `text`, no wrapper.", { text: lines() }),
  component("prose", "Note markdown body through the safe subset (h2#section-N, p, ul, a, strong).", { markdown: lines() }),

  // Page heads
  component("breadcrumb", "nav.breadcrumb.container: トップ → (parentHref/parentLabel when set) → label (aria-current=page).", { label: text(), parentHref: text(), parentLabel: text() }),
  component("page-heading", "header.page-heading.container.reading-zone: eyebrow, h1 title, .page-heading__description (p description + after slot, e.g. results stats).", { eyebrow: text(), title: text(), description: text() }, [many("after", ["pinsel.stats", "pinsel.group"])]),
  component("stats", "div.stats around the items slot.", {}, [many("items", ["pinsel.stat"])]),
  component("stat", "p > strong number + span label.", { number: text(), label: text() }),

  // Home
  component("hero", "section.hero[aria-labelledby=hero-title]: p.hero__label, h1#hero-title (one span per titleLines line), .hero__copy (p lead = lines joined without separator, as the prototype), .hero__actions (primary button, text link), then the art slot.", { label: text(), titleLines: lines(), lead: lines(), primaryLabel: text(), primaryHref: text(), pricingLabel: text(), pricingHref: text() }, [one("art", ["pinsel.art-window"])]),
  component("hero-meta", "div.container.hero-meta.reading-zone > p line + p intro.", { line: text(), intro: text() }),
  component("checklist", "ul.checklist around the items slot.", {}, [many("items", ["pinsel.checklist-item"])]),
  component("checklist-item", "li: check icon .checklist__mark + span text.", { text: text() }),
  component("pricing-cards", "div.pricing-grid (items slot) + p.price-note note + .section-after text link moreLabel → moreHref.", { note: text(), moreLabel: text(), moreHref: text("/lessons/") }, [many("items", ["pinsel.pricing-card"])]),
  component("pricing-card", "article.pricing-card; link /contact/?course={courseIndex}. taxLabel/popularBadge/linkLabel stay manifest defaults (a slot child cannot read site-copy).", { name: text(), price: text(), unit: text(), description: text(), featured: flag(), courseIndex: count(1), taxLabel: text("税込"), popularBadge: text("POPULAR"), linkLabel: text("このコースについて相談する") }),
  component("instructor", "div.instructor[.instructor--about] > figure portrait (ASSET_PATHS.instructorPortrait, alt portraitAlt, 600×902, lazy) + .instructor__identity (p.instructor__name, p.instructor__latin, then the identity slot).", { name: text(), latinName: text(), portraitAlt: text(), about: flag() }, [many("identity", ["pinsel.instructor-subtitle", "pinsel.instructor-bio", "pinsel.instructor-bio-link", "pinsel.text-link", "pinsel.group"])]),
  component("instructor-subtitle", "p.instructor__subtitle.", { text: text() }),
  component("instructor-bio", "div.instructor__bio > p.", { text: text() }),
  component("instructor-bio-link", "div.instructor__bio > a.text-link (the about page Instagram link).", { href: text(), label: text() }),
  component("results-preview", "div.results-preview around the items slot.", {}, [many("items", ["pinsel.result-preview"])]),
  component("result-preview", "article.result-preview: p.result-preview__year, h3 school, p detail.", { yearLabel: text(), school: text(), detail: text() }),
  component("voices-preview", "div.voices-preview around the items slot.", {}, [many("items", ["pinsel.voice-preview"])]),
  component("voice-preview", "article.voice-preview: blockquote quote, cite author + span school.", { quote: text(), author: text(), school: text() }),
  component("faq-list", "div.faq-list around the items slot.", {}, [many("items", ["pinsel.faq-item"])]),
  component("faq-item", "details#{idPrefix}-{slotIndex} (open when openFirst and slotIndex=1): summary Q./question/±, .faq-list__answer A./answer.", { question: text(), answer: text(), idPrefix: text("q"), openFirst: flag() }),
  component("cta", "section.closing: CONTACT eyebrow, h2 title (prototype breaks after まずはお気軽に), .closing__action (subcopy slot, primary button buttonLabel → /contact/), then the art slot.", { title: text(), buttonLabel: text() }, [one("subcopy", ["pinsel.cta-subcopy"]), one("art", ["pinsel.art-window"])]),
  component("cta-subcopy", "p with `text` minus the leading まずはお気軽にご相談ください。 (prototype cta()).", { text: text() }),

  // Lessons
  component("toc", "nav.page-toc[.page-toc--wide.container when wide][aria-label=label] > p.eyebrow(contents icon, label) + ol(items slot).", { label: text(), wide: flag() }, [many("items", ["pinsel.toc-item", "pinsel.note-toc-items", "pinsel.group"])]),
  component("toc-item", "li > a[href] (span aria-hidden zero-padded number + label). href = `href` when set, else #{fragmentPrefix}{slotIndex}; the number is `number` when > 0, else slotIndex.", { label: text(), href: text(), fragmentPrefix: text(), number: count(0) }),
  component("note-toc-items", "One toc li per `## ` heading of the markdown: #section-N, number N.", { markdown: lines() }),
  component("course-steps", "div.course-steps around the items slot.", {}, [many("items", ["pinsel.course-step"])]),
  component("course-step", "article.course-step: p.course-step__number (slotIndex, 2 digits, aria-hidden), h3 title, p description.", { title: text(), description: text() }),
  component("price-detail", "div.price-detail around the items slot.", {}, [many("items", ["pinsel.price-detail-card"])]),
  component("price-detail-card", "div.price-detail__card: h3 name, p.price, p.quiet note.", { name: text(), price: text(), note: text() }),
  component("consultation-intro", "div.consultation-intro: course slot (the consultation price block) + div.two-column of two h3 + ul.simple-list columns (one li per line).", { topicsTitle: text(), topics: lines(), faqTitle: text(), faqTopics: lines() }, [one("course", ["pinsel.consultation-price"])]),
  component("consultation-price", "div: p name, p.price price, p.quiet note.", { name: text(), price: text(), note: text() }),
  component("lesson-career", "div.section-after > h3.lesson-career-title title + ol.timeline(items slot).", { title: text() }, [many("items", ["pinsel.timeline-item"])]),
  component("timeline-item", "li: span.timeline__year year + p text.", { year: text(), text: text() }),
  component("specialization-grid", "ul.specialization-grid around the items slot.", {}, [many("items", ["pinsel.specialization-item"])]),
  component("specialization-item", "li: p[lang=de] de + p ja.", { de: text(), ja: text() }),
  component("graduate-content", "div.graduate-content[data-illustrated=10] > div.prose (one p per line) + figure.graduate-illustration[aria-hidden] img (ASSET_PATHS.graduatesIllustration, alt \"\", 1254², lazy, async).", { paragraphs: lines() }),
  component("note-cards", "div.note-grid[.note-grid--editorial] around the items slot.", { editorial: flag() }, [many("items", ["pinsel.note-card"])]),
  component("note-card", "a.note-card[href = href, or /notes/{slug}/ when slug is set]: span.note-card__index (slotIndex, 2 digits), h3 title, p description, arrow.", { href: text(), slug: text(), title: text(), description: text() }),

  // About
  component("cv", "section.section.container.reading-zone > div.two-column: h2.cv-heading careerTitle + ol.timeline(career slot), h2.cv-heading educationTitle + ol.timeline(education slot).", { careerTitle: text(), educationTitle: text() }, [many("career", ["pinsel.timeline-item"]), many("education", ["pinsel.timeline-item"])]),
  component("message", "section.container.message-layout.reading-zone#message: div(p.eyebrow eyebrow, h2.message-layout__heading title) + content slot.", { eyebrow: text(), title: text() }, [many("content", ["pinsel.prose-block", "pinsel.group"])]),
  component("feature-grid", "div.feature-grid around the items slot.", {}, [many("items", ["pinsel.feature-card"])]),
  component("feature-card", "article.feature-card: h3 title, p description.", { title: text(), description: text() }),

  // Results / FAQ archive pages
  component("archive-layout", "div.container.archive-layout > aside(aside slot) + div.archive-body(body slot).", {}, [many("aside"), many("body")]),
  component("year-section", "section.year-section.reading-zone#year-{label}: h2 label + span（{count}件）, ul(items slot).", { label: text(), count: count(0) }, [many("items", ["pinsel.result-row"])]),
  component("result-row", "li.result-row: div(p school, p department), wrapped in a[href=url target=_blank rel=noopener noreferrer] + arrow-up-right when url is set.", { school: text(), department: text(), url: text() }),
  component("faq-category", "section.faq-category.reading-zone#{fragmentId}: h2 title + div.faq-list(items slot).", { fragmentId: text(), title: text() }, [many("items", ["pinsel.faq-item"])]),

  // Voices
  component("student-index", "nav.container.student-index[aria-label=生徒の声から選ぶ] around the items slot.", {}, [many("items", ["pinsel.student-link"])]),
  component("student-link", "a[href=#student-{slotIndex}]: strong author, span school.", { author: text(), school: text() }),
  component("voice-list", "The items slot with the art slot rendered after item number artAfter.", { artAfter: count(2) }, [many("items", ["pinsel.voice-detail"]), one("art", ["pinsel.art-window"])]),
  component("voice-detail", "article.container.voice-detail.reading-zone#student-{slotIndex}: header.voice-detail__meta(h2 author, p yearLabel, p school, p department) + blockquote (one p per quote line).", { author: text(), yearLabel: text(), school: text(), department: text(), quote: lines() }),

  // Notes
  component("article-heading", "div.container.article-heading > header.page-heading.reading-zone: eyebrow slot, h1 title (free-tuition: two .title-phrase spans, keyed on slug), .page-heading__description p description.", { title: text(), description: text(), slug: text() }, [one("eyebrow", ["pinsel.eyebrow"])]),
  component("article-layout", "div.container.article-layout > aside(aside slot) + article(body slot).", {}, [many("aside"), many("body")]),
  component("article-related", "section.article-related[aria-label=すべてのノート]: h2 title + ul.simple-list(items slot).", { title: text() }, [many("items", ["pinsel.note-link"])]),
  component("note-link", "li: span[aria-current=page] title when route.pathname is /notes/{slug}/, else a.text-link → /notes/{slug}/.", { slug: text(), title: text() }),

  // Contact
  component("contact-layout", "div.container.contact-layout > aside slot + panel slot.", {}, [many("aside"), many("panel")]),
  component("contact-aside", "aside.contact-aside: h2 title + ol.step-flow(items slot).", { title: text() }, [many("items", ["pinsel.step-flow-item"])]),
  component("step-flow-item", "li: span.step-flow__number (slotIndex, 2 digits, aria-hidden) + div(h3 title, p description).", { title: text(), description: text() }),
  component(
    "contact-form",
    "div.contact-panel: form#contact-form[aria-label=formAriaLabel][data-submitting-label][data-value-missing-message][data-email-format-message] (label own text + span required/optional mark, select#course = undecidedOption + options slot, p[data-form-error], p.prototype-message previewNotice, submit [data-submit-label]) + div.form-success[hidden][tabindex=-1] (p.eyebrow, h2, p, p.prototype-message, button[data-form-back]). The three data attributes carry the strings site.js shows at runtime.",
    {
      formAriaLabel: text(),
      nameLabel: text(),
      emailLabel: text(),
      courseLabel: text(),
      undecidedOption: text(),
      messageLabel: text(),
      requiredLabel: text(),
      optionalLabel: text(),
      submitLabel: text(),
      submittingLabel: text(),
      successTitle: text(),
      successBody: text(),
      errorMessage: text(),
      backLabel: text(),
      valueMissingMessage: text(),
      emailFormatMessage: text(),
      previewNotice: text(),
      successPreviewEyebrow: text(),
      successPreviewNotice: text(),
    },
    [many("options", ["pinsel.course-option"])],
  ),
  component("course-option", "<option value=label>label</option>.", { label: text() }),
  component("legal", "section.container > details.legal#legal: summary + table > tbody(items slot).", { summary: text() }, [many("items", ["pinsel.legal-row"])]),
  component("legal-row", "tr: th[scope=row] term, td value.", { term: text(), value: text() }),

  // 404
  component("not-found", "section.container.not-found.reading-zone: p.not-found__number 404 (aria-hidden), h1 title, p body, button link linkLabel → /.", { title: text(), body: text(), linkLabel: text() }),
];

export const CONTRACT_COMPONENT_IDS: ReadonlySet<string> = new Set(PINSEL_COMPONENT_CONTRACT.map((entry) => entry.id));

export function contractComponent(id: string): ContractComponent {
  const found = PINSEL_COMPONENT_CONTRACT.find((entry) => entry.id === id);
  if (!found) throw new Error(`Component "${id}" is not in the Pinsel component contract.`);
  return found;
}
