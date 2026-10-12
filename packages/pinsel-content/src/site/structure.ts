import type { JsonValue, TrustedComponentPack } from "@zudo-composer/component-contract";
import { defineSite, node } from "zudo-composer/authoring";
import type { BindingInput, ContentEntryRecord, Mapping, Model, NodeInput, Page, SiteProject } from "zudo-composer/site-project";

import { INSTAGRAM_URL, NOT_FOUND_ROUTE, NOTE_SLUGS, PAGE_COPY_IDS, navLinkId } from "../invariants";
import { PINSEL_CONTENT_PROVIDER_ID, PINSEL_MODELS, fieldId } from "../models";
import { modelInput } from "../models/dsl";
import { PINSEL_PROJECT_ID } from "../policy";

// The defineSite structure for all 14 outputs (docs/content-model.md §5,
// prototype build.py page functions). Every page composition is
// `pinsel.site-frame` > header / main / footer; copy arrives through
// collection attachments because Composer 7ca114a3 binds props from exactly
// one entry per node and never materialises a global template's attachments.
// A node whose copy spans two models takes the second model through a nested
// attachment into a slot. The year/FAQ-group/note sections are generated per
// entry (pinned), since attachment conditions cannot refer to the parent entry.

type Binding = Omit<BindingInput, "nodeId"> & { nodeId?: string };

/** Structure literals of the approved prototype (English eyebrows, ARIA labels, fixed hrefs). */
export const STRUCTURE_LITERALS = {
  pricingEyebrow: "COURSE & PRICING",
  notesBreadcrumbLabel: "Notes",
  heroPrimaryHref: "/lessons/",
  heroPricingHref: "/#pricing",
  pricingMoreHref: "/lessons/",
  aboutHref: "/about/",
  profileAriaLabel: "高津戸優子のプロフィール",
  notesIndexAriaLabel: "ノート一覧",
  messageEyebrow: "Message",
} as const;

/** Prototype header order (`ui.py NAV`); the footer follows `nav-link.order`. */
export const HEADER_NAV_ORDER = ["/lessons/", "/about/", "/results/", "/voices/", "/notes/", "/faq/"] as const;

const art = (slot: "hero" | "middle" | "closing", size: "hero" | "large" | "closing" | "medium" | "small" | "ribbon", drift: 1 | -1 = 1, id?: string): NodeInput =>
  node("pinsel.art-window", { slot, size, drift: String(drift), range: slot === "hero" && size !== "hero" ? 8 : 52 }, {}, id);
const group = (id: string): NodeInput => node("pinsel.group", {}, {}, id);

export interface PinselSite {
  project: SiteProject;
  models: ReadonlyMap<string, Model>;
}

interface ModeSpec {
  kind: "single" | "pinned" | "list";
  entryId?: string;
  conditions?: { field: string; operator: "equals" | "not-equals"; value: JsonValue }[];
  /** List sort field; default `order`. */
  sortField?: string;
}

const ref = (modelId: string, recordId: string): JsonValue => ({ providerId: PINSEL_CONTENT_PROVIDER_ID, modelId, recordId });

/** Builds the full site project with `entries` as the Content provider's entries. */
export function buildPinselSite(entries: readonly ContentEntryRecord[], pack: TrustedComponentPack): PinselSite {
  const site = defineSite({ id: PINSEL_PROJECT_ID, name: "Pinsel", componentPack: pack });
  const models = new Map<string, Model>();
  for (const record of PINSEL_MODELS) models.set(record.id, site.model(modelInput(record, models)));
  const model = (id: string) => models.get(id)!;
  const entriesOf = (modelId: string) =>
    entries.filter((entry) => entry.modelId === modelId).sort((left, right) => Number(left.values[fieldId(modelId, "order")]) - Number(right.values[fieldId(modelId, "order")]) || (left.id < right.id ? -1 : 1));

  const pins = new Map<string, JsonValue>();

  /** A detached composition + mapping: `root` is mapped once per selected entry. */
  const fragment = (id: string, modelId: string, root: NodeInput[], bindings: Binding[], mode: ModeSpec): { page: Page; mapping: Mapping } => {
    const page = site.page({ id, name: id, root });
    const firstNode = root[0]?.id;
    const resolved = bindings.map((binding) => ({ ...binding, nodeId: binding.nodeId ?? firstNode! }));
    const sort = { field: mode.sortField ?? "order", direction: "asc" as const };
    const mapping = site.mapping({
      id,
      name: id,
      model: model(modelId),
      composition: page,
      mode:
        mode.kind === "single"
          ? { kind: "collection", limit: 1 }
          : mode.kind === "pinned"
            ? // Pins are patched in after toSiteProject (the DSL has no pins); the impossible condition keeps a deleted pin from selecting another entry.
              { kind: "collection", limit: 1, conditions: [{ field: "order", operator: "equals", value: -1 }] }
            : { kind: "collection", limit: 1000, sort: [sort], conditions: mode.conditions ?? [] },
      bindings: resolved,
    });
    if (mode.kind === "pinned") pins.set(id, ref(modelId, mode.entryId!));
    return { page, mapping };
  };

  /** Materialise `mapping` into the `items` slot of the group `hostId` inside `owner`. */
  const inject = (owner: Page, hostId: string, mapping: Mapping, slotId = "items"): void => {
    site.attach(mapping, { nodeId: hostId, slotId, composition: owner }, slotId === "items" ? `${owner.id}--${hostId}` : `${owner.id}--${hostId}--${slotId}`);
  };

  // ---------------------------------------------------------------- chrome
  const navItems = HEADER_NAV_ORDER.map((href) =>
    fragment(`nav-item-${navLinkId(href)}`, "nav-link", [node("pinsel.nav-item", {}, {}, "item")], [{ field: "href", prop: "href" }, { field: "headerLabel", prop: "label" }], { kind: "pinned", entryId: navLinkId(href) }),
  );
  const header = fragment("frame-header", "site-copy", [node("pinsel.site-header", {}, { nav: HEADER_NAV_ORDER.map((_, index) => group(`nav-${index + 1}`)) }, "header")], [
    { field: "brandWord", prop: "brandWord" },
    { field: "brandSub", prop: "brandSub" },
    { field: "ctaButtonLabel", prop: "contactLabel" },
  ], { kind: "single" });
  navItems.forEach((item, index) => inject(header.page, `nav-${index + 1}`, item.mapping));
  const footerNav = fragment("frame-footer-nav", "nav-link", [node("pinsel.footer-nav-item", {}, {}, "item")], [
    { field: "href", prop: "href" },
    { field: "label", prop: "label" },
    { field: "footerTitle", prop: "title" },
    { field: "footerDescription", prop: "description" },
  ], { kind: "list" });
  const footer = fragment("frame-footer", "site-copy", [node("pinsel.site-footer", {}, {}, "footer")], [
    { field: "brandWord", prop: "brandWord" },
    { field: "brandSub", prop: "brandSub" },
    { field: "footerInstagramLabel", prop: "instagramLabel" },
    { field: "footerCopyright", prop: "copyright" },
    { field: "backToTopLabel", prop: "backToTopLabel" },
  ], { kind: "single" });
  inject(footer.page, "footer", footerNav.mapping, "nav");

  /** A routed page: the frame with header/footer injected and `main` as given. */
  const pageWithFrame = (id: string, main: NodeInput[]): Page => {
    const page = site.page({ id, name: id, root: [node("pinsel.site-frame", {}, { header: [], main, footer: [] }, "frame")] });
    inject(page, "frame", header.mapping, "header");
    inject(page, "frame", footer.mapping, "footer");
    return page;
  };

  // ------------------------------------------------------- shared pieces
  const pageCopy = (route: string) => ({ kind: "list" as const, conditions: [{ field: "route", operator: "equals" as const, value: route }] });

  /** breadcrumb + page heading (+ `after` host) from `page-copy[route]`. */
  const pageHead = (route: string, eyebrow: string, withAfter = false) => {
    const key = PAGE_COPY_IDS[route as keyof typeof PAGE_COPY_IDS];
    return fragment(`${key}-head`, "page-copy", [
      node("pinsel.breadcrumb", {}, {}, "breadcrumb"),
      node("pinsel.page-heading", { eyebrow }, { after: withAfter ? [group("after")] : [] }, "heading"),
    ], [
      { field: "headerTitle", nodeId: "breadcrumb", prop: "label" },
      { field: "headerTitle", nodeId: "heading", prop: "title" },
      { field: "headerDescription", nodeId: "heading", prop: "description" },
    ], pageCopy(route));
  };

  /** Closing CTA: title/button from site-copy, subcopy from `page-copy[route]`. */
  const cta = (route: string, large: boolean) => {
    const key = PAGE_COPY_IDS[route as keyof typeof PAGE_COPY_IDS];
    const subcopy = fragment(`${key}-cta-subcopy`, "page-copy", [node("pinsel.cta-subcopy", {}, {}, "subcopy")], [{ field: "ctaSubCopy", prop: "text" }], pageCopy(route));
    const shell = fragment(`${key}-cta`, "site-copy", [node("pinsel.cta", {}, { subcopy: [], art: [art("closing", large ? "closing" : "small", 1, "cta-art")] }, "cta")], [
      { field: "ctaTitle", prop: "title" },
      { field: "ctaButtonLabel", prop: "buttonLabel" },
    ], { kind: "single" });
    inject(shell.page, "cta", subcopy.mapping, "subcopy");
    return shell;
  };

  const detailLink = fragment("instructor-detail-link", "site-copy", [node("pinsel.text-link", { href: STRUCTURE_LITERALS.aboutHref }, {}, "link")], [{ field: "instructorDetailLabel", prop: "label" }], { kind: "single" });

  const list = (id: string, modelId: string, root: NodeInput, bindings: Binding[], conditions: ModeSpec["conditions"] = []) => fragment(id, modelId, [root], bindings, { kind: "list", conditions });

  const checklistItems = (page: "home" | "lessons") =>
    list(`target-items-${page}`, "target-item", node("pinsel.checklist-item", {}, {}, "item"), [{ field: "text", prop: "text" }], [{ field: "page", operator: "equals", value: page }]);
  const timelineItems = (timeline: "lessons-career" | "about-career" | "about-education") =>
    list(`timeline-${timeline}`, "timeline-entry", node("pinsel.timeline-item", {}, {}, "item"), [{ field: "year", prop: "year" }, { field: "text", prop: "text" }], [{ field: "timeline", operator: "equals", value: timeline }]);

  // ------------------------------------------------------------------ home
  const hero = fragment("home-hero", "site-copy", [node("pinsel.hero", { primaryHref: STRUCTURE_LITERALS.heroPrimaryHref, pricingHref: STRUCTURE_LITERALS.heroPricingHref }, { art: [art("hero", "hero", 1, "hero-art")] }, "hero")], [
    { field: "heroLabel", prop: "label" },
    { field: "heroTitleLines", prop: "titleLines" },
    { field: "heroLead", prop: "lead" },
    { field: "heroPrimaryLabel", prop: "primaryLabel" },
    { field: "heroPricingLabel", prop: "pricingLabel" },
  ], { kind: "single" });
  const heroMeta = fragment("home-hero-meta", "site-copy", [node("pinsel.hero-meta", {}, {}, "meta")], [{ field: "heroMetaLine", prop: "line" }, { field: "heroIntro", prop: "intro" }], { kind: "single" });

  const homeForYou = fragment("home-for-you", "site-copy", [node("pinsel.section", { id: "for-you", eyebrow: "For You" }, { content: [node("pinsel.checklist", {}, {}, "list")] }, "section")], [{ field: "forYouTitle", prop: "title" }], { kind: "single" });
  inject(homeForYou.page, "list", checklistItems("home").mapping);

  const pricingCards = list("home-pricing-cards", "course", node("pinsel.pricing-card", {}, {}, "card"), [
    { field: "name", prop: "name" },
    { field: "price", prop: "price" },
    { field: "unit", prop: "unit" },
    { field: "homeDescription", prop: "description" },
    { field: "featured", prop: "featured" },
    // `course.order` is the `?course=N` index (COURSE_QUERY_OPTIONS) and read-only.
    { field: "order", prop: "courseIndex" },
  ]);
  const homePricing = fragment("home-pricing", "site-copy", [node("pinsel.section", { id: "pricing", eyebrow: STRUCTURE_LITERALS.pricingEyebrow }, { content: [node("pinsel.pricing-cards", { moreHref: STRUCTURE_LITERALS.pricingMoreHref }, {}, "cards")] }, "section")], [
    { field: "pricingTitle", prop: "title" },
    { field: "pricingNote", nodeId: "cards", prop: "note" },
    { field: "pricingMoreLabel", nodeId: "cards", prop: "moreLabel" },
  ], { kind: "single" });
  inject(homePricing.page, "cards", pricingCards.mapping);

  const instructorFor = (id: string, identity: NodeInput[], bindings: Binding[], about = false) =>
    fragment(id, "instructor-profile", [node("pinsel.instructor", { about }, { identity }, "instructor")], [
      { field: "name", prop: "name" },
      { field: "latinName", prop: "latinName" },
      { field: "portraitAlt", prop: "portraitAlt" },
      ...bindings,
    ], { kind: "single" });
  const homeInstructorProfile = instructorFor("home-instructor-profile", [node("pinsel.instructor-subtitle", {}, {}, "subtitle"), node("pinsel.instructor-bio", {}, {}, "bio"), group("detail")], [
    { field: "title", nodeId: "subtitle", prop: "text" },
    { field: "homeBio", nodeId: "bio", prop: "text" },
  ]);
  inject(homeInstructorProfile.page, "detail", detailLink.mapping);
  const homeInstructor = fragment("home-instructor", "site-copy", [node("pinsel.section", { id: "instructor", eyebrow: "Instructor", variant: "instructor" }, { content: [group("profile")] }, "section")], [{ field: "instructorTitle", prop: "title" }], { kind: "single" });
  inject(homeInstructor.page, "profile", homeInstructorProfile.mapping);

  const moreSection = (id: string, fragmentId: string, eyebrow: string, titleField: string, container: string, moreHref: string) => {
    const shell = fragment(id, "site-copy", [node("pinsel.section", { id: fragmentId, eyebrow }, {
      content: [node(container, {}, {}, "list"), node("pinsel.section-after", {}, { content: [node("pinsel.text-link", { href: moreHref }, {}, "more")] }, "after")],
    }, "section")], [{ field: titleField, prop: "title" }, { field: "moreLabel", nodeId: "more", prop: "label" }], { kind: "single" });
    return shell;
  };
  const homeResults = moreSection("home-results", "results", "Results", "resultsTitle", "pinsel.results-preview", "/results/");
  inject(homeResults.page, "list", list("home-result-cards", "home-result", node("pinsel.result-preview", {}, {}, "card"), [{ field: "yearLabel", prop: "yearLabel" }, { field: "school", prop: "school" }, { field: "detail", prop: "detail" }]).mapping);
  const homeVoices = moreSection("home-voices", "voices", "Voices", "voicesTitle", "pinsel.voices-preview", "/voices/");
  inject(homeVoices.page, "list", list("home-voice-cards", "home-voice", node("pinsel.voice-preview", {}, {}, "card"), [{ field: "quote", prop: "quote" }, { field: "author", prop: "author" }, { field: "school", prop: "school" }]).mapping);
  const homeFaq = moreSection("home-faq", "faq", "FAQ", "faqTitle", "pinsel.faq-list", "/faq/");
  inject(homeFaq.page, "list", list("home-faq-items", "home-faq", node("pinsel.faq-item", { idPrefix: "home-q" }, {}, "item"), [{ field: "question", prop: "question" }, { field: "answer", prop: "answer" }]).mapping);

  const homeCta = cta("/", true);
  const home = pageWithFrame("home", [
    group("hero"),
    group("hero-meta"),
    group("for-you"),
    group("pricing"),
    art("middle", "large", 1, "art-middle"),
    group("instructor"),
    group("results"),
    group("voices"),
    group("faq"),
    group("cta"),
  ]);
  [["hero", hero], ["hero-meta", heroMeta], ["for-you", homeForYou], ["pricing", homePricing], ["instructor", homeInstructor], ["results", homeResults], ["voices", homeVoices], ["faq", homeFaq], ["cta", homeCta]].forEach(([host, piece]) =>
    inject(home, host as string, (piece as { mapping: Mapping }).mapping),
  );

  // --------------------------------------------------------------- lessons
  const lessonsSection = (id: string, fragmentId: string, eyebrow: string, titleField: string, content: NodeInput[], bindings: Binding[] = []) =>
    fragment(id, "lessons-copy", [node("pinsel.section", { id: fragmentId, eyebrow }, { content }, "section")], [{ field: titleField, prop: "title" }, ...bindings], { kind: "single" });

  const lessonsToc = fragment("lessons-toc", "lessons-copy", [node("pinsel.toc", { label: "このページの内容", wide: true }, {
    items: (["for-you", "course", "pricing", "consultation", "instructor", "specializations", "graduates", "knowledge"] as const).map((fragmentId) => node("pinsel.toc-item", { href: `#${fragmentId}` }, {}, `toc-${fragmentId}`)),
  }, "toc")], [
    { field: "tocForYou", nodeId: "toc-for-you", prop: "label" },
    { field: "tocCourse", nodeId: "toc-course", prop: "label" },
    { field: "tocPricing", nodeId: "toc-pricing", prop: "label" },
    { field: "tocConsultation", nodeId: "toc-consultation", prop: "label" },
    { field: "tocInstructor", nodeId: "toc-instructor", prop: "label" },
    { field: "tocSpecializations", nodeId: "toc-specializations", prop: "label" },
    { field: "tocGraduates", nodeId: "toc-graduates", prop: "label" },
    { field: "tocKnowledge", nodeId: "toc-knowledge", prop: "label" },
  ], { kind: "single" });

  const lessonsForYou = lessonsSection("lessons-for-you", "for-you", "For You", "forYouTitle", [node("pinsel.checklist", {}, {}, "list")]);
  inject(lessonsForYou.page, "list", checklistItems("lessons").mapping);

  const lessonsCourse = lessonsSection("lessons-course", "course", "Course", "courseTitle", [
    node("pinsel.prose-block", {}, { items: [node("pinsel.paragraphs", {}, {}, "intro")] }, "prose"),
    node("pinsel.course-steps", {}, {}, "steps"),
  ], [{ field: "courseIntro", nodeId: "intro", prop: "text" }]);
  inject(lessonsCourse.page, "steps", list("lessons-course-steps", "course-step", node("pinsel.course-step", {}, {}, "step"), [{ field: "title", prop: "title" }, { field: "description", prop: "description" }]).mapping);

  const lessonsPricing = lessonsSection("lessons-pricing", "pricing", "Pricing", "pricingTitle", [
    node("pinsel.price-detail", {}, {}, "detail"),
    node("pinsel.prose-block", {}, { items: [node("pinsel.paragraphs", {}, {}, "schedule"), node("pinsel.paragraphs", {}, {}, "continue"), node("pinsel.paragraphs", {}, {}, "payment")] }, "notes"),
  ], [
    { field: "pricingScheduleNote", nodeId: "schedule", prop: "text" },
    { field: "pricingContinueNote", nodeId: "continue", prop: "text" },
    { field: "pricingPaymentNote", nodeId: "payment", prop: "text" },
  ]);
  const courseCard = (component: string) => [{ field: "name", prop: "name" }, { field: "price", prop: "price" }, { field: "lessonsNote", prop: "note" }].map((binding) => ({ ...binding, nodeId: component }));
  // `course.order` 1 is the consultation (COURSE_QUERY_OPTIONS); the price cards are the paid courses after it.
  inject(lessonsPricing.page, "detail", list("lessons-price-cards", "course", node("pinsel.price-detail-card", {}, {}, "card"), courseCard("card"), [{ field: "order", operator: "not-equals", value: 1 }]).mapping);

  const lessonsConsultation = lessonsSection("lessons-consultation", "consultation", "Consultation", "consultationTitle", [node("pinsel.consultation-intro", {}, { course: [] }, "intro")], [
    { field: "consultationTopicsTitle", nodeId: "intro", prop: "topicsTitle" },
    { field: "consultationTopics", nodeId: "intro", prop: "topics" },
    { field: "consultationFaqTitle", nodeId: "intro", prop: "faqTitle" },
    { field: "consultationFaqTopics", nodeId: "intro", prop: "faqTopics" },
  ]);
  inject(lessonsConsultation.page, "intro", list("lessons-consultation-course", "course", node("pinsel.consultation-price", {}, {}, "price"), courseCard("price"), [{ field: "order", operator: "equals", value: 1 }]).mapping, "course");

  const lessonsInstructorProfile = instructorFor("lessons-instructor-profile", [node("pinsel.instructor-bio", {}, {}, "bio"), group("detail")], [{ field: "lessonsBio", nodeId: "bio", prop: "text" }]);
  inject(lessonsInstructorProfile.page, "detail", detailLink.mapping);
  const lessonsInstructor = lessonsSection("lessons-instructor", "instructor", "Instructor", "instructorTitle", [group("profile"), node("pinsel.lesson-career", {}, {}, "career")], [{ field: "careerTitle", nodeId: "career", prop: "title" }]);
  inject(lessonsInstructor.page, "profile", lessonsInstructorProfile.mapping);
  inject(lessonsInstructor.page, "career", timelineItems("lessons-career").mapping);

  const lessonsSpecializations = lessonsSection("lessons-specializations", "specializations", "Specializations", "specializationsTitle", [
    node("pinsel.specialization-grid", {}, {}, "grid"),
    node("pinsel.section-after", {}, { content: [node("pinsel.prose-block", {}, { items: [node("pinsel.paragraphs", {}, {}, "note")] }, "prose")] }, "after"),
  ], [{ field: "specializationsNote", nodeId: "note", prop: "text" }]);
  inject(lessonsSpecializations.page, "grid", list("lessons-specialization-items", "specialization", node("pinsel.specialization-item", {}, {}, "item"), [{ field: "de", prop: "de" }, { field: "ja", prop: "ja" }]).mapping);

  const lessonsGraduates = lessonsSection("lessons-graduates", "graduates", "For Graduates", "graduatesTitle", [node("pinsel.graduate-content", {}, {}, "content")], [{ field: "graduatesParagraphs", nodeId: "content", prop: "paragraphs" }]);

  const lessonsKnowledge = lessonsSection("lessons-knowledge", "knowledge", "Knowledge", "knowledgeTitle", [node("pinsel.note-cards", { editorial: false }, {}, "cards")]);
  inject(lessonsKnowledge.page, "cards", list("lessons-knowledge-cards", "knowledge-card", node("pinsel.note-card", {}, {}, "card"), [
    // `note` ids are the slugs, so the referenced id is the card's /notes/<slug>/.
    { field: "note", prop: "slug", projection: { kind: "reference-id" } },
    { field: "title", prop: "title" },
    { field: "description", prop: "description" },
  ]).mapping);

  const lessons = pageWithFrame("lessons", [
    group("head"),
    art("hero", "medium", 1, "art-head"),
    group("toc"),
    group("for-you"),
    group("course"),
    group("pricing"),
    group("consultation"),
    art("middle", "large", -1, "art-middle"),
    group("instructor"),
    group("specializations"),
    group("graduates"),
    group("knowledge"),
    group("cta"),
  ]);
  [
    ["head", pageHead("/lessons/", "Lessons")],
    ["toc", lessonsToc],
    ["for-you", lessonsForYou],
    ["course", lessonsCourse],
    ["pricing", lessonsPricing],
    ["consultation", lessonsConsultation],
    ["instructor", lessonsInstructor],
    ["specializations", lessonsSpecializations],
    ["graduates", lessonsGraduates],
    ["knowledge", lessonsKnowledge],
    ["cta", cta("/lessons/", true)],
  ].forEach(([host, piece]) => inject(lessons, host as string, (piece as { mapping: Mapping }).mapping));

  // ----------------------------------------------------------------- about
  const aboutIdentity = fragment("about-instructor-identity", "about-copy", [node("pinsel.instructor-subtitle", {}, {}, "subtitle"), node("pinsel.instructor-bio-link", { href: INSTAGRAM_URL }, {}, "instagram")], [
    { field: "birthLine", nodeId: "subtitle", prop: "text" },
    { field: "instagramLabel", nodeId: "instagram", prop: "label" },
  ], { kind: "single" });
  const aboutProfile = fragment("about-profile", "instructor-profile", [node("pinsel.plain-section", { ariaLabel: STRUCTURE_LITERALS.profileAriaLabel }, {
    content: [node("pinsel.instructor", { about: true }, { identity: [group("identity")] }, "instructor")],
  }, "section")], [
    { field: "name", nodeId: "instructor", prop: "name" },
    { field: "latinName", nodeId: "instructor", prop: "latinName" },
    { field: "portraitAlt", nodeId: "instructor", prop: "portraitAlt" },
  ], { kind: "single" });
  inject(aboutProfile.page, "identity", aboutIdentity.mapping);

  const aboutCv = fragment("about-cv", "about-copy", [node("pinsel.cv", {}, {}, "cv")], [{ field: "careerTitle", prop: "careerTitle" }, { field: "educationTitle", prop: "educationTitle" }], { kind: "single" });
  inject(aboutCv.page, "cv", timelineItems("about-career").mapping, "career");
  inject(aboutCv.page, "cv", timelineItems("about-education").mapping, "education");

  const aboutMessageBody = fragment("about-message-body", "instructor-profile", [node("pinsel.prose-block", {}, { items: [node("pinsel.paragraphs", {}, {}, "paragraphs")] }, "prose")], [{ field: "aboutMessage", nodeId: "paragraphs", prop: "text" }], { kind: "single" });
  const aboutMessage = fragment("about-message", "about-copy", [node("pinsel.message", { eyebrow: STRUCTURE_LITERALS.messageEyebrow }, { content: [group("body")] }, "message")], [{ field: "messageTitle", prop: "title" }], { kind: "single" });
  inject(aboutMessage.page, "body", aboutMessageBody.mapping);

  const aboutFeatures = fragment("about-features", "about-copy", [node("pinsel.section", { eyebrow: "Our lessons" }, { content: [node("pinsel.feature-grid", {}, {}, "grid")] }, "section")], [{ field: "featuresTitle", prop: "title" }], { kind: "single" });
  inject(aboutFeatures.page, "grid", list("about-feature-cards", "feature-card", node("pinsel.feature-card", {}, {}, "card"), [{ field: "title", prop: "title" }, { field: "description", prop: "description" }]).mapping);

  const about = pageWithFrame("about", [group("head"), art("hero", "small", 1, "art-head"), group("profile"), group("cv"), art("middle", "medium", 1, "art-middle"), group("message"), group("features"), group("cta")]);
  [["head", pageHead("/about/", "About")], ["profile", aboutProfile], ["cv", aboutCv], ["message", aboutMessage], ["features", aboutFeatures], ["cta", cta("/about/", true)]].forEach(([host, piece]) => inject(about, host as string, (piece as { mapping: Mapping }).mapping));

  // --------------------------------------------------------------- results
  const resultsStats = fragment("results-stats", "site-copy", [node("pinsel.stats", {}, { items: [node("pinsel.stat", {}, {}, "results"), node("pinsel.stat", {}, {}, "schools")] }, "stats")], [
    { field: "statsResultsNumber", nodeId: "results", prop: "number" },
    { field: "statsResultsLabel", nodeId: "results", prop: "label" },
    { field: "statsSchoolsNumber", nodeId: "schools", prop: "number" },
    { field: "statsSchoolsLabel", nodeId: "schools", prop: "label" },
  ], { kind: "single" });
  const resultsHead = pageHead("/results/", "Results", true);
  inject(resultsHead.page, "after", resultsStats.mapping);

  const years = entriesOf("result-year");
  const resultsToc = fragment("results-toc", "page-copy", [node("pinsel.toc", {}, { items: years.map((year) => group(`toc-${year.id}`)) }, "toc")], [{ field: "asideLabel", prop: "label" }], pageCopy("/results/"));
  const resultsBody: NodeInput[] = [];
  const yearSections: [string, Mapping][] = [];
  for (const year of years) {
    const tocItem = fragment(`results-toc-${year.id}`, "result-year", [node("pinsel.toc-item", { number: resultsBody.length + 1 }, {}, "item")], [
      { field: "label", prop: "label" },
      { field: "label", prop: "href", transform: { kind: "prefix", prefix: "#year-" } },
    ], { kind: "pinned", entryId: year.id });
    inject(resultsToc.page, `toc-${year.id}`, tocItem.mapping);
    const rows = list(`results-rows-${year.id}`, "result-entry", node("pinsel.result-row", {}, {}, "row"), [
      { field: "school", prop: "school" },
      { field: "department", prop: "department" },
      { field: "url", prop: "url" },
    ], [{ field: "year", operator: "equals", value: ref("result-year", year.id) }]);
    const section = fragment(`results-year-${year.id}`, "result-year", [node("pinsel.year-section", {}, {}, "section")], [{ field: "label", prop: "label" }, { field: "declaredCount", prop: "count" }], { kind: "pinned", entryId: year.id });
    inject(section.page, "section", rows.mapping);
    resultsBody.push(group(`year-${year.id}`));
    yearSections.push([`year-${year.id}`, section.mapping]);
  }
  const results = pageWithFrame("results", [group("head"), art("hero", "small", 1, "art-head"), node("pinsel.archive-layout", {}, { aside: [group("toc")], body: resultsBody }, "archive"), group("cta")]);
  inject(results, "head", resultsHead.mapping);
  inject(results, "toc", resultsToc.mapping);
  for (const [host, mapping] of yearSections) inject(results, host, mapping);
  inject(results, "cta", cta("/results/", false).mapping);

  // ---------------------------------------------------------------- voices
  const voices = pageWithFrame("voices", [
    group("head"),
    art("hero", "medium", 1, "art-head"),
    node("pinsel.student-index", {}, {}, "index"),
    node("pinsel.voice-list", { artAfter: 2 }, { art: [art("middle", "medium", -1, "art-middle")] }, "list"),
    group("cta"),
  ]);
  inject(voices, "head", pageHead("/voices/", "Voices").mapping);
  inject(voices, "index", list("voices-index", "testimonial", node("pinsel.student-link", {}, {}, "link"), [{ field: "author", prop: "author" }, { field: "school", prop: "school" }]).mapping);
  inject(voices, "list", list("voices-details", "testimonial", node("pinsel.voice-detail", {}, {}, "voice"), [
    { field: "author", prop: "author" },
    { field: "yearLabel", prop: "yearLabel" },
    { field: "school", prop: "school" },
    { field: "department", prop: "department" },
    { field: "quote", prop: "quote" },
  ]).mapping);
  inject(voices, "cta", cta("/voices/", false).mapping);

  // ------------------------------------------------------------------- faq
  const groups = entriesOf("faq-group");
  const faqToc = fragment("faq-toc", "page-copy", [node("pinsel.toc", {}, { items: groups.map((faqGroup) => group(`toc-${faqGroup.id}`)) }, "toc")], [{ field: "asideLabel", prop: "label" }], pageCopy("/faq/"));
  const faqBody: NodeInput[] = [];
  const categorySections: [string, Mapping][] = [];
  groups.forEach((faqGroup, index) => {
    const position = index + 1;
    const tocItem = fragment(`faq-toc-${faqGroup.id}`, "faq-group", [node("pinsel.toc-item", { href: `#faq-${position}`, number: position }, {}, "item")], [{ field: "title", prop: "label" }], { kind: "pinned", entryId: faqGroup.id });
    inject(faqToc.page, `toc-${faqGroup.id}`, tocItem.mapping);
    const items = list(`faq-items-${faqGroup.id}`, "faq-item", node("pinsel.faq-item", { idPrefix: `category-${position}`, openFirst: position === 1 }, {}, "item"), [{ field: "question", prop: "question" }, { field: "answer", prop: "answer" }], [
      { field: "group", operator: "equals", value: ref("faq-group", faqGroup.id) },
    ]);
    const section = fragment(`faq-category-${faqGroup.id}`, "faq-group", [node("pinsel.faq-category", { fragmentId: `faq-${position}` }, {}, "category")], [{ field: "title", prop: "title" }], { kind: "pinned", entryId: faqGroup.id });
    inject(section.page, "category", items.mapping);
    faqBody.push(group(`category-${faqGroup.id}`));
    categorySections.push([`category-${faqGroup.id}`, section.mapping]);
  });
  const faq = pageWithFrame("faq", [group("head"), art("hero", "small", 1, "art-head"), node("pinsel.archive-layout", {}, { aside: [group("toc")], body: faqBody }, "archive"), group("cta")]);
  inject(faq, "head", pageHead("/faq/", "FAQ").mapping);
  inject(faq, "toc", faqToc.mapping);
  for (const [host, mapping] of categorySections) inject(faq, host, mapping);
  inject(faq, "cta", cta("/faq/", false).mapping);

  // ----------------------------------------------------------------- notes
  const notesHead = fragment("notes-head", "site-copy", [
    node("pinsel.breadcrumb", {}, {}, "breadcrumb"),
    node("pinsel.page-heading", { eyebrow: "Notes" }, {}, "heading"),
  ], [
    { field: "notesIndexTitle", nodeId: "breadcrumb", prop: "label" },
    { field: "notesIndexTitle", nodeId: "heading", prop: "title" },
    { field: "notesIndexDescription", nodeId: "heading", prop: "description" },
  ], { kind: "single" });
  const notesIndex = pageWithFrame("notes", [
    group("head"),
    art("hero", "medium", 1, "art-head"),
    node("pinsel.plain-section", { ariaLabel: STRUCTURE_LITERALS.notesIndexAriaLabel }, { content: [node("pinsel.note-cards", { editorial: true }, {}, "cards")] }, "section"),
    art("closing", "small", 1, "art-closing"),
  ]);
  inject(notesIndex, "head", notesHead.mapping);
  inject(notesIndex, "cards", list("notes-index-cards", "note", node("pinsel.note-card", {}, {}, "card"), [{ field: "slug", prop: "slug" }, { field: "title", prop: "title" }, { field: "description", prop: "description" }]).mapping);

  // All Notes lists every note in slug order (the seed's key order), the current one marked by the component.
  const allNotes = fragment("note-all-notes", "note", [node("pinsel.note-link", {}, {}, "link")], [{ field: "slug", prop: "slug" }, { field: "title", prop: "title" }], { kind: "list", sortField: "slug" });
  const notePages = new Map<string, Page>();
  for (const slug of NOTE_SLUGS) {
    const pinned = { kind: "pinned" as const, entryId: slug };
    const crumb = fragment(`note-${slug}-crumb`, "note", [node("pinsel.breadcrumb", { parentHref: "/notes/", parentLabel: STRUCTURE_LITERALS.notesBreadcrumbLabel }, {}, "breadcrumb")], [{ field: "title", prop: "label" }], pinned);
    const eyebrow = fragment(`note-${slug}-eyebrow`, "site-copy", [node("pinsel.eyebrow", {}, {}, "eyebrow")], [{ field: "noteEyebrow", prop: "text" }], { kind: "single" });
    const heading = fragment(`note-${slug}-heading`, "note", [node("pinsel.article-heading", {}, { eyebrow: [] }, "heading")], [{ field: "title", prop: "title" }, { field: "description", prop: "description" }, { field: "slug", prop: "slug" }], pinned);
    inject(heading.page, "heading", eyebrow.mapping, "eyebrow");
    const tocItems = fragment(`note-${slug}-toc-items`, "note", [node("pinsel.note-toc-items", {}, {}, "items")], [{ field: "body", prop: "markdown" }], pinned);
    const toc = fragment(`note-${slug}-toc`, "site-copy", [node("pinsel.toc", {}, { items: [group("items")] }, "toc")], [{ field: "contentsLabel", prop: "label" }], { kind: "single" });
    inject(toc.page, "items", tocItems.mapping);
    const body = fragment(`note-${slug}-body`, "note", [node("pinsel.prose", {}, {}, "prose")], [{ field: "body", prop: "markdown" }], pinned);
    const related = fragment(`note-${slug}-related`, "site-copy", [node("pinsel.article-related", {}, {}, "related")], [{ field: "allNotesLabel", prop: "title" }], { kind: "single" });
    inject(related.page, "related", allNotes.mapping);
    const page = pageWithFrame(`note-${slug}`, [
      group("crumb"),
      group("heading"),
      art("hero", "ribbon", 1, "art-head"),
      node("pinsel.article-layout", {}, { aside: [group("toc")], body: [group("body"), group("related")] }, "layout"),
      art("closing", "small", 1, "art-closing"),
    ]);
    [["crumb", crumb], ["heading", heading], ["toc", toc], ["body", body], ["related", related]].forEach(([host, piece]) => inject(page, host as string, (piece as { mapping: Mapping }).mapping));
    notePages.set(slug, page);
  }

  // --------------------------------------------------------------- contact
  const contactAside = fragment("contact-aside", "contact-copy", [node("pinsel.contact-aside", {}, {}, "aside")], [{ field: "stepsTitle", prop: "title" }], { kind: "single" });
  inject(contactAside.page, "aside", list("contact-steps", "contact-step", node("pinsel.step-flow-item", {}, {}, "step"), [{ field: "title", prop: "title" }, { field: "description", prop: "description" }]).mapping);
  const formFields = [
    "formAriaLabel", "nameLabel", "emailLabel", "courseLabel", "messageLabel", "requiredLabel", "optionalLabel", "submitLabel", "submittingLabel", "successTitle", "successBody", "errorMessage",
    "backLabel", "valueMissingMessage", "emailFormatMessage", "previewNotice", "successPreviewEyebrow", "successPreviewNotice",
  ] as const;
  const contactForm = fragment("contact-form", "contact-copy", [node("pinsel.contact-form", {}, {}, "form")], [
    ...formFields.map((key) => ({ field: key, prop: key })),
    // Option index 0 is 未定; the course options follow in `course.order` (COURSE_QUERY_OPTIONS, `?course=N`).
    { field: "courseUndecidedOption", prop: "undecidedOption" },
  ], { kind: "single" });
  inject(contactForm.page, "form", list("contact-course-options", "course", node("pinsel.course-option", {}, {}, "option"), [{ field: "contactOptionLabel", prop: "label" }]).mapping, "options");
  const legal = fragment("contact-legal", "contact-copy", [node("pinsel.legal", {}, {}, "legal")], [{ field: "legalSummary", prop: "summary" }], { kind: "single" });
  inject(legal.page, "legal", list("contact-legal-rows", "legal-row", node("pinsel.legal-row", {}, {}, "row"), [{ field: "key", prop: "term" }, { field: "value", prop: "value" }]).mapping);
  const contact = pageWithFrame("contact", [
    group("head"),
    art("hero", "ribbon", 1, "art-head"),
    node("pinsel.contact-layout", {}, { aside: [group("aside")], panel: [group("form")] }, "layout"),
    group("legal"),
    art("closing", "medium", 1, "art-closing"),
  ]);
  [["head", pageHead("/contact/", "Contact")], ["aside", contactAside], ["form", contactForm], ["legal", legal]].forEach(([host, piece]) => inject(contact, host as string, (piece as { mapping: Mapping }).mapping));

  // ------------------------------------------------------------------- 404
  const notFoundBlock = fragment("not-found-block", "site-copy", [node("pinsel.not-found", {}, {}, "block")], [
    { field: "notFoundTitle", prop: "title" },
    { field: "notFoundBody", prop: "body" },
    { field: "notFoundLinkLabel", prop: "linkLabel" },
  ], { kind: "single" });
  const notFound = pageWithFrame("not-found", [group("block"), art("closing", "medium", 1, "art-closing")]);
  inject(notFound, "block", notFoundBlock.mapping);

  // --------------------------------------------------------------- sitemap
  const routeTitle = (route: string) => {
    const entry = entries.find((candidate) => candidate.modelId === "page-copy" && candidate.values[fieldId("page-copy", "route")] === route);
    return String(entry?.values[fieldId("page-copy", "metaTitle")] ?? route);
  };
  site.sitemap({
    id: "main",
    name: "Main",
    root: {
      id: "home",
      title: routeTitle("/"),
      page: home,
      children: [
        { id: "lessons", title: routeTitle("/lessons/"), slug: "lessons", page: lessons },
        { id: "about", title: routeTitle("/about/"), slug: "about", page: about },
        { id: "results", title: routeTitle("/results/"), slug: "results", page: results },
        { id: "voices", title: routeTitle("/voices/"), slug: "voices", page: voices },
        { id: "faq", title: routeTitle("/faq/"), slug: "faq", page: faq },
        {
          id: "notes",
          title: routeTitle("/notes/"),
          slug: "notes",
          page: notesIndex,
          children: NOTE_SLUGS.map((slug) => ({ id: `note-${slug}`, title: slug, slug, page: notePages.get(slug)! })),
        },
        { id: "contact", title: routeTitle("/contact/"), slug: "contact", page: contact },
        { id: "not-found", title: routeTitle(NOT_FOUND_ROUTE), slug: "404.html", page: notFound },
      ],
    },
  });

  const project = site.toSiteProject();
  const provider = project.providers.content.find((candidate) => candidate.id === PINSEL_CONTENT_PROVIDER_ID);
  if (!provider) throw new Error(`defineSite produced no "${PINSEL_CONTENT_PROVIDER_ID}" provider.`);
  provider.entries = [...entries];
  for (const record of project.providers.mappings.flatMap((candidate) => candidate.records)) {
    const pin = pins.get(record.id);
    if (pin && record.document.mode.kind === "collection") record.document.mode.query.pins = [pin as never];
  }
  return { project, models };
}

