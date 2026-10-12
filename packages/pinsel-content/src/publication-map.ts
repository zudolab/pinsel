import { NOTE_ROUTES, PAGE_ROUTES, PINSEL_ROUTES, type PinselRoute } from "./invariants";

// The publication checker's route/DOM mapping table: where every rendered
// Content field appears in the built site, how many times, and how its stored
// value becomes the DOM text. Selectors are the approved prototype's DOM
// (seed build.py / ui.py), which the pinsel-ui components reproduce.
//
// Entry selection per row:
// - "single"      the model's one entry (site-copy, lessons-copy, …)
// - "route"       the page-copy entry whose `route` is the page's route
// - "route-note"  the note entry whose slug is the page's slug
// - "each"        every entry (optionally filtered), in `sortBy` order, matched
//                 one-to-one with the elements of `items`
// - "keyed"       every entry (filtered) matched to `items` by `keyAttribute`
//                 = the entry's `keyField` value (header nav: prototype order)
// - "nested"      like "each", but per parent element of `parent.items`
//                 matched to the parent model's entries in order, children
//                 filtered by the reference field `parent.via`
//
// `render` turns the stored value into the expected DOM value:
// - "text" (default)  normalised text content (aria-hidden subtrees excluded)
// - "own-text"        the element's own text nodes only (label without its mark)
// - "lines"           one element per line of the value
// - "joined-lines"    the value's lines concatenated (hero lead)
// - "cta-subcopy"     the value minus the shared まずはお気軽にご相談ください。 prefix
// - "count"           `（N件）`
// - "presence"        boolean: the selector matches iff the value is true
// - "course-href"     `/contact/?course=N` on the `href` attribute
// - "note-href"       `/notes/<slug>/` on `href` (slug value or note reference)
// - "markdown"        the note body through the safe markdown tree, structurally
// - "note-title"      `<title>` = `{title} - Pinsel Notes`
//
// `adjacentTo` names a field of the same row group whose element must be the
// immediately preceding element sibling (school → department).

export type PublicationRender =
  | "text"
  | "own-text"
  | "lines"
  | "joined-lines"
  | "cta-subcopy"
  | "count"
  | "presence"
  | "course-href"
  | "note-href"
  | "markdown"
  | "note-title";

export interface PublicationRow {
  model: string;
  field: string;
  routes: readonly PinselRoute[];
  entry: "single" | "route" | "route-note" | "each" | "keyed" | "nested";
  /** Item elements for each/keyed/nested; the row selector is resolved inside each item. */
  items?: string;
  /** Element inside the page (single/route/route-note) or inside each item. Empty = the item itself. */
  selector: string;
  /** Read this attribute instead of the text. */
  attribute?: string;
  render?: PublicationRender;
  /** each/keyed/nested: only entries whose field equals the value. */
  filter?: { field: string; equals: string | number | boolean; operator?: "equals" | "not-equals" };
  /** each/nested sort key (default `order`). */
  sortBy?: string;
  /** keyed: entry field whose value is matched against `keyAttribute` of the items. */
  keyField?: string;
  keyAttribute?: string;
  parent?: { model: string; items: string; via: string };
  adjacentTo?: string;
  /** The value is optional: an empty value means the element is absent. */
  optional?: boolean;
}

const ALL: readonly PinselRoute[] = PINSEL_ROUTES;
const HOME: readonly PinselRoute[] = ["/"];
const LESSONS: readonly PinselRoute[] = ["/lessons/"];
const ABOUT: readonly PinselRoute[] = ["/about/"];
const RESULTS: readonly PinselRoute[] = ["/results/"];
const VOICES: readonly PinselRoute[] = ["/voices/"];
const FAQ: readonly PinselRoute[] = ["/faq/"];
const NOTES_INDEX: readonly PinselRoute[] = ["/notes/"];
const CONTACT: readonly PinselRoute[] = ["/contact/"];
const NOT_FOUND: readonly PinselRoute[] = ["/404.html"];
const NOTES: readonly PinselRoute[] = NOTE_ROUTES;
/** Pages that end with the closing CTA (build.py page_cta). */
export const CTA_ROUTES: readonly PinselRoute[] = ["/", "/lessons/", "/about/", "/results/", "/voices/", "/faq/"];
/** Pages with breadcrumb + page heading from page-copy. */
const HEADED: readonly PinselRoute[] = ["/lessons/", "/about/", "/results/", "/voices/", "/faq/", "/contact/"];
const NON_NOTE: readonly PinselRoute[] = [...PAGE_ROUTES, "/404.html"];

const single = (model: string, field: string, routes: readonly PinselRoute[], selector: string, extra: Partial<PublicationRow> = {}): PublicationRow => ({ model, field, routes, entry: "single", selector, ...extra });
const each = (model: string, field: string, routes: readonly PinselRoute[], items: string, selector: string, extra: Partial<PublicationRow> = {}): PublicationRow => ({ model, field, routes, entry: "each", items, selector, ...extra });

const lessonsToc = ["tocForYou", "tocCourse", "tocPricing", "tocConsultation", "tocInstructor", "tocSpecializations", "tocGraduates", "tocKnowledge"];

export const PUBLICATION_MAP: readonly PublicationRow[] = [
  // site-copy: chrome on every page
  single("site-copy", "brandWord", ALL, ".site-header .brand__word"),
  single("site-copy", "brandWord", ALL, ".site-footer .brand__word"),
  single("site-copy", "brandSub", ALL, ".site-header .brand__sub"),
  single("site-copy", "brandSub", ALL, ".site-footer .brand__sub"),
  single("site-copy", "ctaButtonLabel", ALL, ".site-nav__contact"),
  single("site-copy", "footerInstagramLabel", ALL, ".footer-instagram > span > span:last-child"),
  single("site-copy", "footerCopyright", ALL, ".footer-bottom > p"),
  single("site-copy", "backToTopLabel", ALL, ".footer-bottom > a"),
  // site-copy: home
  single("site-copy", "heroLabel", HOME, ".hero__label"),
  { model: "site-copy", field: "heroTitleLines", routes: HOME, entry: "each", items: "#hero-title > span", selector: "", render: "lines" },
  single("site-copy", "heroLead", HOME, ".hero__copy > p", { render: "joined-lines" }),
  single("site-copy", "heroPrimaryLabel", HOME, ".hero__actions .button"),
  single("site-copy", "heroPricingLabel", HOME, ".hero__actions .text-link"),
  single("site-copy", "heroMetaLine", HOME, ".hero-meta > p:nth-of-type(1)"),
  single("site-copy", "heroIntro", HOME, ".hero-meta > p:nth-of-type(2)"),
  single("site-copy", "forYouTitle", HOME, "#for-you .section-heading h2"),
  single("site-copy", "pricingTitle", HOME, "#pricing .section-heading h2"),
  single("site-copy", "pricingNote", HOME, "#pricing .price-note"),
  single("site-copy", "pricingMoreLabel", HOME, "#pricing .section-after .text-link"),
  single("site-copy", "instructorTitle", HOME, "#instructor .section-heading h2"),
  single("site-copy", "instructorDetailLabel", ["/", "/lessons/"], "#instructor .instructor__identity > a.text-link"),
  single("site-copy", "resultsTitle", HOME, "#results .section-heading h2"),
  single("site-copy", "voicesTitle", HOME, "#voices .section-heading h2"),
  single("site-copy", "faqTitle", HOME, "#faq .section-heading h2"),
  single("site-copy", "moreLabel", HOME, "#results .section-after .text-link"),
  single("site-copy", "moreLabel", HOME, "#voices .section-after .text-link"),
  single("site-copy", "moreLabel", HOME, "#faq .section-after .text-link"),
  single("site-copy", "ctaTitle", CTA_ROUTES, ".closing h2"),
  single("site-copy", "ctaButtonLabel", CTA_ROUTES, ".closing__action .button"),
  single("site-copy", "statsResultsNumber", RESULTS, ".stats > p:nth-of-type(1) > strong"),
  single("site-copy", "statsResultsLabel", RESULTS, ".stats > p:nth-of-type(1) > span"),
  single("site-copy", "statsSchoolsNumber", RESULTS, ".stats > p:nth-of-type(2) > strong"),
  single("site-copy", "statsSchoolsLabel", RESULTS, ".stats > p:nth-of-type(2) > span"),
  single("site-copy", "notesIndexTitle", NOTES_INDEX, ".page-heading h1"),
  single("site-copy", "notesIndexTitle", NOTES_INDEX, ".breadcrumb li[aria-current=page]"),
  single("site-copy", "notesIndexDescription", NOTES_INDEX, ".page-heading__description > p"),
  single("site-copy", "noteEyebrow", NOTES, ".article-heading .eyebrow"),
  single("site-copy", "contentsLabel", NOTES, ".article-layout aside .page-toc > .eyebrow"),
  single("site-copy", "contentsLabel", NOTES, ".article-layout aside .page-toc", { attribute: "aria-label" }),
  single("site-copy", "allNotesLabel", NOTES, ".article-related > h2"),
  single("site-copy", "notFoundTitle", NOT_FOUND, ".not-found h1"),
  single("site-copy", "notFoundBody", NOT_FOUND, ".not-found > p:not(.not-found__number)"),
  single("site-copy", "notFoundLinkLabel", NOT_FOUND, ".not-found .button"),

  // page-copy
  { model: "page-copy", field: "metaTitle", routes: NON_NOTE, entry: "route", selector: "title" },
  { model: "page-copy", field: "metaDescription", routes: NON_NOTE, entry: "route", selector: "meta[name=description]", attribute: "content" },
  { model: "page-copy", field: "headerTitle", routes: HEADED, entry: "route", selector: ".page-heading h1" },
  { model: "page-copy", field: "headerTitle", routes: HEADED, entry: "route", selector: ".breadcrumb li[aria-current=page]" },
  { model: "page-copy", field: "headerDescription", routes: HEADED, entry: "route", selector: ".page-heading__description > p" },
  { model: "page-copy", field: "asideLabel", routes: ["/results/", "/faq/"], entry: "route", selector: ".archive-layout aside .page-toc > .eyebrow" },
  { model: "page-copy", field: "asideLabel", routes: ["/results/", "/faq/"], entry: "route", selector: ".archive-layout aside .page-toc", attribute: "aria-label" },
  { model: "page-copy", field: "ctaSubCopy", routes: CTA_ROUTES, entry: "route", selector: ".closing__action > p", render: "cta-subcopy" },

  // nav-link
  { model: "nav-link", field: "headerLabel", routes: ALL, entry: "keyed", items: ".site-nav a.site-nav__item", selector: "", keyField: "href", keyAttribute: "href", filter: { field: "href", equals: "/contact/", operator: "not-equals" } },
  each("nav-link", "href", ALL, ".footer-nav > li", "a", { attribute: "href" }),
  each("nav-link", "label", ALL, ".footer-nav > li", ".eyebrow"),
  each("nav-link", "footerTitle", ALL, ".footer-nav > li", ".footer-nav__title"),
  each("nav-link", "footerDescription", ALL, ".footer-nav > li", ".footer-nav__description"),

  // lessons-copy
  ...lessonsToc.map((field, index) => single("lessons-copy", field, LESSONS, `.page-toc--wide li:nth-child(${index + 1}) > a`)),
  single("lessons-copy", "forYouTitle", LESSONS, "#for-you .section-heading h2"),
  single("lessons-copy", "courseTitle", LESSONS, "#course .section-heading h2"),
  single("lessons-copy", "courseIntro", LESSONS, "#course .prose > p"),
  single("lessons-copy", "pricingTitle", LESSONS, "#pricing .section-heading h2"),
  single("lessons-copy", "pricingScheduleNote", LESSONS, "#pricing .prose > p:nth-child(1)"),
  single("lessons-copy", "pricingContinueNote", LESSONS, "#pricing .prose > p:nth-child(2)"),
  single("lessons-copy", "pricingPaymentNote", LESSONS, "#pricing .prose > p:nth-child(3)"),
  single("lessons-copy", "consultationTitle", LESSONS, "#consultation .section-heading h2"),
  single("lessons-copy", "consultationTopicsTitle", LESSONS, "#consultation .two-column > div:nth-child(1) > h3"),
  { model: "lessons-copy", field: "consultationTopics", routes: LESSONS, entry: "each", items: "#consultation .two-column > div:nth-child(1) li", selector: "", render: "lines" },
  single("lessons-copy", "consultationFaqTitle", LESSONS, "#consultation .two-column > div:nth-child(2) > h3"),
  { model: "lessons-copy", field: "consultationFaqTopics", routes: LESSONS, entry: "each", items: "#consultation .two-column > div:nth-child(2) li", selector: "", render: "lines" },
  single("lessons-copy", "instructorTitle", LESSONS, "#instructor .section-heading h2"),
  single("lessons-copy", "careerTitle", LESSONS, "#instructor .lesson-career-title"),
  single("lessons-copy", "specializationsTitle", LESSONS, "#specializations .section-heading h2"),
  single("lessons-copy", "specializationsNote", LESSONS, "#specializations .section-after .prose > p"),
  single("lessons-copy", "graduatesTitle", LESSONS, "#graduates .section-heading h2"),
  { model: "lessons-copy", field: "graduatesParagraphs", routes: LESSONS, entry: "each", items: "#graduates .prose > p", selector: "", render: "lines" },
  single("lessons-copy", "knowledgeTitle", LESSONS, "#knowledge .section-heading h2"),

  // about-copy
  single("about-copy", "birthLine", ABOUT, ".instructor--about .instructor__subtitle"),
  single("about-copy", "instagramLabel", ABOUT, ".instructor--about .instructor__bio .text-link"),
  single("about-copy", "careerTitle", ABOUT, ".two-column > div:nth-child(1) > h2.cv-heading"),
  single("about-copy", "educationTitle", ABOUT, ".two-column > div:nth-child(2) > h2.cv-heading"),
  single("about-copy", "messageTitle", ABOUT, "#message .message-layout__heading"),
  single("about-copy", "featuresTitle", ABOUT, "#message + section.section .section-heading h2"),

  // instructor-profile
  single("instructor-profile", "name", ["/", "/lessons/", "/about/"], ".instructor__name"),
  single("instructor-profile", "latinName", ["/", "/lessons/", "/about/"], ".instructor__latin"),
  single("instructor-profile", "portraitAlt", ["/", "/lessons/", "/about/"], ".instructor__portrait img", { attribute: "alt" }),
  single("instructor-profile", "title", HOME, ".instructor__subtitle"),
  single("instructor-profile", "homeBio", HOME, ".instructor__bio > p"),
  single("instructor-profile", "lessonsBio", LESSONS, ".instructor__bio > p"),
  { model: "instructor-profile", field: "aboutMessage", routes: ABOUT, entry: "each", items: "#message .prose > p", selector: "", render: "lines" },

  // contact-copy
  single("contact-copy", "stepsTitle", CONTACT, ".contact-aside > h2"),
  single("contact-copy", "legalSummary", CONTACT, "details.legal > summary"),
  single("contact-copy", "formAriaLabel", CONTACT, "#contact-form", { attribute: "aria-label" }),
  single("contact-copy", "nameLabel", CONTACT, "label[for=name]", { render: "own-text" }),
  single("contact-copy", "emailLabel", CONTACT, "label[for=email]", { render: "own-text" }),
  single("contact-copy", "courseLabel", CONTACT, "label[for=course]", { render: "own-text" }),
  single("contact-copy", "messageLabel", CONTACT, "label[for=message]", { render: "own-text" }),
  single("contact-copy", "requiredLabel", CONTACT, "label[for=name] > span"),
  single("contact-copy", "requiredLabel", CONTACT, "label[for=email] > span"),
  single("contact-copy", "requiredLabel", CONTACT, "label[for=message] > span"),
  single("contact-copy", "optionalLabel", CONTACT, "label[for=course] > span"),
  single("contact-copy", "courseUndecidedOption", CONTACT, "select#course > option:first-child"),
  single("contact-copy", "submitLabel", CONTACT, "[data-submit-label]"),
  single("contact-copy", "submittingLabel", CONTACT, "#contact-form", { attribute: "data-submitting-label" }),
  single("contact-copy", "valueMissingMessage", CONTACT, "#contact-form", { attribute: "data-value-missing-message" }),
  single("contact-copy", "emailFormatMessage", CONTACT, "#contact-form", { attribute: "data-email-format-message" }),
  single("contact-copy", "errorMessage", CONTACT, "[data-form-error]"),
  single("contact-copy", "previewNotice", CONTACT, "#contact-form .prototype-message"),
  single("contact-copy", "successPreviewEyebrow", CONTACT, ".form-success > .eyebrow"),
  single("contact-copy", "successTitle", CONTACT, ".form-success > h2"),
  single("contact-copy", "successBody", CONTACT, ".form-success > h2 + p"),
  single("contact-copy", "successPreviewNotice", CONTACT, ".form-success > .prototype-message"),
  single("contact-copy", "backLabel", CONTACT, "[data-form-back]"),

  // course
  each("course", "name", HOME, ".pricing-grid > article.pricing-card", "h3"),
  each("course", "price", HOME, ".pricing-grid > article.pricing-card", ".price", { render: "own-text" }),
  each("course", "unit", HOME, ".pricing-grid > article.pricing-card", ".pricing-card__unit"),
  each("course", "homeDescription", HOME, ".pricing-grid > article.pricing-card", ".pricing-card__description"),
  each("course", "featured", HOME, ".pricing-grid > article.pricing-card", ".pricing-card__popular", { render: "presence" }),
  each("course", "order", HOME, ".pricing-grid > article.pricing-card", "a.text-link", { attribute: "href", render: "course-href" }),
  each("course", "name", LESSONS, ".price-detail > .price-detail__card", "h3", { filter: { field: "order", equals: 1, operator: "not-equals" } }),
  each("course", "price", LESSONS, ".price-detail > .price-detail__card", ".price", { filter: { field: "order", equals: 1, operator: "not-equals" } }),
  each("course", "lessonsNote", LESSONS, ".price-detail > .price-detail__card", ".quiet", { filter: { field: "order", equals: 1, operator: "not-equals" } }),
  each("course", "name", LESSONS, ".consultation-intro > div:first-child", "p:first-child", { filter: { field: "order", equals: 1 } }),
  each("course", "price", LESSONS, ".consultation-intro > div:first-child", ".price", { filter: { field: "order", equals: 1 } }),
  each("course", "lessonsNote", LESSONS, ".consultation-intro > div:first-child", ".quiet", { filter: { field: "order", equals: 1 } }),
  each("course", "contactOptionLabel", CONTACT, "select#course > option:not(:first-child)", ""),

  each("course-step", "title", LESSONS, ".course-steps > article.course-step", "h3"),
  each("course-step", "description", LESSONS, ".course-steps > article.course-step", "p:not(.course-step__number)"),
  each("target-item", "text", HOME, "#for-you .checklist > li", "span", { filter: { field: "page", equals: "home" } }),
  each("target-item", "text", LESSONS, "#for-you .checklist > li", "span", { filter: { field: "page", equals: "lessons" } }),
  each("specialization", "de", LESSONS, ".specialization-grid > li", "p[lang=de]"),
  each("specialization", "ja", LESSONS, ".specialization-grid > li", "p:not([lang])"),
  each("feature-card", "title", ABOUT, ".feature-grid > article.feature-card", "h3"),
  each("feature-card", "description", ABOUT, ".feature-grid > article.feature-card", "p"),
  ...(["year", "text"] as const).flatMap((field) => [
    each("timeline-entry", field, LESSONS, "#instructor ol.timeline > li", field === "year" ? ".timeline__year" : "p", { filter: { field: "timeline", equals: "lessons-career" } }),
    each("timeline-entry", field, ABOUT, ".two-column > div:nth-child(1) > ol.timeline > li", field === "year" ? ".timeline__year" : "p", { filter: { field: "timeline", equals: "about-career" } }),
    each("timeline-entry", field, ABOUT, ".two-column > div:nth-child(2) > ol.timeline > li", field === "year" ? ".timeline__year" : "p", { filter: { field: "timeline", equals: "about-education" } }),
  ]),

  // results
  each("result-year", "label", RESULTS, "section.year-section", "h2", { render: "own-text" }),
  each("result-year", "declaredCount", RESULTS, "section.year-section", "h2 > span", { render: "count" }),
  each("result-year", "label", RESULTS, ".archive-layout aside .page-toc li > a", ""),
  { model: "result-entry", field: "school", routes: RESULTS, entry: "nested", parent: { model: "result-year", items: "section.year-section", via: "year" }, items: "li.result-row", selector: "div > p:nth-child(1)" },
  { model: "result-entry", field: "department", routes: RESULTS, entry: "nested", parent: { model: "result-year", items: "section.year-section", via: "year" }, items: "li.result-row", selector: "div > p:nth-child(2)", adjacentTo: "school" },
  { model: "result-entry", field: "url", routes: RESULTS, entry: "nested", parent: { model: "result-year", items: "section.year-section", via: "year" }, items: "li.result-row", selector: "a", attribute: "href", optional: true },
  each("home-result", "yearLabel", HOME, ".results-preview > article.result-preview", ".result-preview__year"),
  each("home-result", "school", HOME, ".results-preview > article.result-preview", "h3"),
  each("home-result", "detail", HOME, ".results-preview > article.result-preview", "p:not(.result-preview__year)"),

  // voices
  each("testimonial", "author", VOICES, "article.voice-detail", ".voice-detail__meta > h2"),
  each("testimonial", "yearLabel", VOICES, "article.voice-detail", ".voice-detail__meta > p:nth-of-type(1)"),
  each("testimonial", "school", VOICES, "article.voice-detail", ".voice-detail__meta > p:nth-of-type(2)"),
  each("testimonial", "department", VOICES, "article.voice-detail", ".voice-detail__meta > p:nth-of-type(3)"),
  each("testimonial", "quote", VOICES, "article.voice-detail", "blockquote > p", { render: "lines" }),
  each("testimonial", "author", VOICES, ".student-index > a", "strong"),
  each("testimonial", "school", VOICES, ".student-index > a", "span"),
  each("home-voice", "quote", HOME, ".voices-preview > article.voice-preview", "blockquote"),
  each("home-voice", "author", HOME, ".voices-preview > article.voice-preview", "cite", { render: "own-text" }),
  each("home-voice", "school", HOME, ".voices-preview > article.voice-preview", "cite > span"),

  // faq
  each("faq-group", "title", FAQ, "section.faq-category", "h2"),
  each("faq-group", "title", FAQ, ".archive-layout aside .page-toc li > a", ""),
  { model: "faq-item", field: "question", routes: FAQ, entry: "nested", parent: { model: "faq-group", items: "section.faq-category", via: "group" }, items: "details", selector: "summary" },
  { model: "faq-item", field: "answer", routes: FAQ, entry: "nested", parent: { model: "faq-group", items: "section.faq-category", via: "group" }, items: "details", selector: ".faq-list__answer > p" },
  each("home-faq", "question", HOME, "#faq .faq-list > details", "summary"),
  each("home-faq", "answer", HOME, "#faq .faq-list > details", ".faq-list__answer > p"),

  // notes
  each("note", "title", NOTES_INDEX, ".note-grid > a.note-card", "h3"),
  each("note", "description", NOTES_INDEX, ".note-grid > a.note-card", "p"),
  each("note", "slug", NOTES_INDEX, ".note-grid > a.note-card", "", { attribute: "href", render: "note-href" }),
  { model: "note", field: "title", routes: NOTES, entry: "route-note", selector: "title", render: "note-title" },
  { model: "note", field: "description", routes: NOTES, entry: "route-note", selector: "meta[name=description]", attribute: "content" },
  { model: "note", field: "title", routes: NOTES, entry: "route-note", selector: ".article-heading h1" },
  { model: "note", field: "title", routes: NOTES, entry: "route-note", selector: ".breadcrumb li[aria-current=page]" },
  { model: "note", field: "description", routes: NOTES, entry: "route-note", selector: ".article-heading .page-heading__description > p" },
  { model: "note", field: "body", routes: NOTES, entry: "route-note", selector: ".article-layout article > .prose", render: "markdown" },
  each("note", "title", NOTES, ".article-related li", "", { sortBy: "slug" }),
  each("knowledge-card", "title", LESSONS, "#knowledge .note-grid > a.note-card", "h3"),
  each("knowledge-card", "description", LESSONS, "#knowledge .note-grid > a.note-card", "p"),
  each("knowledge-card", "note", LESSONS, "#knowledge .note-grid > a.note-card", "", { attribute: "href", render: "note-href" }),

  // contact
  each("contact-step", "title", CONTACT, ".step-flow > li", "h3"),
  each("contact-step", "description", CONTACT, ".step-flow > li", "p"),
  each("legal-row", "key", CONTACT, "details.legal tbody > tr", "th"),
  each("legal-row", "value", CONTACT, "details.legal tbody > tr", "td"),
];

/**
 * Fields with no DOM text of their own: `page-copy.route` selects the entry
 * per page. Every `order` is checked through the one-to-one item order of the
 * "each"/"nested" rows; placement/grouping fields through `filter`/`parent`.
 */
export const UNRENDERED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  "page-copy": ["route"],
};
