# Composer migration field and reference map

This is the T4 prerequisite inventory for [T4 #54](https://github.com/zudolab/pinsel/issues/54), under [epic #51](https://github.com/zudolab/pinsel/issues/51). It is an analysis of committed seed inputs, **not a migration or proof of T3 acceptance**. This historical inventory retains its original inputs; current normalization decisions and staged verification are recorded in [the normalization audit](composer-normalization.md) and compatibility ledger. The owner’s current D1 draft was not supplied.

## Evidence and preservation rule

Inventory inspected 2026-11-16 against Pinsel’s `6df67ede4ae8c55dc80f8d66f8665b7b72a961eb` source model/structure baseline and Composer `4668d61c3e5e568cea5385152840098a51ef24c9`. The integration branch may subsequently change independently. Package and runtime verification belongs in [the compatibility ledger](composer-compatibility.md).

Sources: `packages/pinsel-content/src/models/{singletons,collections,define,dsl}.ts`, `src/site/{structure,entries,component-contract,page-meta}.ts` under that package, and `src/invariants.ts`. The inventory was obtained by importing `PINSEL_MODELS`, `readContentEntries`, `contractPack`, and `buildPinselSite` with the repository’s tsx/tsconfig, constructing the project in memory, and reading its models, bindings, queries, attachments and Sitemap. This is a read-only analysis; it did not emit a replacement SiteProject or seed.

Staged import must preserve every model/entry/field ID, value, lifecycle, timestamp and qualified reference. A new native store resets positive entry generations to 1; the actual post-import verifier records and permits only that metadata reset, without claiming old revision counters transferred. Every field below has the initial destination **the same Content owner and field ID**. A later normalization needs a versioned, reversible old-to-new map, explicit validation and historical rendering comparison. No field absent from a Mapping may be discarded: metadata, query selectors and existing saved data also own meaning. Preserve original seeds, assets, D1 history and snapshots as recovery evidence. Only one store may be authoritative; this inventory grants no cutover or deployment.

## Ownership and normalization decisions

| Finding | Baseline meaning | Decision / prerequisite |
| --- | --- | --- |
| Five singleton-shaped models | `site-copy`, `lessons-copy`, `about-copy`, `instructor-profile`, `contact-copy` each have one entry but collection kind | Retain initially. Composer supports single models/mappings, but collection attachments require collection models and collection-mode mappings; changing only kind breaks existing use. |
| Newline lists | Hero title/lead, consultation topics/FAQ topics, graduate paragraphs and about message use long-text with component-specific line semantics | Retain exact strings, blank lines and order. A semantic list conversion must prove rendering equivalence and supported binding; ordinary long-text paragraphs must not be blindly split. |
| Structured fields | Content/contract schemas can express more than scalar fields | `src/mapping/resolver/targets.ts` and `resolver.ts` reject structured Mapping targets; scalar object-field projections do not establish list/object target support. Introduce only a justified generic capability with installed acceptance. |
| Manual pins | Baseline DSL helper patched `query.pins` after an impossible order filter | Replaced in T4 by public typed pins, exact selected identities and explicit order. Historical rows below remain the old-state evidence. |
| Fragment proliferation | Per-copy fragments, per-year/per-group mappings, nested attachment hosts | Internal implementation records, not user pages. Scalar Mapping targets, model-specific bindings and literal queries explain much of the splitting. Do not consolidate by assuming parent-relative query expressions. |
| Global templates | Shared header/footer/CTA are mapping-backed compositions | `src/site-project/compiler/compiler.ts` rejects nested linked templates and attachment sources with bindings. Nested detached attachments are not proof of nested Global support. Preserve the live Content references when considering patterns. |
| Course order conflates identity | Baseline sorting, consultation membership and visitor query shared one value | Replaced in T4 by entry-ID bindings, qualified membership pins and fixed legacy aliases. Migration preserves captured paid arrangement and refuses unsupported query customizations. |
| Home excerpts | `home-result`, `home-voice`, `home-faq`, course home/lesson text, instructor home/lesson/about text | Intentionally distinct. Preserve as separate authored values; do not merge because detail records look similar. Knowledge-card title/description also remain independent from Note title/description. |
| Totals | Result-year declared counts total 123; detailed result entries total 105; Home statistics are display text | Preserve declared totals and exact detail lists; do not infer one from another. |

Parent Composition owns ordered named slots and local presentation. A placed component with Mapping-bound values owns presentation while the Content record owns those values. Never shadow a bound value with a local prop. A live shared reference must remain visibly distinct from a detached pattern copy. Stable selection must use provider/record/node ownership, not generated collection node IDs or position. The materializer’s source metadata is needed for nested mapped children.

### Link and asset invariants

Existing query meaning must remain: `?course=0` → undecided, `?course=1` → `course/consultation`, `?course=2` → `course/two-month`, `?course=3` → `course/four-month`. `COURSE_QUERY_OPTIONS` and `contactHrefForCourse` already record this mapping, while the historical pricing/Contact path exposed ordering dependence. The T4 migration replaces that path as recorded in the current recipe. Reorder and insertion tests must cover old incoming links and newly rendered links together. Stable IDs alone are insufficient unless the visitor handler also uses the translation.

Preserve `/lessons/` section anchors, `student-*`, `faq-*`, and `section-*` positional fragments until an explicit old-anchor compatibility map is rehearsed. Note reference-id projection currently doubles as a slug: entry identity/slug changes must update both the reference and route contract or maintain redirects. `page-copy.route` selects metadata and route-specific copy; Note title/description select metadata by slug. Sitemap changes must not silently strand these selectors. Header navigation order intentionally differs from footer order; Sitemap navigation arrays are currently empty and navigation is Content-driven.

Assets remain host-owned paths, including `/assets/instructor-yuko.jpg`, `/assets/illustrations/10-form-through-dialogue.png`, and `/favicon.svg`, plus decorative/art assets referenced by the production renderer and CSS. There are no Content asset fields in these 25 models. An exact capture must include the referenced asset manifest/identity, not infer an empty asset set from Content. Retain the original `design/pinsel-prototype` assets and compare production-rendered URLs. School URL allowlist aliases are intentional; Instagram, structural hrefs, art and form behavior remain host invariants unless a separately validated capability replaces them.

## Model and field inventory

Mapping use notation is `mapping record / canonical node.prop`. Query sort/filter use is shown separately. Provider identities throughout are `content-filesystem`, `mapping-filesystem`, `files`, and `sitemap-filesystem`; preserve them or record an explicit provider relocation map. Table counts include all fields, even optional fields absent from individual records.

### site-copy

Baseline kind: `collection`; entries: 1. IDs: `site-copy`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `site-copy-brand-word` | `brandWord` | text (required) | frame-header / header.brandWord (value); frame-footer / footer.brandWord (value) |
| `site-copy-brand-sub` | `brandSub` | text (required) | frame-header / header.brandSub (value); frame-footer / footer.brandSub (value) |
| `site-copy-hero-label` | `heroLabel` | text (required) | home-hero / hero.label (value) |
| `site-copy-hero-title-lines` | `heroTitleLines` | long-text (required) | home-hero / hero.titleLines (value) |
| `site-copy-hero-lead` | `heroLead` | long-text (required) | home-hero / hero.lead (value) |
| `site-copy-hero-primary-label` | `heroPrimaryLabel` | text (required) | home-hero / hero.primaryLabel (value) |
| `site-copy-hero-pricing-label` | `heroPricingLabel` | text (required) | home-hero / hero.pricingLabel (value) |
| `site-copy-hero-meta-line` | `heroMetaLine` | text (required) | home-hero-meta / meta.line (value) |
| `site-copy-hero-intro` | `heroIntro` | long-text (required) | home-hero-meta / meta.intro (value) |
| `site-copy-for-you-title` | `forYouTitle` | text (required) | home-for-you / section.title (value) |
| `site-copy-pricing-title` | `pricingTitle` | text (required) | home-pricing / section.title (value) |
| `site-copy-pricing-note` | `pricingNote` | text (required) | home-pricing / cards.note (value) |
| `site-copy-pricing-more-label` | `pricingMoreLabel` | text (required) | home-pricing / cards.moreLabel (value) |
| `site-copy-instructor-title` | `instructorTitle` | text (required) | home-instructor / section.title (value) |
| `site-copy-instructor-detail-label` | `instructorDetailLabel` | text (required) | instructor-detail-link / link.label (value) |
| `site-copy-results-title` | `resultsTitle` | text (required) | home-results / section.title (value) |
| `site-copy-voices-title` | `voicesTitle` | text (required) | home-voices / section.title (value) |
| `site-copy-faq-title` | `faqTitle` | text (required) | home-faq / section.title (value) |
| `site-copy-more-label` | `moreLabel` | text (required) | home-results / more.label (value); home-voices / more.label (value); home-faq / more.label (value) |
| `site-copy-cta-title` | `ctaTitle` | text (required) | page-home-cta / cta.title (value); page-lessons-cta / cta.title (value); page-about-cta / cta.title (value); page-results-cta / cta.title (value); page-voices-cta / cta.title (value); page-faq-cta / cta.title (value) |
| `site-copy-cta-button-label` | `ctaButtonLabel` | text (required) | frame-header / header.contactLabel (value); page-home-cta / cta.buttonLabel (value); page-lessons-cta / cta.buttonLabel (value); page-about-cta / cta.buttonLabel (value); page-results-cta / cta.buttonLabel (value); page-voices-cta / cta.buttonLabel (value); page-faq-cta / cta.buttonLabel (value) |
| `site-copy-stats-results-number` | `statsResultsNumber` | text (required) | results-stats / results.number (value) |
| `site-copy-stats-results-label` | `statsResultsLabel` | text (required) | results-stats / results.label (value) |
| `site-copy-stats-schools-number` | `statsSchoolsNumber` | text (required) | results-stats / schools.number (value) |
| `site-copy-stats-schools-label` | `statsSchoolsLabel` | text (required) | results-stats / schools.label (value) |
| `site-copy-notes-index-title` | `notesIndexTitle` | text (required) | notes-head / breadcrumb.label (value); notes-head / heading.title (value) |
| `site-copy-notes-index-description` | `notesIndexDescription` | long-text (required) | notes-head / heading.description (value) |
| `site-copy-note-eyebrow` | `noteEyebrow` | text (required) | note-exam-schedule-eyebrow / eyebrow.text (value); note-free-tuition-eyebrow / eyebrow.text (value); note-german-language-eyebrow / eyebrow.text (value); note-online-exam-eyebrow / eyebrow.text (value); note-what-is-mappe-eyebrow / eyebrow.text (value) |
| `site-copy-all-notes-label` | `allNotesLabel` | text (required) | note-exam-schedule-related / related.title (value); note-free-tuition-related / related.title (value); note-german-language-related / related.title (value); note-online-exam-related / related.title (value); note-what-is-mappe-related / related.title (value) |
| `site-copy-contents-label` | `contentsLabel` | text (required) | note-exam-schedule-toc / toc.label (value); note-free-tuition-toc / toc.label (value); note-german-language-toc / toc.label (value); note-online-exam-toc / toc.label (value); note-what-is-mappe-toc / toc.label (value) |
| `site-copy-not-found-title` | `notFoundTitle` | text (required) | not-found-block / block.title (value) |
| `site-copy-not-found-body` | `notFoundBody` | long-text (required) | not-found-block / block.body (value) |
| `site-copy-not-found-link-label` | `notFoundLinkLabel` | text (required) | not-found-block / block.linkLabel (value) |
| `site-copy-footer-instagram-label` | `footerInstagramLabel` | text (required) | frame-footer / footer.instagramLabel (value) |
| `site-copy-footer-copyright` | `footerCopyright` | text (required) | frame-footer / footer.copyright (value) |
| `site-copy-back-to-top-label` | `backToTopLabel` | text (required) | frame-footer / footer.backToTopLabel (value) |

### page-copy

Baseline kind: `collection`; entries: 9. IDs: `page-about`, `page-contact`, `page-faq`, `page-home`, `page-lessons`, `page-not-found`, `page-notes`, `page-results`, `page-voices`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `page-copy-route` | `route` | url (required) | page-home-cta-subcopy [filter]; page-lessons-head [filter]; page-lessons-cta-subcopy [filter]; page-about-head [filter]; page-about-cta-subcopy [filter]; page-results-head [filter]; results-toc [filter]; page-results-cta-subcopy [filter]; page-voices-head [filter]; page-voices-cta-subcopy [filter]; faq-toc [filter]; page-faq-head [filter]; page-faq-cta-subcopy [filter]; page-contact-head [filter]; metadata route lookup; Sitemap/source route selection |
| `page-copy-meta-title` | `metaTitle` | text (required) | document title |
| `page-copy-meta-description` | `metaDescription` | long-text (optional) | document meta description |
| `page-copy-header-title` | `headerTitle` | text (optional) | page-lessons-head / breadcrumb.label (value); page-lessons-head / heading.title (value); page-about-head / breadcrumb.label (value); page-about-head / heading.title (value); page-results-head / breadcrumb.label (value); page-results-head / heading.title (value); page-voices-head / breadcrumb.label (value); page-voices-head / heading.title (value); page-faq-head / breadcrumb.label (value); page-faq-head / heading.title (value); page-contact-head / breadcrumb.label (value); page-contact-head / heading.title (value) |
| `page-copy-header-description` | `headerDescription` | long-text (optional) | page-lessons-head / heading.description (value); page-about-head / heading.description (value); page-results-head / heading.description (value); page-voices-head / heading.description (value); page-faq-head / heading.description (value); page-contact-head / heading.description (value) |
| `page-copy-aside-label` | `asideLabel` | text (optional) | results-toc / toc.label (value); faq-toc / toc.label (value) |
| `page-copy-cta-sub-copy` | `ctaSubCopy` | text (optional) | page-home-cta-subcopy / subcopy.text (value); page-lessons-cta-subcopy / subcopy.text (value); page-about-cta-subcopy / subcopy.text (value); page-results-cta-subcopy / subcopy.text (value); page-voices-cta-subcopy / subcopy.text (value); page-faq-cta-subcopy / subcopy.text (value) |
| `page-copy-order` | `order` | number (required) | page-home-cta-subcopy [sort]; page-lessons-head [sort]; page-lessons-cta-subcopy [sort]; page-about-head [sort]; page-about-cta-subcopy [sort]; page-results-head [sort]; results-toc [sort]; page-results-cta-subcopy [sort]; page-voices-head [sort]; page-voices-cta-subcopy [sort]; faq-toc [sort]; page-faq-head [sort]; page-faq-cta-subcopy [sort]; page-contact-head [sort] |

### nav-link

Baseline kind: `collection`; entries: 7. IDs: `nav-about`, `nav-contact`, `nav-faq`, `nav-lessons`, `nav-notes`, `nav-results`, `nav-voices`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `nav-link-href` | `href` | url (required) | nav-item-nav-lessons / item.href (value); nav-item-nav-about / item.href (value); nav-item-nav-results / item.href (value); nav-item-nav-voices / item.href (value); nav-item-nav-notes / item.href (value); nav-item-nav-faq / item.href (value); frame-footer-nav / item.href (value) |
| `nav-link-label` | `label` | text (required) | frame-footer-nav / item.label (value) |
| `nav-link-header-label` | `headerLabel` | text (required) | nav-item-nav-lessons / item.label (value); nav-item-nav-about / item.label (value); nav-item-nav-results / item.label (value); nav-item-nav-voices / item.label (value); nav-item-nav-notes / item.label (value); nav-item-nav-faq / item.label (value) |
| `nav-link-footer-title` | `footerTitle` | text (required) | frame-footer-nav / item.title (value) |
| `nav-link-footer-description` | `footerDescription` | text (required) | frame-footer-nav / item.description (value) |
| `nav-link-order` | `order` | number (required) | nav-item-nav-lessons [filter]; nav-item-nav-about [filter]; nav-item-nav-results [filter]; nav-item-nav-voices [filter]; nav-item-nav-notes [filter]; nav-item-nav-faq [filter]; frame-footer-nav [sort] |

### lessons-copy

Baseline kind: `collection`; entries: 1. IDs: `lessons-copy`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `lessons-copy-toc-for-you` | `tocForYou` | text (required) | lessons-toc / toc-for-you.label (value) |
| `lessons-copy-toc-course` | `tocCourse` | text (required) | lessons-toc / toc-course.label (value) |
| `lessons-copy-toc-pricing` | `tocPricing` | text (required) | lessons-toc / toc-pricing.label (value) |
| `lessons-copy-toc-consultation` | `tocConsultation` | text (required) | lessons-toc / toc-consultation.label (value) |
| `lessons-copy-toc-instructor` | `tocInstructor` | text (required) | lessons-toc / toc-instructor.label (value) |
| `lessons-copy-toc-specializations` | `tocSpecializations` | text (required) | lessons-toc / toc-specializations.label (value) |
| `lessons-copy-toc-graduates` | `tocGraduates` | text (required) | lessons-toc / toc-graduates.label (value) |
| `lessons-copy-toc-knowledge` | `tocKnowledge` | text (required) | lessons-toc / toc-knowledge.label (value) |
| `lessons-copy-for-you-title` | `forYouTitle` | text (required) | lessons-for-you / section.title (value) |
| `lessons-copy-course-title` | `courseTitle` | text (required) | lessons-course / section.title (value) |
| `lessons-copy-course-intro` | `courseIntro` | long-text (required) | lessons-course / intro.text (value) |
| `lessons-copy-pricing-title` | `pricingTitle` | text (required) | lessons-pricing / section.title (value) |
| `lessons-copy-pricing-schedule-note` | `pricingScheduleNote` | long-text (required) | lessons-pricing / schedule.text (value) |
| `lessons-copy-pricing-continue-note` | `pricingContinueNote` | long-text (required) | lessons-pricing / continue.text (value) |
| `lessons-copy-pricing-payment-note` | `pricingPaymentNote` | long-text (required) | lessons-pricing / payment.text (value) |
| `lessons-copy-consultation-title` | `consultationTitle` | text (required) | lessons-consultation / section.title (value) |
| `lessons-copy-consultation-topics-title` | `consultationTopicsTitle` | text (required) | lessons-consultation / intro.topicsTitle (value) |
| `lessons-copy-consultation-topics` | `consultationTopics` | long-text (required) | lessons-consultation / intro.topics (value) |
| `lessons-copy-consultation-faq-title` | `consultationFaqTitle` | text (required) | lessons-consultation / intro.faqTitle (value) |
| `lessons-copy-consultation-faq-topics` | `consultationFaqTopics` | long-text (required) | lessons-consultation / intro.faqTopics (value) |
| `lessons-copy-instructor-title` | `instructorTitle` | text (required) | lessons-instructor / section.title (value) |
| `lessons-copy-career-title` | `careerTitle` | text (required) | lessons-instructor / career.title (value) |
| `lessons-copy-specializations-title` | `specializationsTitle` | text (required) | lessons-specializations / section.title (value) |
| `lessons-copy-specializations-note` | `specializationsNote` | long-text (required) | lessons-specializations / note.text (value) |
| `lessons-copy-graduates-title` | `graduatesTitle` | text (required) | lessons-graduates / section.title (value) |
| `lessons-copy-graduates-paragraphs` | `graduatesParagraphs` | long-text (required) | lessons-graduates / content.paragraphs (value) |
| `lessons-copy-knowledge-title` | `knowledgeTitle` | text (required) | lessons-knowledge / section.title (value) |

### about-copy

Baseline kind: `collection`; entries: 1. IDs: `about-copy`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `about-copy-birth-line` | `birthLine` | text (required) | about-instructor-identity / subtitle.text (value) |
| `about-copy-instagram-label` | `instagramLabel` | text (required) | about-instructor-identity / instagram.label (value) |
| `about-copy-career-title` | `careerTitle` | text (required) | about-cv / cv.careerTitle (value) |
| `about-copy-education-title` | `educationTitle` | text (required) | about-cv / cv.educationTitle (value) |
| `about-copy-message-title` | `messageTitle` | text (required) | about-message / message.title (value) |
| `about-copy-features-title` | `featuresTitle` | text (required) | about-features / section.title (value) |

### instructor-profile

Baseline kind: `collection`; entries: 1. IDs: `instructor-profile`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `instructor-profile-name` | `name` | text (required) | home-instructor-profile / instructor.name (value); lessons-instructor-profile / instructor.name (value); about-profile / instructor.name (value) |
| `instructor-profile-latin-name` | `latinName` | text (required) | home-instructor-profile / instructor.latinName (value); lessons-instructor-profile / instructor.latinName (value); about-profile / instructor.latinName (value) |
| `instructor-profile-title` | `title` | text (required) | home-instructor-profile / subtitle.text (value) |
| `instructor-profile-portrait-alt` | `portraitAlt` | text (required) | home-instructor-profile / instructor.portraitAlt (value); lessons-instructor-profile / instructor.portraitAlt (value); about-profile / instructor.portraitAlt (value) |
| `instructor-profile-home-bio` | `homeBio` | long-text (required) | home-instructor-profile / bio.text (value) |
| `instructor-profile-lessons-bio` | `lessonsBio` | long-text (required) | lessons-instructor-profile / bio.text (value) |
| `instructor-profile-about-message` | `aboutMessage` | long-text (required) | about-message-body / paragraphs.text (value) |

### contact-copy

Baseline kind: `collection`; entries: 1. IDs: `contact-copy`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `contact-copy-steps-title` | `stepsTitle` | text (required) | contact-aside / aside.title (value) |
| `contact-copy-legal-summary` | `legalSummary` | text (required) | contact-legal / legal.summary (value) |
| `contact-copy-form-aria-label` | `formAriaLabel` | text (required) | contact-form / form.formAriaLabel (value) |
| `contact-copy-name-label` | `nameLabel` | text (required) | contact-form / form.nameLabel (value) |
| `contact-copy-email-label` | `emailLabel` | text (required) | contact-form / form.emailLabel (value) |
| `contact-copy-course-label` | `courseLabel` | text (required) | contact-form / form.courseLabel (value) |
| `contact-copy-course-undecided-option` | `courseUndecidedOption` | text (required) | contact-form / form.undecidedOption (value) |
| `contact-copy-message-label` | `messageLabel` | text (required) | contact-form / form.messageLabel (value) |
| `contact-copy-required-label` | `requiredLabel` | text (required) | contact-form / form.requiredLabel (value) |
| `contact-copy-optional-label` | `optionalLabel` | text (required) | contact-form / form.optionalLabel (value) |
| `contact-copy-submit-label` | `submitLabel` | text (required) | contact-form / form.submitLabel (value) |
| `contact-copy-submitting-label` | `submittingLabel` | text (required) | contact-form / form.submittingLabel (value) |
| `contact-copy-success-title` | `successTitle` | text (required) | contact-form / form.successTitle (value) |
| `contact-copy-success-body` | `successBody` | long-text (required) | contact-form / form.successBody (value) |
| `contact-copy-error-message` | `errorMessage` | long-text (required) | contact-form / form.errorMessage (value) |
| `contact-copy-back-label` | `backLabel` | text (required) | contact-form / form.backLabel (value) |
| `contact-copy-value-missing-message` | `valueMissingMessage` | text (required) | contact-form / form.valueMissingMessage (value) |
| `contact-copy-email-format-message` | `emailFormatMessage` | text (required) | contact-form / form.emailFormatMessage (value) |
| `contact-copy-preview-notice` | `previewNotice` | long-text (required) | contact-form / form.previewNotice (value) |
| `contact-copy-success-preview-eyebrow` | `successPreviewEyebrow` | text (required) | contact-form / form.successPreviewEyebrow (value) |
| `contact-copy-success-preview-notice` | `successPreviewNotice` | long-text (required) | contact-form / form.successPreviewNotice (value) |

### course

Baseline kind: `collection`; entries: 3. IDs: `consultation`, `four-month`, `two-month`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `course-name` | `name` | text (required) | home-pricing-cards / card.name (value); lessons-price-cards / card.name (value); lessons-consultation-course / price.name (value) |
| `course-price` | `price` | text (required) | home-pricing-cards / card.price (value); lessons-price-cards / card.price (value); lessons-consultation-course / price.price (value) |
| `course-unit` | `unit` | text (required) | home-pricing-cards / card.unit (value) |
| `course-home-description` | `homeDescription` | text (required) | home-pricing-cards / card.description (value) |
| `course-lessons-note` | `lessonsNote` | text (required) | lessons-price-cards / card.note (value); lessons-consultation-course / price.note (value) |
| `course-contact-option-label` | `contactOptionLabel` | text (required) | contact-course-options / option.label (value) |
| `course-featured` | `featured` | boolean (required) | home-pricing-cards / card.featured (value) |
| `course-order` | `order` | number (required) | home-pricing-cards / card.courseIndex (value); home-pricing-cards [sort]; lessons-price-cards [filter]; lessons-price-cards [sort]; lessons-consultation-course [filter]; lessons-consultation-course [sort]; contact-course-options [sort] |

### course-step

Baseline kind: `collection`; entries: 3. IDs: `course-step-01`, `course-step-02`, `course-step-03`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `course-step-title` | `title` | text (required) | lessons-course-steps / step.title (value) |
| `course-step-description` | `description` | long-text (required) | lessons-course-steps / step.description (value) |
| `course-step-order` | `order` | number (required) | lessons-course-steps [sort] |

### target-item

Baseline kind: `collection`; entries: 12. IDs: `home-01`, `home-02`, `home-03`, `home-04`, `home-05`, `lessons-01`, `lessons-02`, `lessons-03`, `lessons-04`, `lessons-05`, `lessons-06`, `lessons-07`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `target-item-page` | `page` | choice (required) {"options": [{"value": "home", "label": "トップ"}, {"value": "lessons", "label": "オンラインクラス"}]} | target-items-home [filter]; target-items-lessons [filter] |
| `target-item-text` | `text` | text (required) | target-items-home / item.text (value); target-items-lessons / item.text (value) |
| `target-item-order` | `order` | number (required) | target-items-home [sort]; target-items-lessons [sort] |

### specialization

Baseline kind: `collection`; entries: 9. IDs: `specialization-01`, `specialization-02`, `specialization-03`, `specialization-04`, `specialization-05`, `specialization-06`, `specialization-07`, `specialization-08`, `specialization-09`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `specialization-de` | `de` | text (required) | lessons-specialization-items / item.de (value) |
| `specialization-ja` | `ja` | text (required) | lessons-specialization-items / item.ja (value) |
| `specialization-order` | `order` | number (required) | lessons-specialization-items [sort] |

### feature-card

Baseline kind: `collection`; entries: 4. IDs: `feature-card-01`, `feature-card-02`, `feature-card-03`, `feature-card-04`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `feature-card-title` | `title` | text (required) | about-feature-cards / card.title (value) |
| `feature-card-description` | `description` | long-text (required) | about-feature-cards / card.description (value) |
| `feature-card-order` | `order` | number (required) | about-feature-cards [sort] |

### timeline-entry

Baseline kind: `collection`; entries: 15. IDs: `about-career-01`, `about-career-02`, `about-career-03`, `about-career-04`, `about-career-05`, `about-career-06`, `about-education-01`, `about-education-02`, `lessons-career-01`, `lessons-career-02`, `lessons-career-03`, `lessons-career-04`, `lessons-career-05`, `lessons-career-06`, `lessons-career-07`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `timeline-entry-timeline` | `timeline` | choice (required) {"options": [{"value": "lessons-career", "label": "オンラインクラス 経歴"}, {"value": "about-career", "label": "講師紹介 経歴"}, {"value": "about-education", "label": "講師紹介 学歴"}]} | timeline-lessons-career [filter]; timeline-about-career [filter]; timeline-about-education [filter] |
| `timeline-entry-year` | `year` | text (required) | timeline-lessons-career / item.year (value); timeline-about-career / item.year (value); timeline-about-education / item.year (value) |
| `timeline-entry-text` | `text` | text (required) | timeline-lessons-career / item.text (value); timeline-about-career / item.text (value); timeline-about-education / item.text (value) |
| `timeline-entry-order` | `order` | number (required) | timeline-lessons-career [sort]; timeline-about-career [sort]; timeline-about-education [sort] |

### result-year

Baseline kind: `collection`; entries: 11. IDs: `year-2015`, `year-2016`, `year-2017`, `year-2018`, `year-2019`, `year-2020`, `year-2021`, `year-2022`, `year-2023`, `year-2024`, `year-2025`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `result-year-label` | `label` | text (required) | results-toc-year-2025 / item.label (value); results-toc-year-2025 / item.href (value); results-year-year-2025 / section.label (value); results-toc-year-2024 / item.label (value); results-toc-year-2024 / item.href (value); results-year-year-2024 / section.label (value); results-toc-year-2023 / item.label (value); results-toc-year-2023 / item.href (value); results-year-year-2023 / section.label (value); results-toc-year-2022 / item.label (value); results-toc-year-2022 / item.href (value); results-year-year-2022 / section.label (value); results-toc-year-2021 / item.label (value); results-toc-year-2021 / item.href (value); results-year-year-2021 / section.label (value); results-toc-year-2020 / item.label (value); results-toc-year-2020 / item.href (value); results-year-year-2020 / section.label (value); results-toc-year-2019 / item.label (value); results-toc-year-2019 / item.href (value); results-year-year-2019 / section.label (value); results-toc-year-2018 / item.label (value); results-toc-year-2018 / item.href (value); results-year-year-2018 / section.label (value); results-toc-year-2017 / item.label (value); results-toc-year-2017 / item.href (value); results-year-year-2017 / section.label (value); results-toc-year-2016 / item.label (value); results-toc-year-2016 / item.href (value); results-year-year-2016 / section.label (value); results-toc-year-2015 / item.label (value); results-toc-year-2015 / item.href (value); results-year-year-2015 / section.label (value) |
| `result-year-declared-count` | `declaredCount` | number (required) | results-year-year-2025 / section.count (value); results-year-year-2024 / section.count (value); results-year-year-2023 / section.count (value); results-year-year-2022 / section.count (value); results-year-year-2021 / section.count (value); results-year-year-2020 / section.count (value); results-year-year-2019 / section.count (value); results-year-year-2018 / section.count (value); results-year-year-2017 / section.count (value); results-year-year-2016 / section.count (value); results-year-year-2015 / section.count (value) |
| `result-year-order` | `order` | number (required) | results-toc-year-2025 [filter]; results-year-year-2025 [filter]; results-toc-year-2024 [filter]; results-year-year-2024 [filter]; results-toc-year-2023 [filter]; results-year-year-2023 [filter]; results-toc-year-2022 [filter]; results-year-year-2022 [filter]; results-toc-year-2021 [filter]; results-year-year-2021 [filter]; results-toc-year-2020 [filter]; results-year-year-2020 [filter]; results-toc-year-2019 [filter]; results-year-year-2019 [filter]; results-toc-year-2018 [filter]; results-year-year-2018 [filter]; results-toc-year-2017 [filter]; results-year-year-2017 [filter]; results-toc-year-2016 [filter]; results-year-year-2016 [filter]; results-toc-year-2015 [filter]; results-year-year-2015 [filter] |

### result-entry

Baseline kind: `collection`; entries: 105. IDs: `year-2015-01`, `year-2015-02`, `year-2015-03`, `year-2015-04`, `year-2016-01`, `year-2016-02`, `year-2016-03`, `year-2016-04`, `year-2016-05`, `year-2016-06`, `year-2016-07`, `year-2016-08`, `year-2016-09`, `year-2017-01`, `year-2017-02`, `year-2017-03`, `year-2017-04`, `year-2017-05`, `year-2017-06`, `year-2017-07`, `year-2017-08`, `year-2017-09`, `year-2017-10`, `year-2018-01`, `year-2018-02`, `year-2018-03`, `year-2018-04`, `year-2018-05`, `year-2018-06`, `year-2018-07`, `year-2018-08`, `year-2018-09`, `year-2018-10`, `year-2018-11`, `year-2018-12`, `year-2018-13`, `year-2019-01`, `year-2019-02`, `year-2019-03`, `year-2019-04`, `year-2019-05`, `year-2019-06`, `year-2019-07`, `year-2019-08`, `year-2019-09`, `year-2019-10`, `year-2019-11`, `year-2019-12`, `year-2019-13`, `year-2019-14`, `year-2020-01`, `year-2020-02`, `year-2020-03`, `year-2020-04`, `year-2020-05`, `year-2020-06`, `year-2020-07`, `year-2020-08`, `year-2020-09`, `year-2021-01`, `year-2021-02`, `year-2021-03`, `year-2021-04`, `year-2021-05`, `year-2021-06`, `year-2022-01`, `year-2022-02`, `year-2022-03`, `year-2022-04`, `year-2022-05`, `year-2022-06`, `year-2022-07`, `year-2022-08`, `year-2022-09`, `year-2023-01`, `year-2023-02`, `year-2023-03`, `year-2023-04`, `year-2023-05`, `year-2023-06`, `year-2023-07`, `year-2023-08`, `year-2023-09`, `year-2024-01`, `year-2024-02`, `year-2024-03`, `year-2024-04`, `year-2024-05`, `year-2024-06`, `year-2024-07`, `year-2024-08`, `year-2024-09`, `year-2024-10`, `year-2024-11`, `year-2024-12`, `year-2024-13`, `year-2025-01`, `year-2025-02`, `year-2025-03`, `year-2025-04`, `year-2025-05`, `year-2025-06`, `year-2025-07`, `year-2025-08`, `year-2025-09`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `result-entry-year` | `year` | reference (required) {"target": {"providerId": "content-filesystem", "recordId": "result-year"}} | results-rows-year-2025 [filter]; results-rows-year-2024 [filter]; results-rows-year-2023 [filter]; results-rows-year-2022 [filter]; results-rows-year-2021 [filter]; results-rows-year-2020 [filter]; results-rows-year-2019 [filter]; results-rows-year-2018 [filter]; results-rows-year-2017 [filter]; results-rows-year-2016 [filter]; results-rows-year-2015 [filter] |
| `result-entry-school` | `school` | text (required) | results-rows-year-2025 / row.school (value); results-rows-year-2024 / row.school (value); results-rows-year-2023 / row.school (value); results-rows-year-2022 / row.school (value); results-rows-year-2021 / row.school (value); results-rows-year-2020 / row.school (value); results-rows-year-2019 / row.school (value); results-rows-year-2018 / row.school (value); results-rows-year-2017 / row.school (value); results-rows-year-2016 / row.school (value); results-rows-year-2015 / row.school (value) |
| `result-entry-department` | `department` | text (required) | results-rows-year-2025 / row.department (value); results-rows-year-2024 / row.department (value); results-rows-year-2023 / row.department (value); results-rows-year-2022 / row.department (value); results-rows-year-2021 / row.department (value); results-rows-year-2020 / row.department (value); results-rows-year-2019 / row.department (value); results-rows-year-2018 / row.department (value); results-rows-year-2017 / row.department (value); results-rows-year-2016 / row.department (value); results-rows-year-2015 / row.department (value) |
| `result-entry-url` | `url` | url (optional) | results-rows-year-2025 / row.url (value); results-rows-year-2024 / row.url (value); results-rows-year-2023 / row.url (value); results-rows-year-2022 / row.url (value); results-rows-year-2021 / row.url (value); results-rows-year-2020 / row.url (value); results-rows-year-2019 / row.url (value); results-rows-year-2018 / row.url (value); results-rows-year-2017 / row.url (value); results-rows-year-2016 / row.url (value); results-rows-year-2015 / row.url (value) |
| `result-entry-order` | `order` | number (required) | results-rows-year-2025 [sort]; results-rows-year-2024 [sort]; results-rows-year-2023 [sort]; results-rows-year-2022 [sort]; results-rows-year-2021 [sort]; results-rows-year-2020 [sort]; results-rows-year-2019 [sort]; results-rows-year-2018 [sort]; results-rows-year-2017 [sort]; results-rows-year-2016 [sort]; results-rows-year-2015 [sort] |

### home-result

Baseline kind: `collection`; entries: 6. IDs: `home-result-01`, `home-result-02`, `home-result-03`, `home-result-04`, `home-result-05`, `home-result-06`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `home-result-year-label` | `yearLabel` | text (required) | home-result-cards / card.yearLabel (value) |
| `home-result-school` | `school` | text (required) | home-result-cards / card.school (value) |
| `home-result-detail` | `detail` | text (required) | home-result-cards / card.detail (value) |
| `home-result-order` | `order` | number (required) | home-result-cards [sort] |

### testimonial

Baseline kind: `collection`; entries: 5. IDs: `student-01`, `student-02`, `student-03`, `student-04`, `student-05`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `testimonial-author` | `author` | text (required) | voices-index / link.author (value); voices-details / voice.author (value) |
| `testimonial-year-label` | `yearLabel` | text (required) | voices-details / voice.yearLabel (value) |
| `testimonial-school` | `school` | text (required) | voices-index / link.school (value); voices-details / voice.school (value) |
| `testimonial-department` | `department` | text (required) | voices-details / voice.department (value) |
| `testimonial-quote` | `quote` | long-text (required) | voices-details / voice.quote (value) |
| `testimonial-order` | `order` | number (required) | voices-index [sort]; voices-details [sort] |

### home-voice

Baseline kind: `collection`; entries: 3. IDs: `home-voice-01`, `home-voice-02`, `home-voice-03`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `home-voice-quote` | `quote` | long-text (required) | home-voice-cards / card.quote (value) |
| `home-voice-author` | `author` | text (required) | home-voice-cards / card.author (value) |
| `home-voice-school` | `school` | text (required) | home-voice-cards / card.school (value) |
| `home-voice-order` | `order` | number (required) | home-voice-cards [sort] |

### faq-group

Baseline kind: `collection`; entries: 4. IDs: `faq-exam`, `faq-fees`, `faq-german`, `faq-lessons`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `faq-group-title` | `title` | text (required) | faq-toc-faq-exam / item.label (value); faq-category-faq-exam / category.title (value); faq-toc-faq-lessons / item.label (value); faq-category-faq-lessons / category.title (value); faq-toc-faq-german / item.label (value); faq-category-faq-german / category.title (value); faq-toc-faq-fees / item.label (value); faq-category-faq-fees / category.title (value) |
| `faq-group-order` | `order` | number (required) | faq-toc-faq-exam [filter]; faq-category-faq-exam [filter]; faq-toc-faq-lessons [filter]; faq-category-faq-lessons [filter]; faq-toc-faq-german [filter]; faq-category-faq-german [filter]; faq-toc-faq-fees [filter]; faq-category-faq-fees [filter] |

### faq-item

Baseline kind: `collection`; entries: 18. IDs: `faq-exam-01`, `faq-exam-02`, `faq-exam-03`, `faq-exam-04`, `faq-exam-05`, `faq-exam-06`, `faq-exam-07`, `faq-fees-01`, `faq-fees-02`, `faq-fees-03`, `faq-german-01`, `faq-german-02`, `faq-german-03`, `faq-lessons-01`, `faq-lessons-02`, `faq-lessons-03`, `faq-lessons-04`, `faq-lessons-05`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `faq-item-group` | `group` | reference (required) {"target": {"providerId": "content-filesystem", "recordId": "faq-group"}} | faq-items-faq-exam [filter]; faq-items-faq-lessons [filter]; faq-items-faq-german [filter]; faq-items-faq-fees [filter] |
| `faq-item-question` | `question` | text (required) | faq-items-faq-exam / item.question (value); faq-items-faq-lessons / item.question (value); faq-items-faq-german / item.question (value); faq-items-faq-fees / item.question (value) |
| `faq-item-answer` | `answer` | long-text (required) | faq-items-faq-exam / item.answer (value); faq-items-faq-lessons / item.answer (value); faq-items-faq-german / item.answer (value); faq-items-faq-fees / item.answer (value) |
| `faq-item-order` | `order` | number (required) | faq-items-faq-exam [sort]; faq-items-faq-lessons [sort]; faq-items-faq-german [sort]; faq-items-faq-fees [sort] |

### home-faq

Baseline kind: `collection`; entries: 4. IDs: `home-faq-01`, `home-faq-02`, `home-faq-03`, `home-faq-04`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `home-faq-question` | `question` | text (required) | home-faq-items / item.question (value) |
| `home-faq-answer` | `answer` | long-text (required) | home-faq-items / item.answer (value) |
| `home-faq-order` | `order` | number (required) | home-faq-items [sort] |

### note

Baseline kind: `collection`; entries: 5. IDs: `exam-schedule`, `free-tuition`, `german-language`, `online-exam`, `what-is-mappe`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `note-slug` | `slug` | slug (required) | notes-index-cards / card.slug (value); note-all-notes / link.slug (value); note-all-notes [sort]; note-exam-schedule-heading / heading.slug (value); note-free-tuition-heading / heading.slug (value); note-german-language-heading / heading.slug (value); note-online-exam-heading / heading.slug (value); note-what-is-mappe-heading / heading.slug (value); Note metadata/route lookup |
| `note-title` | `title` | text (required) | notes-index-cards / card.title (value); note-all-notes / link.title (value); note-exam-schedule-crumb / breadcrumb.label (value); note-exam-schedule-heading / heading.title (value); note-free-tuition-crumb / breadcrumb.label (value); note-free-tuition-heading / heading.title (value); note-german-language-crumb / breadcrumb.label (value); note-german-language-heading / heading.title (value); note-online-exam-crumb / breadcrumb.label (value); note-online-exam-heading / heading.title (value); note-what-is-mappe-crumb / breadcrumb.label (value); note-what-is-mappe-heading / heading.title (value); Note document title |
| `note-description` | `description` | long-text (required) | notes-index-cards / card.description (value); note-exam-schedule-heading / heading.description (value); note-free-tuition-heading / heading.description (value); note-german-language-heading / heading.description (value); note-online-exam-heading / heading.description (value); note-what-is-mappe-heading / heading.description (value); Note document meta description |
| `note-body` | `body` | markdown (required) | note-exam-schedule-toc-items / items.markdown (value); note-exam-schedule-body / prose.markdown (value); note-free-tuition-toc-items / items.markdown (value); note-free-tuition-body / prose.markdown (value); note-german-language-toc-items / items.markdown (value); note-german-language-body / prose.markdown (value); note-online-exam-toc-items / items.markdown (value); note-online-exam-body / prose.markdown (value); note-what-is-mappe-toc-items / items.markdown (value); note-what-is-mappe-body / prose.markdown (value) |
| `note-order` | `order` | number (required) | notes-index-cards [sort]; note-exam-schedule-crumb [filter]; note-exam-schedule-heading [filter]; note-exam-schedule-toc-items [filter]; note-exam-schedule-body [filter]; note-free-tuition-crumb [filter]; note-free-tuition-heading [filter]; note-free-tuition-toc-items [filter]; note-free-tuition-body [filter]; note-german-language-crumb [filter]; note-german-language-heading [filter]; note-german-language-toc-items [filter]; note-german-language-body [filter]; note-online-exam-crumb [filter]; note-online-exam-heading [filter]; note-online-exam-toc-items [filter]; note-online-exam-body [filter]; note-what-is-mappe-crumb [filter]; note-what-is-mappe-heading [filter]; note-what-is-mappe-toc-items [filter]; note-what-is-mappe-body [filter] |

### knowledge-card

Baseline kind: `collection`; entries: 5. IDs: `card-exam-schedule`, `card-free-tuition`, `card-german-language`, `card-online-exam`, `card-what-is-mappe`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `knowledge-card-note` | `note` | reference (required) {"target": {"providerId": "content-filesystem", "recordId": "note"}} | lessons-knowledge-cards / card.slug (reference-id) |
| `knowledge-card-title` | `title` | text (required) | lessons-knowledge-cards / card.title (value) |
| `knowledge-card-description` | `description` | text (required) | lessons-knowledge-cards / card.description (value) |
| `knowledge-card-order` | `order` | number (required) | lessons-knowledge-cards [sort] |

### contact-step

Baseline kind: `collection`; entries: 5. IDs: `contact-step-01`, `contact-step-02`, `contact-step-03`, `contact-step-04`, `contact-step-05`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `contact-step-title` | `title` | text (required) | contact-steps / step.title (value) |
| `contact-step-description` | `description` | text (required) | contact-steps / step.description (value) |
| `contact-step-order` | `order` | number (required) | contact-steps [sort] |

### legal-row

Baseline kind: `collection`; entries: 8. IDs: `legal-row-01`, `legal-row-02`, `legal-row-03`, `legal-row-04`, `legal-row-05`, `legal-row-06`, `legal-row-07`, `legal-row-08`.

| Field ID (retained destination) | Key | Type / constraints | Current uses |
| --- | --- | --- | --- |
| `legal-row-key` | `key` | text (required) | contact-legal-rows / row.term (value) |
| `legal-row-value` | `value` | text (required) | contact-legal-rows / row.value (value) |
| `legal-row-order` | `order` | number (required) | contact-legal-rows [sort] |

## Content reference edges

All qualified Content reference values follow. Every source field remains live; a presentation copy must not replace it. The target triples must resolve after any provider relocation.

| Source model/entry | Field | Target provider:model:record |
| --- | --- | --- |
| `faq-item/faq-exam-01` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-02` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-03` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-04` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-05` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-06` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-exam-07` | `faq-item-group` | `content-filesystem:faq-group:faq-exam` |
| `faq-item/faq-fees-01` | `faq-item-group` | `content-filesystem:faq-group:faq-fees` |
| `faq-item/faq-fees-02` | `faq-item-group` | `content-filesystem:faq-group:faq-fees` |
| `faq-item/faq-fees-03` | `faq-item-group` | `content-filesystem:faq-group:faq-fees` |
| `faq-item/faq-german-01` | `faq-item-group` | `content-filesystem:faq-group:faq-german` |
| `faq-item/faq-german-02` | `faq-item-group` | `content-filesystem:faq-group:faq-german` |
| `faq-item/faq-german-03` | `faq-item-group` | `content-filesystem:faq-group:faq-german` |
| `faq-item/faq-lessons-01` | `faq-item-group` | `content-filesystem:faq-group:faq-lessons` |
| `faq-item/faq-lessons-02` | `faq-item-group` | `content-filesystem:faq-group:faq-lessons` |
| `faq-item/faq-lessons-03` | `faq-item-group` | `content-filesystem:faq-group:faq-lessons` |
| `faq-item/faq-lessons-04` | `faq-item-group` | `content-filesystem:faq-group:faq-lessons` |
| `faq-item/faq-lessons-05` | `faq-item-group` | `content-filesystem:faq-group:faq-lessons` |
| `knowledge-card/card-exam-schedule` | `knowledge-card-note` | `content-filesystem:note:exam-schedule` |
| `knowledge-card/card-free-tuition` | `knowledge-card-note` | `content-filesystem:note:free-tuition` |
| `knowledge-card/card-german-language` | `knowledge-card-note` | `content-filesystem:note:german-language` |
| `knowledge-card/card-online-exam` | `knowledge-card-note` | `content-filesystem:note:online-exam` |
| `knowledge-card/card-what-is-mappe` | `knowledge-card-note` | `content-filesystem:note:what-is-mappe` |
| `result-entry/year-2015-01` | `result-entry-year` | `content-filesystem:result-year:year-2015` |
| `result-entry/year-2015-02` | `result-entry-year` | `content-filesystem:result-year:year-2015` |
| `result-entry/year-2015-03` | `result-entry-year` | `content-filesystem:result-year:year-2015` |
| `result-entry/year-2015-04` | `result-entry-year` | `content-filesystem:result-year:year-2015` |
| `result-entry/year-2016-01` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-02` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-03` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-04` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-05` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-06` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-07` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-08` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2016-09` | `result-entry-year` | `content-filesystem:result-year:year-2016` |
| `result-entry/year-2017-01` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-02` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-03` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-04` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-05` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-06` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-07` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-08` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-09` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2017-10` | `result-entry-year` | `content-filesystem:result-year:year-2017` |
| `result-entry/year-2018-01` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-02` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-03` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-04` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-05` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-06` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-07` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-08` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-09` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-10` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-11` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-12` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2018-13` | `result-entry-year` | `content-filesystem:result-year:year-2018` |
| `result-entry/year-2019-01` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-02` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-03` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-04` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-05` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-06` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-07` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-08` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-09` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-10` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-11` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-12` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-13` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2019-14` | `result-entry-year` | `content-filesystem:result-year:year-2019` |
| `result-entry/year-2020-01` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-02` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-03` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-04` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-05` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-06` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-07` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-08` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2020-09` | `result-entry-year` | `content-filesystem:result-year:year-2020` |
| `result-entry/year-2021-01` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2021-02` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2021-03` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2021-04` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2021-05` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2021-06` | `result-entry-year` | `content-filesystem:result-year:year-2021` |
| `result-entry/year-2022-01` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-02` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-03` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-04` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-05` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-06` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-07` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-08` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2022-09` | `result-entry-year` | `content-filesystem:result-year:year-2022` |
| `result-entry/year-2023-01` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-02` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-03` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-04` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-05` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-06` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-07` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-08` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2023-09` | `result-entry-year` | `content-filesystem:result-year:year-2023` |
| `result-entry/year-2024-01` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-02` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-03` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-04` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-05` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-06` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-07` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-08` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-09` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-10` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-11` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-12` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2024-13` | `result-entry-year` | `content-filesystem:result-year:year-2024` |
| `result-entry/year-2025-01` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-02` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-03` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-04` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-05` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-06` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-07` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-08` | `result-entry-year` | `content-filesystem:result-year:year-2025` |
| `result-entry/year-2025-09` | `result-entry-year` | `content-filesystem:result-year:year-2025` |

## Mapping selectors and composition sources

Each Mapping’s source Composition is retained as an internal rendering record unless it is explicitly listed as a Sitemap page below. Query JSON includes pins, filters, publication and order so an identity-preserving replacement cannot silently change membership.

| Mapping record | Content model | Composition source | Mode / query |
| --- | --- | --- | --- |
| `nav-item-nav-lessons` | `content-filesystem:nav-link` | `files:nav-item-nav-lessons` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-lessons"}],"limit":1}}` |
| `nav-item-nav-about` | `content-filesystem:nav-link` | `files:nav-item-nav-about` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-about"}],"limit":1}}` |
| `nav-item-nav-results` | `content-filesystem:nav-link` | `files:nav-item-nav-results` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-results"}],"limit":1}}` |
| `nav-item-nav-voices` | `content-filesystem:nav-link` | `files:nav-item-nav-voices` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-voices"}],"limit":1}}` |
| `nav-item-nav-notes` | `content-filesystem:nav-link` | `files:nav-item-nav-notes` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-notes"}],"limit":1}}` |
| `nav-item-nav-faq` | `content-filesystem:nav-link` | `files:nav-item-nav-faq` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"nav-link-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"nav-link","recordId":"nav-faq"}],"limit":1}}` |
| `frame-header` | `content-filesystem:site-copy` | `files:frame-header` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `frame-footer-nav` | `content-filesystem:nav-link` | `files:frame-footer-nav` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"nav-link-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `frame-footer` | `content-filesystem:site-copy` | `files:frame-footer` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `instructor-detail-link` | `content-filesystem:site-copy` | `files:instructor-detail-link` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-hero` | `content-filesystem:site-copy` | `files:home-hero` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-hero-meta` | `content-filesystem:site-copy` | `files:home-hero-meta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-for-you` | `content-filesystem:site-copy` | `files:home-for-you` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `target-items-home` | `content-filesystem:target-item` | `files:target-items-home` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"target-item-page","operator":"equals","value":"home"}],"sort":[{"fieldId":"target-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `home-pricing-cards` | `content-filesystem:course` | `files:home-pricing-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"course-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `home-pricing` | `content-filesystem:site-copy` | `files:home-pricing` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-instructor-profile` | `content-filesystem:instructor-profile` | `files:home-instructor-profile` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-instructor` | `content-filesystem:site-copy` | `files:home-instructor` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-results` | `content-filesystem:site-copy` | `files:home-results` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-result-cards` | `content-filesystem:home-result` | `files:home-result-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"home-result-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `home-voices` | `content-filesystem:site-copy` | `files:home-voices` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-voice-cards` | `content-filesystem:home-voice` | `files:home-voice-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"home-voice-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `home-faq` | `content-filesystem:site-copy` | `files:home-faq` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `home-faq-items` | `content-filesystem:home-faq` | `files:home-faq-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"home-faq-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-home-cta-subcopy` | `content-filesystem:page-copy` | `files:page-home-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-home-cta` | `content-filesystem:site-copy` | `files:page-home-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-toc` | `content-filesystem:lessons-copy` | `files:lessons-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-for-you` | `content-filesystem:lessons-copy` | `files:lessons-for-you` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `target-items-lessons` | `content-filesystem:target-item` | `files:target-items-lessons` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"target-item-page","operator":"equals","value":"lessons"}],"sort":[{"fieldId":"target-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-course` | `content-filesystem:lessons-copy` | `files:lessons-course` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-course-steps` | `content-filesystem:course-step` | `files:lessons-course-steps` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"course-step-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-pricing` | `content-filesystem:lessons-copy` | `files:lessons-pricing` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-price-cards` | `content-filesystem:course` | `files:lessons-price-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"course-order","operator":"not-equals","value":1}],"sort":[{"fieldId":"course-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-consultation` | `content-filesystem:lessons-copy` | `files:lessons-consultation` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-consultation-course` | `content-filesystem:course` | `files:lessons-consultation-course` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"course-order","operator":"equals","value":1}],"sort":[{"fieldId":"course-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-instructor-profile` | `content-filesystem:instructor-profile` | `files:lessons-instructor-profile` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-instructor` | `content-filesystem:lessons-copy` | `files:lessons-instructor` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `timeline-lessons-career` | `content-filesystem:timeline-entry` | `files:timeline-lessons-career` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"timeline-entry-timeline","operator":"equals","value":"lessons-career"}],"sort":[{"fieldId":"timeline-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-specializations` | `content-filesystem:lessons-copy` | `files:lessons-specializations` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-specialization-items` | `content-filesystem:specialization` | `files:lessons-specialization-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"specialization-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `lessons-graduates` | `content-filesystem:lessons-copy` | `files:lessons-graduates` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-knowledge` | `content-filesystem:lessons-copy` | `files:lessons-knowledge` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `lessons-knowledge-cards` | `content-filesystem:knowledge-card` | `files:lessons-knowledge-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"knowledge-card-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-lessons-head` | `content-filesystem:page-copy` | `files:page-lessons-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/lessons/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-lessons-cta-subcopy` | `content-filesystem:page-copy` | `files:page-lessons-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/lessons/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-lessons-cta` | `content-filesystem:site-copy` | `files:page-lessons-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-instructor-identity` | `content-filesystem:about-copy` | `files:about-instructor-identity` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-profile` | `content-filesystem:instructor-profile` | `files:about-profile` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-cv` | `content-filesystem:about-copy` | `files:about-cv` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `timeline-about-career` | `content-filesystem:timeline-entry` | `files:timeline-about-career` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"timeline-entry-timeline","operator":"equals","value":"about-career"}],"sort":[{"fieldId":"timeline-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `timeline-about-education` | `content-filesystem:timeline-entry` | `files:timeline-about-education` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"timeline-entry-timeline","operator":"equals","value":"about-education"}],"sort":[{"fieldId":"timeline-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `about-message-body` | `content-filesystem:instructor-profile` | `files:about-message-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-message` | `content-filesystem:about-copy` | `files:about-message` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-features` | `content-filesystem:about-copy` | `files:about-features` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `about-feature-cards` | `content-filesystem:feature-card` | `files:about-feature-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"feature-card-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-about-head` | `content-filesystem:page-copy` | `files:page-about-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/about/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-about-cta-subcopy` | `content-filesystem:page-copy` | `files:page-about-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/about/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-about-cta` | `content-filesystem:site-copy` | `files:page-about-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `results-stats` | `content-filesystem:site-copy` | `files:results-stats` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `page-results-head` | `content-filesystem:page-copy` | `files:page-results-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/results/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-toc` | `content-filesystem:page-copy` | `files:results-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/results/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-toc-year-2025` | `content-filesystem:result-year` | `files:results-toc-year-2025` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2025"}],"limit":1}}` |
| `results-rows-year-2025` | `content-filesystem:result-entry` | `files:results-rows-year-2025` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2025"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2025` | `content-filesystem:result-year` | `files:results-year-year-2025` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2025"}],"limit":1}}` |
| `results-toc-year-2024` | `content-filesystem:result-year` | `files:results-toc-year-2024` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2024"}],"limit":1}}` |
| `results-rows-year-2024` | `content-filesystem:result-entry` | `files:results-rows-year-2024` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2024"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2024` | `content-filesystem:result-year` | `files:results-year-year-2024` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2024"}],"limit":1}}` |
| `results-toc-year-2023` | `content-filesystem:result-year` | `files:results-toc-year-2023` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2023"}],"limit":1}}` |
| `results-rows-year-2023` | `content-filesystem:result-entry` | `files:results-rows-year-2023` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2023"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2023` | `content-filesystem:result-year` | `files:results-year-year-2023` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2023"}],"limit":1}}` |
| `results-toc-year-2022` | `content-filesystem:result-year` | `files:results-toc-year-2022` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2022"}],"limit":1}}` |
| `results-rows-year-2022` | `content-filesystem:result-entry` | `files:results-rows-year-2022` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2022"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2022` | `content-filesystem:result-year` | `files:results-year-year-2022` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2022"}],"limit":1}}` |
| `results-toc-year-2021` | `content-filesystem:result-year` | `files:results-toc-year-2021` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2021"}],"limit":1}}` |
| `results-rows-year-2021` | `content-filesystem:result-entry` | `files:results-rows-year-2021` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2021"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2021` | `content-filesystem:result-year` | `files:results-year-year-2021` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2021"}],"limit":1}}` |
| `results-toc-year-2020` | `content-filesystem:result-year` | `files:results-toc-year-2020` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2020"}],"limit":1}}` |
| `results-rows-year-2020` | `content-filesystem:result-entry` | `files:results-rows-year-2020` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2020"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2020` | `content-filesystem:result-year` | `files:results-year-year-2020` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2020"}],"limit":1}}` |
| `results-toc-year-2019` | `content-filesystem:result-year` | `files:results-toc-year-2019` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2019"}],"limit":1}}` |
| `results-rows-year-2019` | `content-filesystem:result-entry` | `files:results-rows-year-2019` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2019"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2019` | `content-filesystem:result-year` | `files:results-year-year-2019` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2019"}],"limit":1}}` |
| `results-toc-year-2018` | `content-filesystem:result-year` | `files:results-toc-year-2018` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2018"}],"limit":1}}` |
| `results-rows-year-2018` | `content-filesystem:result-entry` | `files:results-rows-year-2018` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2018"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2018` | `content-filesystem:result-year` | `files:results-year-year-2018` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2018"}],"limit":1}}` |
| `results-toc-year-2017` | `content-filesystem:result-year` | `files:results-toc-year-2017` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2017"}],"limit":1}}` |
| `results-rows-year-2017` | `content-filesystem:result-entry` | `files:results-rows-year-2017` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2017"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2017` | `content-filesystem:result-year` | `files:results-year-year-2017` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2017"}],"limit":1}}` |
| `results-toc-year-2016` | `content-filesystem:result-year` | `files:results-toc-year-2016` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2016"}],"limit":1}}` |
| `results-rows-year-2016` | `content-filesystem:result-entry` | `files:results-rows-year-2016` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2016"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2016` | `content-filesystem:result-year` | `files:results-year-year-2016` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2016"}],"limit":1}}` |
| `results-toc-year-2015` | `content-filesystem:result-year` | `files:results-toc-year-2015` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2015"}],"limit":1}}` |
| `results-rows-year-2015` | `content-filesystem:result-entry` | `files:results-rows-year-2015` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-entry-year","operator":"equals","value":{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2015"}}],"sort":[{"fieldId":"result-entry-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `results-year-year-2015` | `content-filesystem:result-year` | `files:results-year-year-2015` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"result-year-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"result-year","recordId":"year-2015"}],"limit":1}}` |
| `page-results-cta-subcopy` | `content-filesystem:page-copy` | `files:page-results-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/results/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-results-cta` | `content-filesystem:site-copy` | `files:page-results-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `page-voices-head` | `content-filesystem:page-copy` | `files:page-voices-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/voices/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `voices-index` | `content-filesystem:testimonial` | `files:voices-index` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"testimonial-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `voices-details` | `content-filesystem:testimonial` | `files:voices-details` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"testimonial-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-voices-cta-subcopy` | `content-filesystem:page-copy` | `files:page-voices-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/voices/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-voices-cta` | `content-filesystem:site-copy` | `files:page-voices-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `faq-toc` | `content-filesystem:page-copy` | `files:faq-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/faq/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `faq-toc-faq-exam` | `content-filesystem:faq-group` | `files:faq-toc-faq-exam` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-exam"}],"limit":1}}` |
| `faq-items-faq-exam` | `content-filesystem:faq-item` | `files:faq-items-faq-exam` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-item-group","operator":"equals","value":{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-exam"}}],"sort":[{"fieldId":"faq-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `faq-category-faq-exam` | `content-filesystem:faq-group` | `files:faq-category-faq-exam` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-exam"}],"limit":1}}` |
| `faq-toc-faq-lessons` | `content-filesystem:faq-group` | `files:faq-toc-faq-lessons` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-lessons"}],"limit":1}}` |
| `faq-items-faq-lessons` | `content-filesystem:faq-item` | `files:faq-items-faq-lessons` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-item-group","operator":"equals","value":{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-lessons"}}],"sort":[{"fieldId":"faq-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `faq-category-faq-lessons` | `content-filesystem:faq-group` | `files:faq-category-faq-lessons` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-lessons"}],"limit":1}}` |
| `faq-toc-faq-german` | `content-filesystem:faq-group` | `files:faq-toc-faq-german` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-german"}],"limit":1}}` |
| `faq-items-faq-german` | `content-filesystem:faq-item` | `files:faq-items-faq-german` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-item-group","operator":"equals","value":{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-german"}}],"sort":[{"fieldId":"faq-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `faq-category-faq-german` | `content-filesystem:faq-group` | `files:faq-category-faq-german` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-german"}],"limit":1}}` |
| `faq-toc-faq-fees` | `content-filesystem:faq-group` | `files:faq-toc-faq-fees` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-fees"}],"limit":1}}` |
| `faq-items-faq-fees` | `content-filesystem:faq-item` | `files:faq-items-faq-fees` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-item-group","operator":"equals","value":{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-fees"}}],"sort":[{"fieldId":"faq-item-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `faq-category-faq-fees` | `content-filesystem:faq-group` | `files:faq-category-faq-fees` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"faq-group-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"faq-group","recordId":"faq-fees"}],"limit":1}}` |
| `page-faq-head` | `content-filesystem:page-copy` | `files:page-faq-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/faq/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-faq-cta-subcopy` | `content-filesystem:page-copy` | `files:page-faq-cta-subcopy` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/faq/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-faq-cta` | `content-filesystem:site-copy` | `files:page-faq-cta` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `notes-head` | `content-filesystem:site-copy` | `files:notes-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `notes-index-cards` | `content-filesystem:note` | `files:notes-index-cards` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"note-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `note-all-notes` | `content-filesystem:note` | `files:note-all-notes` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"note-slug","direction":"asc"}],"pins":[],"limit":1000}}` |
| `note-exam-schedule-crumb` | `content-filesystem:note` | `files:note-exam-schedule-crumb` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"exam-schedule"}],"limit":1}}` |
| `note-exam-schedule-eyebrow` | `content-filesystem:site-copy` | `files:note-exam-schedule-eyebrow` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-exam-schedule-heading` | `content-filesystem:note` | `files:note-exam-schedule-heading` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"exam-schedule"}],"limit":1}}` |
| `note-exam-schedule-toc-items` | `content-filesystem:note` | `files:note-exam-schedule-toc-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"exam-schedule"}],"limit":1}}` |
| `note-exam-schedule-toc` | `content-filesystem:site-copy` | `files:note-exam-schedule-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-exam-schedule-body` | `content-filesystem:note` | `files:note-exam-schedule-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"exam-schedule"}],"limit":1}}` |
| `note-exam-schedule-related` | `content-filesystem:site-copy` | `files:note-exam-schedule-related` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-free-tuition-crumb` | `content-filesystem:note` | `files:note-free-tuition-crumb` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"free-tuition"}],"limit":1}}` |
| `note-free-tuition-eyebrow` | `content-filesystem:site-copy` | `files:note-free-tuition-eyebrow` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-free-tuition-heading` | `content-filesystem:note` | `files:note-free-tuition-heading` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"free-tuition"}],"limit":1}}` |
| `note-free-tuition-toc-items` | `content-filesystem:note` | `files:note-free-tuition-toc-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"free-tuition"}],"limit":1}}` |
| `note-free-tuition-toc` | `content-filesystem:site-copy` | `files:note-free-tuition-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-free-tuition-body` | `content-filesystem:note` | `files:note-free-tuition-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"free-tuition"}],"limit":1}}` |
| `note-free-tuition-related` | `content-filesystem:site-copy` | `files:note-free-tuition-related` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-german-language-crumb` | `content-filesystem:note` | `files:note-german-language-crumb` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"german-language"}],"limit":1}}` |
| `note-german-language-eyebrow` | `content-filesystem:site-copy` | `files:note-german-language-eyebrow` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-german-language-heading` | `content-filesystem:note` | `files:note-german-language-heading` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"german-language"}],"limit":1}}` |
| `note-german-language-toc-items` | `content-filesystem:note` | `files:note-german-language-toc-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"german-language"}],"limit":1}}` |
| `note-german-language-toc` | `content-filesystem:site-copy` | `files:note-german-language-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-german-language-body` | `content-filesystem:note` | `files:note-german-language-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"german-language"}],"limit":1}}` |
| `note-german-language-related` | `content-filesystem:site-copy` | `files:note-german-language-related` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-online-exam-crumb` | `content-filesystem:note` | `files:note-online-exam-crumb` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"online-exam"}],"limit":1}}` |
| `note-online-exam-eyebrow` | `content-filesystem:site-copy` | `files:note-online-exam-eyebrow` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-online-exam-heading` | `content-filesystem:note` | `files:note-online-exam-heading` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"online-exam"}],"limit":1}}` |
| `note-online-exam-toc-items` | `content-filesystem:note` | `files:note-online-exam-toc-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"online-exam"}],"limit":1}}` |
| `note-online-exam-toc` | `content-filesystem:site-copy` | `files:note-online-exam-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-online-exam-body` | `content-filesystem:note` | `files:note-online-exam-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"online-exam"}],"limit":1}}` |
| `note-online-exam-related` | `content-filesystem:site-copy` | `files:note-online-exam-related` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-what-is-mappe-crumb` | `content-filesystem:note` | `files:note-what-is-mappe-crumb` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"what-is-mappe"}],"limit":1}}` |
| `note-what-is-mappe-eyebrow` | `content-filesystem:site-copy` | `files:note-what-is-mappe-eyebrow` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-what-is-mappe-heading` | `content-filesystem:note` | `files:note-what-is-mappe-heading` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"what-is-mappe"}],"limit":1}}` |
| `note-what-is-mappe-toc-items` | `content-filesystem:note` | `files:note-what-is-mappe-toc-items` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"what-is-mappe"}],"limit":1}}` |
| `note-what-is-mappe-toc` | `content-filesystem:site-copy` | `files:note-what-is-mappe-toc` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `note-what-is-mappe-body` | `content-filesystem:note` | `files:note-what-is-mappe-body` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"note-order","operator":"equals","value":-1}],"sort":[],"pins":[{"providerId":"content-filesystem","modelId":"note","recordId":"what-is-mappe"}],"limit":1}}` |
| `note-what-is-mappe-related` | `content-filesystem:site-copy` | `files:note-what-is-mappe-related` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `contact-aside` | `content-filesystem:contact-copy` | `files:contact-aside` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `contact-steps` | `content-filesystem:contact-step` | `files:contact-steps` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"contact-step-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `contact-form` | `content-filesystem:contact-copy` | `files:contact-form` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `contact-course-options` | `content-filesystem:course` | `files:contact-course-options` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"course-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `contact-legal` | `content-filesystem:contact-copy` | `files:contact-legal` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |
| `contact-legal-rows` | `content-filesystem:legal-row` | `files:contact-legal-rows` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[{"fieldId":"legal-row-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `page-contact-head` | `content-filesystem:page-copy` | `files:page-contact-head` | `{"kind":"collection","query":{"publication":"published-only","conditions":[{"fieldId":"page-copy-route","operator":"equals","value":"/contact/"}],"sort":[{"fieldId":"page-copy-order","direction":"asc"}],"pins":[],"limit":1000}}` |
| `not-found-block` | `content-filesystem:site-copy` | `files:not-found-block` | `{"kind":"collection","query":{"publication":"published-only","conditions":[],"sort":[],"pins":[],"limit":1}}` |

## Structural reference edges

Each row is one ordered Mapping attachment. These edges are parent-owned arrangements; Content edits must not rewrite them. Local node IDs are scoped by their Composition.

| Attachment ID | Parent provider:record / node.slot | Mapping provider:record | Order |
| --- | --- | --- | --- |
| `frame-header--nav-1` | `files:frame-header / nav-1.items` | `mapping-filesystem:nav-item-nav-lessons` | 0 |
| `frame-header--nav-2` | `files:frame-header / nav-2.items` | `mapping-filesystem:nav-item-nav-about` | 1 |
| `frame-header--nav-3` | `files:frame-header / nav-3.items` | `mapping-filesystem:nav-item-nav-results` | 2 |
| `frame-header--nav-4` | `files:frame-header / nav-4.items` | `mapping-filesystem:nav-item-nav-voices` | 3 |
| `frame-header--nav-5` | `files:frame-header / nav-5.items` | `mapping-filesystem:nav-item-nav-notes` | 4 |
| `frame-header--nav-6` | `files:frame-header / nav-6.items` | `mapping-filesystem:nav-item-nav-faq` | 5 |
| `frame-footer--footer--nav` | `files:frame-footer / footer.nav` | `mapping-filesystem:frame-footer-nav` | 6 |
| `home-for-you--list` | `files:home-for-you / list.items` | `mapping-filesystem:target-items-home` | 7 |
| `home-pricing--cards` | `files:home-pricing / cards.items` | `mapping-filesystem:home-pricing-cards` | 8 |
| `home-instructor-profile--detail` | `files:home-instructor-profile / detail.items` | `mapping-filesystem:instructor-detail-link` | 9 |
| `home-instructor--profile` | `files:home-instructor / profile.items` | `mapping-filesystem:home-instructor-profile` | 10 |
| `home-results--list` | `files:home-results / list.items` | `mapping-filesystem:home-result-cards` | 11 |
| `home-voices--list` | `files:home-voices / list.items` | `mapping-filesystem:home-voice-cards` | 12 |
| `home-faq--list` | `files:home-faq / list.items` | `mapping-filesystem:home-faq-items` | 13 |
| `page-home-cta--cta--subcopy` | `files:page-home-cta / cta.subcopy` | `mapping-filesystem:page-home-cta-subcopy` | 14 |
| `home--frame--header` | `files:home / frame.header` | `mapping-filesystem:frame-header` | 15 |
| `home--frame--footer` | `files:home / frame.footer` | `mapping-filesystem:frame-footer` | 16 |
| `home--hero` | `files:home / hero.items` | `mapping-filesystem:home-hero` | 17 |
| `home--hero-meta` | `files:home / hero-meta.items` | `mapping-filesystem:home-hero-meta` | 18 |
| `home--for-you` | `files:home / for-you.items` | `mapping-filesystem:home-for-you` | 19 |
| `home--pricing` | `files:home / pricing.items` | `mapping-filesystem:home-pricing` | 20 |
| `home--instructor` | `files:home / instructor.items` | `mapping-filesystem:home-instructor` | 21 |
| `home--results` | `files:home / results.items` | `mapping-filesystem:home-results` | 22 |
| `home--voices` | `files:home / voices.items` | `mapping-filesystem:home-voices` | 23 |
| `home--faq` | `files:home / faq.items` | `mapping-filesystem:home-faq` | 24 |
| `home--cta` | `files:home / cta.items` | `mapping-filesystem:page-home-cta` | 25 |
| `lessons-for-you--list` | `files:lessons-for-you / list.items` | `mapping-filesystem:target-items-lessons` | 26 |
| `lessons-course--steps` | `files:lessons-course / steps.items` | `mapping-filesystem:lessons-course-steps` | 27 |
| `lessons-pricing--detail` | `files:lessons-pricing / detail.items` | `mapping-filesystem:lessons-price-cards` | 28 |
| `lessons-consultation--intro--course` | `files:lessons-consultation / intro.course` | `mapping-filesystem:lessons-consultation-course` | 29 |
| `lessons-instructor-profile--detail` | `files:lessons-instructor-profile / detail.items` | `mapping-filesystem:instructor-detail-link` | 30 |
| `lessons-instructor--profile` | `files:lessons-instructor / profile.items` | `mapping-filesystem:lessons-instructor-profile` | 31 |
| `lessons-instructor--career` | `files:lessons-instructor / career.items` | `mapping-filesystem:timeline-lessons-career` | 32 |
| `lessons-specializations--grid` | `files:lessons-specializations / grid.items` | `mapping-filesystem:lessons-specialization-items` | 33 |
| `lessons-knowledge--cards` | `files:lessons-knowledge / cards.items` | `mapping-filesystem:lessons-knowledge-cards` | 34 |
| `lessons--frame--header` | `files:lessons / frame.header` | `mapping-filesystem:frame-header` | 35 |
| `lessons--frame--footer` | `files:lessons / frame.footer` | `mapping-filesystem:frame-footer` | 36 |
| `page-lessons-cta--cta--subcopy` | `files:page-lessons-cta / cta.subcopy` | `mapping-filesystem:page-lessons-cta-subcopy` | 37 |
| `lessons--head` | `files:lessons / head.items` | `mapping-filesystem:page-lessons-head` | 38 |
| `lessons--toc` | `files:lessons / toc.items` | `mapping-filesystem:lessons-toc` | 39 |
| `lessons--for-you` | `files:lessons / for-you.items` | `mapping-filesystem:lessons-for-you` | 40 |
| `lessons--course` | `files:lessons / course.items` | `mapping-filesystem:lessons-course` | 41 |
| `lessons--pricing` | `files:lessons / pricing.items` | `mapping-filesystem:lessons-pricing` | 42 |
| `lessons--consultation` | `files:lessons / consultation.items` | `mapping-filesystem:lessons-consultation` | 43 |
| `lessons--instructor` | `files:lessons / instructor.items` | `mapping-filesystem:lessons-instructor` | 44 |
| `lessons--specializations` | `files:lessons / specializations.items` | `mapping-filesystem:lessons-specializations` | 45 |
| `lessons--graduates` | `files:lessons / graduates.items` | `mapping-filesystem:lessons-graduates` | 46 |
| `lessons--knowledge` | `files:lessons / knowledge.items` | `mapping-filesystem:lessons-knowledge` | 47 |
| `lessons--cta` | `files:lessons / cta.items` | `mapping-filesystem:page-lessons-cta` | 48 |
| `about-profile--identity` | `files:about-profile / identity.items` | `mapping-filesystem:about-instructor-identity` | 49 |
| `about-cv--cv--career` | `files:about-cv / cv.career` | `mapping-filesystem:timeline-about-career` | 50 |
| `about-cv--cv--education` | `files:about-cv / cv.education` | `mapping-filesystem:timeline-about-education` | 51 |
| `about-message--body` | `files:about-message / body.items` | `mapping-filesystem:about-message-body` | 52 |
| `about-features--grid` | `files:about-features / grid.items` | `mapping-filesystem:about-feature-cards` | 53 |
| `about--frame--header` | `files:about / frame.header` | `mapping-filesystem:frame-header` | 54 |
| `about--frame--footer` | `files:about / frame.footer` | `mapping-filesystem:frame-footer` | 55 |
| `page-about-cta--cta--subcopy` | `files:page-about-cta / cta.subcopy` | `mapping-filesystem:page-about-cta-subcopy` | 56 |
| `about--head` | `files:about / head.items` | `mapping-filesystem:page-about-head` | 57 |
| `about--profile` | `files:about / profile.items` | `mapping-filesystem:about-profile` | 58 |
| `about--cv` | `files:about / cv.items` | `mapping-filesystem:about-cv` | 59 |
| `about--message` | `files:about / message.items` | `mapping-filesystem:about-message` | 60 |
| `about--features` | `files:about / features.items` | `mapping-filesystem:about-features` | 61 |
| `about--cta` | `files:about / cta.items` | `mapping-filesystem:page-about-cta` | 62 |
| `page-results-head--after` | `files:page-results-head / after.items` | `mapping-filesystem:results-stats` | 63 |
| `results-toc--toc-year-2025` | `files:results-toc / toc-year-2025.items` | `mapping-filesystem:results-toc-year-2025` | 64 |
| `results-year-year-2025--section` | `files:results-year-year-2025 / section.items` | `mapping-filesystem:results-rows-year-2025` | 65 |
| `results-toc--toc-year-2024` | `files:results-toc / toc-year-2024.items` | `mapping-filesystem:results-toc-year-2024` | 66 |
| `results-year-year-2024--section` | `files:results-year-year-2024 / section.items` | `mapping-filesystem:results-rows-year-2024` | 67 |
| `results-toc--toc-year-2023` | `files:results-toc / toc-year-2023.items` | `mapping-filesystem:results-toc-year-2023` | 68 |
| `results-year-year-2023--section` | `files:results-year-year-2023 / section.items` | `mapping-filesystem:results-rows-year-2023` | 69 |
| `results-toc--toc-year-2022` | `files:results-toc / toc-year-2022.items` | `mapping-filesystem:results-toc-year-2022` | 70 |
| `results-year-year-2022--section` | `files:results-year-year-2022 / section.items` | `mapping-filesystem:results-rows-year-2022` | 71 |
| `results-toc--toc-year-2021` | `files:results-toc / toc-year-2021.items` | `mapping-filesystem:results-toc-year-2021` | 72 |
| `results-year-year-2021--section` | `files:results-year-year-2021 / section.items` | `mapping-filesystem:results-rows-year-2021` | 73 |
| `results-toc--toc-year-2020` | `files:results-toc / toc-year-2020.items` | `mapping-filesystem:results-toc-year-2020` | 74 |
| `results-year-year-2020--section` | `files:results-year-year-2020 / section.items` | `mapping-filesystem:results-rows-year-2020` | 75 |
| `results-toc--toc-year-2019` | `files:results-toc / toc-year-2019.items` | `mapping-filesystem:results-toc-year-2019` | 76 |
| `results-year-year-2019--section` | `files:results-year-year-2019 / section.items` | `mapping-filesystem:results-rows-year-2019` | 77 |
| `results-toc--toc-year-2018` | `files:results-toc / toc-year-2018.items` | `mapping-filesystem:results-toc-year-2018` | 78 |
| `results-year-year-2018--section` | `files:results-year-year-2018 / section.items` | `mapping-filesystem:results-rows-year-2018` | 79 |
| `results-toc--toc-year-2017` | `files:results-toc / toc-year-2017.items` | `mapping-filesystem:results-toc-year-2017` | 80 |
| `results-year-year-2017--section` | `files:results-year-year-2017 / section.items` | `mapping-filesystem:results-rows-year-2017` | 81 |
| `results-toc--toc-year-2016` | `files:results-toc / toc-year-2016.items` | `mapping-filesystem:results-toc-year-2016` | 82 |
| `results-year-year-2016--section` | `files:results-year-year-2016 / section.items` | `mapping-filesystem:results-rows-year-2016` | 83 |
| `results-toc--toc-year-2015` | `files:results-toc / toc-year-2015.items` | `mapping-filesystem:results-toc-year-2015` | 84 |
| `results-year-year-2015--section` | `files:results-year-year-2015 / section.items` | `mapping-filesystem:results-rows-year-2015` | 85 |
| `results--frame--header` | `files:results / frame.header` | `mapping-filesystem:frame-header` | 86 |
| `results--frame--footer` | `files:results / frame.footer` | `mapping-filesystem:frame-footer` | 87 |
| `results--head` | `files:results / head.items` | `mapping-filesystem:page-results-head` | 88 |
| `results--toc` | `files:results / toc.items` | `mapping-filesystem:results-toc` | 89 |
| `results--year-year-2025` | `files:results / year-year-2025.items` | `mapping-filesystem:results-year-year-2025` | 90 |
| `results--year-year-2024` | `files:results / year-year-2024.items` | `mapping-filesystem:results-year-year-2024` | 91 |
| `results--year-year-2023` | `files:results / year-year-2023.items` | `mapping-filesystem:results-year-year-2023` | 92 |
| `results--year-year-2022` | `files:results / year-year-2022.items` | `mapping-filesystem:results-year-year-2022` | 93 |
| `results--year-year-2021` | `files:results / year-year-2021.items` | `mapping-filesystem:results-year-year-2021` | 94 |
| `results--year-year-2020` | `files:results / year-year-2020.items` | `mapping-filesystem:results-year-year-2020` | 95 |
| `results--year-year-2019` | `files:results / year-year-2019.items` | `mapping-filesystem:results-year-year-2019` | 96 |
| `results--year-year-2018` | `files:results / year-year-2018.items` | `mapping-filesystem:results-year-year-2018` | 97 |
| `results--year-year-2017` | `files:results / year-year-2017.items` | `mapping-filesystem:results-year-year-2017` | 98 |
| `results--year-year-2016` | `files:results / year-year-2016.items` | `mapping-filesystem:results-year-year-2016` | 99 |
| `results--year-year-2015` | `files:results / year-year-2015.items` | `mapping-filesystem:results-year-year-2015` | 100 |
| `page-results-cta--cta--subcopy` | `files:page-results-cta / cta.subcopy` | `mapping-filesystem:page-results-cta-subcopy` | 101 |
| `results--cta` | `files:results / cta.items` | `mapping-filesystem:page-results-cta` | 102 |
| `voices--frame--header` | `files:voices / frame.header` | `mapping-filesystem:frame-header` | 103 |
| `voices--frame--footer` | `files:voices / frame.footer` | `mapping-filesystem:frame-footer` | 104 |
| `voices--head` | `files:voices / head.items` | `mapping-filesystem:page-voices-head` | 105 |
| `voices--index` | `files:voices / index.items` | `mapping-filesystem:voices-index` | 106 |
| `voices--list` | `files:voices / list.items` | `mapping-filesystem:voices-details` | 107 |
| `page-voices-cta--cta--subcopy` | `files:page-voices-cta / cta.subcopy` | `mapping-filesystem:page-voices-cta-subcopy` | 108 |
| `voices--cta` | `files:voices / cta.items` | `mapping-filesystem:page-voices-cta` | 109 |
| `faq-toc--toc-faq-exam` | `files:faq-toc / toc-faq-exam.items` | `mapping-filesystem:faq-toc-faq-exam` | 110 |
| `faq-category-faq-exam--category` | `files:faq-category-faq-exam / category.items` | `mapping-filesystem:faq-items-faq-exam` | 111 |
| `faq-toc--toc-faq-lessons` | `files:faq-toc / toc-faq-lessons.items` | `mapping-filesystem:faq-toc-faq-lessons` | 112 |
| `faq-category-faq-lessons--category` | `files:faq-category-faq-lessons / category.items` | `mapping-filesystem:faq-items-faq-lessons` | 113 |
| `faq-toc--toc-faq-german` | `files:faq-toc / toc-faq-german.items` | `mapping-filesystem:faq-toc-faq-german` | 114 |
| `faq-category-faq-german--category` | `files:faq-category-faq-german / category.items` | `mapping-filesystem:faq-items-faq-german` | 115 |
| `faq-toc--toc-faq-fees` | `files:faq-toc / toc-faq-fees.items` | `mapping-filesystem:faq-toc-faq-fees` | 116 |
| `faq-category-faq-fees--category` | `files:faq-category-faq-fees / category.items` | `mapping-filesystem:faq-items-faq-fees` | 117 |
| `faq--frame--header` | `files:faq / frame.header` | `mapping-filesystem:frame-header` | 118 |
| `faq--frame--footer` | `files:faq / frame.footer` | `mapping-filesystem:frame-footer` | 119 |
| `faq--head` | `files:faq / head.items` | `mapping-filesystem:page-faq-head` | 120 |
| `faq--toc` | `files:faq / toc.items` | `mapping-filesystem:faq-toc` | 121 |
| `faq--category-faq-exam` | `files:faq / category-faq-exam.items` | `mapping-filesystem:faq-category-faq-exam` | 122 |
| `faq--category-faq-lessons` | `files:faq / category-faq-lessons.items` | `mapping-filesystem:faq-category-faq-lessons` | 123 |
| `faq--category-faq-german` | `files:faq / category-faq-german.items` | `mapping-filesystem:faq-category-faq-german` | 124 |
| `faq--category-faq-fees` | `files:faq / category-faq-fees.items` | `mapping-filesystem:faq-category-faq-fees` | 125 |
| `page-faq-cta--cta--subcopy` | `files:page-faq-cta / cta.subcopy` | `mapping-filesystem:page-faq-cta-subcopy` | 126 |
| `faq--cta` | `files:faq / cta.items` | `mapping-filesystem:page-faq-cta` | 127 |
| `notes--frame--header` | `files:notes / frame.header` | `mapping-filesystem:frame-header` | 128 |
| `notes--frame--footer` | `files:notes / frame.footer` | `mapping-filesystem:frame-footer` | 129 |
| `notes--head` | `files:notes / head.items` | `mapping-filesystem:notes-head` | 130 |
| `notes--cards` | `files:notes / cards.items` | `mapping-filesystem:notes-index-cards` | 131 |
| `note-exam-schedule-heading--heading--eyebrow` | `files:note-exam-schedule-heading / heading.eyebrow` | `mapping-filesystem:note-exam-schedule-eyebrow` | 132 |
| `note-exam-schedule-toc--items` | `files:note-exam-schedule-toc / items.items` | `mapping-filesystem:note-exam-schedule-toc-items` | 133 |
| `note-exam-schedule-related--related` | `files:note-exam-schedule-related / related.items` | `mapping-filesystem:note-all-notes` | 134 |
| `note-exam-schedule--frame--header` | `files:note-exam-schedule / frame.header` | `mapping-filesystem:frame-header` | 135 |
| `note-exam-schedule--frame--footer` | `files:note-exam-schedule / frame.footer` | `mapping-filesystem:frame-footer` | 136 |
| `note-exam-schedule--crumb` | `files:note-exam-schedule / crumb.items` | `mapping-filesystem:note-exam-schedule-crumb` | 137 |
| `note-exam-schedule--heading` | `files:note-exam-schedule / heading.items` | `mapping-filesystem:note-exam-schedule-heading` | 138 |
| `note-exam-schedule--toc` | `files:note-exam-schedule / toc.items` | `mapping-filesystem:note-exam-schedule-toc` | 139 |
| `note-exam-schedule--body` | `files:note-exam-schedule / body.items` | `mapping-filesystem:note-exam-schedule-body` | 140 |
| `note-exam-schedule--related` | `files:note-exam-schedule / related.items` | `mapping-filesystem:note-exam-schedule-related` | 141 |
| `note-free-tuition-heading--heading--eyebrow` | `files:note-free-tuition-heading / heading.eyebrow` | `mapping-filesystem:note-free-tuition-eyebrow` | 142 |
| `note-free-tuition-toc--items` | `files:note-free-tuition-toc / items.items` | `mapping-filesystem:note-free-tuition-toc-items` | 143 |
| `note-free-tuition-related--related` | `files:note-free-tuition-related / related.items` | `mapping-filesystem:note-all-notes` | 144 |
| `note-free-tuition--frame--header` | `files:note-free-tuition / frame.header` | `mapping-filesystem:frame-header` | 145 |
| `note-free-tuition--frame--footer` | `files:note-free-tuition / frame.footer` | `mapping-filesystem:frame-footer` | 146 |
| `note-free-tuition--crumb` | `files:note-free-tuition / crumb.items` | `mapping-filesystem:note-free-tuition-crumb` | 147 |
| `note-free-tuition--heading` | `files:note-free-tuition / heading.items` | `mapping-filesystem:note-free-tuition-heading` | 148 |
| `note-free-tuition--toc` | `files:note-free-tuition / toc.items` | `mapping-filesystem:note-free-tuition-toc` | 149 |
| `note-free-tuition--body` | `files:note-free-tuition / body.items` | `mapping-filesystem:note-free-tuition-body` | 150 |
| `note-free-tuition--related` | `files:note-free-tuition / related.items` | `mapping-filesystem:note-free-tuition-related` | 151 |
| `note-german-language-heading--heading--eyebrow` | `files:note-german-language-heading / heading.eyebrow` | `mapping-filesystem:note-german-language-eyebrow` | 152 |
| `note-german-language-toc--items` | `files:note-german-language-toc / items.items` | `mapping-filesystem:note-german-language-toc-items` | 153 |
| `note-german-language-related--related` | `files:note-german-language-related / related.items` | `mapping-filesystem:note-all-notes` | 154 |
| `note-german-language--frame--header` | `files:note-german-language / frame.header` | `mapping-filesystem:frame-header` | 155 |
| `note-german-language--frame--footer` | `files:note-german-language / frame.footer` | `mapping-filesystem:frame-footer` | 156 |
| `note-german-language--crumb` | `files:note-german-language / crumb.items` | `mapping-filesystem:note-german-language-crumb` | 157 |
| `note-german-language--heading` | `files:note-german-language / heading.items` | `mapping-filesystem:note-german-language-heading` | 158 |
| `note-german-language--toc` | `files:note-german-language / toc.items` | `mapping-filesystem:note-german-language-toc` | 159 |
| `note-german-language--body` | `files:note-german-language / body.items` | `mapping-filesystem:note-german-language-body` | 160 |
| `note-german-language--related` | `files:note-german-language / related.items` | `mapping-filesystem:note-german-language-related` | 161 |
| `note-online-exam-heading--heading--eyebrow` | `files:note-online-exam-heading / heading.eyebrow` | `mapping-filesystem:note-online-exam-eyebrow` | 162 |
| `note-online-exam-toc--items` | `files:note-online-exam-toc / items.items` | `mapping-filesystem:note-online-exam-toc-items` | 163 |
| `note-online-exam-related--related` | `files:note-online-exam-related / related.items` | `mapping-filesystem:note-all-notes` | 164 |
| `note-online-exam--frame--header` | `files:note-online-exam / frame.header` | `mapping-filesystem:frame-header` | 165 |
| `note-online-exam--frame--footer` | `files:note-online-exam / frame.footer` | `mapping-filesystem:frame-footer` | 166 |
| `note-online-exam--crumb` | `files:note-online-exam / crumb.items` | `mapping-filesystem:note-online-exam-crumb` | 167 |
| `note-online-exam--heading` | `files:note-online-exam / heading.items` | `mapping-filesystem:note-online-exam-heading` | 168 |
| `note-online-exam--toc` | `files:note-online-exam / toc.items` | `mapping-filesystem:note-online-exam-toc` | 169 |
| `note-online-exam--body` | `files:note-online-exam / body.items` | `mapping-filesystem:note-online-exam-body` | 170 |
| `note-online-exam--related` | `files:note-online-exam / related.items` | `mapping-filesystem:note-online-exam-related` | 171 |
| `note-what-is-mappe-heading--heading--eyebrow` | `files:note-what-is-mappe-heading / heading.eyebrow` | `mapping-filesystem:note-what-is-mappe-eyebrow` | 172 |
| `note-what-is-mappe-toc--items` | `files:note-what-is-mappe-toc / items.items` | `mapping-filesystem:note-what-is-mappe-toc-items` | 173 |
| `note-what-is-mappe-related--related` | `files:note-what-is-mappe-related / related.items` | `mapping-filesystem:note-all-notes` | 174 |
| `note-what-is-mappe--frame--header` | `files:note-what-is-mappe / frame.header` | `mapping-filesystem:frame-header` | 175 |
| `note-what-is-mappe--frame--footer` | `files:note-what-is-mappe / frame.footer` | `mapping-filesystem:frame-footer` | 176 |
| `note-what-is-mappe--crumb` | `files:note-what-is-mappe / crumb.items` | `mapping-filesystem:note-what-is-mappe-crumb` | 177 |
| `note-what-is-mappe--heading` | `files:note-what-is-mappe / heading.items` | `mapping-filesystem:note-what-is-mappe-heading` | 178 |
| `note-what-is-mappe--toc` | `files:note-what-is-mappe / toc.items` | `mapping-filesystem:note-what-is-mappe-toc` | 179 |
| `note-what-is-mappe--body` | `files:note-what-is-mappe / body.items` | `mapping-filesystem:note-what-is-mappe-body` | 180 |
| `note-what-is-mappe--related` | `files:note-what-is-mappe / related.items` | `mapping-filesystem:note-what-is-mappe-related` | 181 |
| `contact-aside--aside` | `files:contact-aside / aside.items` | `mapping-filesystem:contact-steps` | 182 |
| `contact-form--form--options` | `files:contact-form / form.options` | `mapping-filesystem:contact-course-options` | 183 |
| `contact-legal--legal` | `files:contact-legal / legal.items` | `mapping-filesystem:contact-legal-rows` | 184 |
| `contact--frame--header` | `files:contact / frame.header` | `mapping-filesystem:frame-header` | 185 |
| `contact--frame--footer` | `files:contact / frame.footer` | `mapping-filesystem:frame-footer` | 186 |
| `contact--head` | `files:contact / head.items` | `mapping-filesystem:page-contact-head` | 187 |
| `contact--aside` | `files:contact / aside.items` | `mapping-filesystem:contact-aside` | 188 |
| `contact--form` | `files:contact / form.items` | `mapping-filesystem:contact-form` | 189 |
| `contact--legal` | `files:contact / legal.items` | `mapping-filesystem:contact-legal` | 190 |
| `not-found--frame--header` | `files:not-found / frame.header` | `mapping-filesystem:frame-header` | 191 |
| `not-found--frame--footer` | `files:not-found / frame.footer` | `mapping-filesystem:frame-footer` | 192 |
| `not-found--block` | `files:not-found / block.items` | `mapping-filesystem:not-found-block` | 193 |

## Sitemap page inventory

Only these 14 nodes are baseline route-backed pages. All other Composition records are internal fragments/presentation compositions. Active Sitemap: `sitemap-filesystem:main`, schema 3. Notes detail nodes are children of Notes; the other pages are children of Home.

| Node | Parent | Route | Composition |
| --- | --- | --- | --- |
| `home` | `(root)` | `/` | `files:home` |
| `lessons` | `home` | `/lessons/` | `files:lessons` |
| `about` | `home` | `/about/` | `files:about` |
| `results` | `home` | `/results/` | `files:results` |
| `voices` | `home` | `/voices/` | `files:voices` |
| `faq` | `home` | `/faq/` | `files:faq` |
| `notes` | `home` | `/notes/` | `files:notes` |
| `note-exam-schedule` | `notes` | `/notes/exam-schedule/` | `files:note-exam-schedule` |
| `note-free-tuition` | `notes` | `/notes/free-tuition/` | `files:note-free-tuition` |
| `note-german-language` | `notes` | `/notes/german-language/` | `files:note-german-language` |
| `note-online-exam` | `notes` | `/notes/online-exam/` | `files:note-online-exam` |
| `note-what-is-mappe` | `notes` | `/notes/what-is-mappe/` | `files:note-what-is-mappe` |
| `contact` | `home` | `/contact/` | `files:contact` |
| `not-found` | `home` | `/404.html` | `files:not-found` |

Internal Composition records (163): `nav-item-nav-lessons`, `nav-item-nav-about`, `nav-item-nav-results`, `nav-item-nav-voices`, `nav-item-nav-notes`, `nav-item-nav-faq`, `frame-header`, `frame-footer-nav`, `frame-footer`, `instructor-detail-link`, `home-hero`, `home-hero-meta`, `home-for-you`, `target-items-home`, `home-pricing-cards`, `home-pricing`, `home-instructor-profile`, `home-instructor`, `home-results`, `home-result-cards`, `home-voices`, `home-voice-cards`, `home-faq`, `home-faq-items`, `page-home-cta-subcopy`, `page-home-cta`, `lessons-toc`, `lessons-for-you`, `target-items-lessons`, `lessons-course`, `lessons-course-steps`, `lessons-pricing`, `lessons-price-cards`, `lessons-consultation`, `lessons-consultation-course`, `lessons-instructor-profile`, `lessons-instructor`, `timeline-lessons-career`, `lessons-specializations`, `lessons-specialization-items`, `lessons-graduates`, `lessons-knowledge`, `lessons-knowledge-cards`, `page-lessons-head`, `page-lessons-cta-subcopy`, `page-lessons-cta`, `about-instructor-identity`, `about-profile`, `about-cv`, `timeline-about-career`, `timeline-about-education`, `about-message-body`, `about-message`, `about-features`, `about-feature-cards`, `page-about-head`, `page-about-cta-subcopy`, `page-about-cta`, `results-stats`, `page-results-head`, `results-toc`, `results-toc-year-2025`, `results-rows-year-2025`, `results-year-year-2025`, `results-toc-year-2024`, `results-rows-year-2024`, `results-year-year-2024`, `results-toc-year-2023`, `results-rows-year-2023`, `results-year-year-2023`, `results-toc-year-2022`, `results-rows-year-2022`, `results-year-year-2022`, `results-toc-year-2021`, `results-rows-year-2021`, `results-year-year-2021`, `results-toc-year-2020`, `results-rows-year-2020`, `results-year-year-2020`, `results-toc-year-2019`, `results-rows-year-2019`, `results-year-year-2019`, `results-toc-year-2018`, `results-rows-year-2018`, `results-year-year-2018`, `results-toc-year-2017`, `results-rows-year-2017`, `results-year-year-2017`, `results-toc-year-2016`, `results-rows-year-2016`, `results-year-year-2016`, `results-toc-year-2015`, `results-rows-year-2015`, `results-year-year-2015`, `page-results-cta-subcopy`, `page-results-cta`, `page-voices-head`, `voices-index`, `voices-details`, `page-voices-cta-subcopy`, `page-voices-cta`, `faq-toc`, `faq-toc-faq-exam`, `faq-items-faq-exam`, `faq-category-faq-exam`, `faq-toc-faq-lessons`, `faq-items-faq-lessons`, `faq-category-faq-lessons`, `faq-toc-faq-german`, `faq-items-faq-german`, `faq-category-faq-german`, `faq-toc-faq-fees`, `faq-items-faq-fees`, `faq-category-faq-fees`, `page-faq-head`, `page-faq-cta-subcopy`, `page-faq-cta`, `notes-head`, `notes-index-cards`, `note-all-notes`, `note-exam-schedule-crumb`, `note-exam-schedule-eyebrow`, `note-exam-schedule-heading`, `note-exam-schedule-toc-items`, `note-exam-schedule-toc`, `note-exam-schedule-body`, `note-exam-schedule-related`, `note-free-tuition-crumb`, `note-free-tuition-eyebrow`, `note-free-tuition-heading`, `note-free-tuition-toc-items`, `note-free-tuition-toc`, `note-free-tuition-body`, `note-free-tuition-related`, `note-german-language-crumb`, `note-german-language-eyebrow`, `note-german-language-heading`, `note-german-language-toc-items`, `note-german-language-toc`, `note-german-language-body`, `note-german-language-related`, `note-online-exam-crumb`, `note-online-exam-eyebrow`, `note-online-exam-heading`, `note-online-exam-toc-items`, `note-online-exam-toc`, `note-online-exam-body`, `note-online-exam-related`, `note-what-is-mappe-crumb`, `note-what-is-mappe-eyebrow`, `note-what-is-mappe-heading`, `note-what-is-mappe-toc-items`, `note-what-is-mappe-toc`, `note-what-is-mappe-body`, `note-what-is-mappe-related`, `contact-aside`, `contact-steps`, `contact-form`, `contact-course-options`, `contact-legal`, `contact-legal-rows`, `page-contact-head`, `not-found-block`.

## Inventory checks and next acceptance

Inventory totals: **25 models, 181 fields, 246 entries, 128 Content reference edges, 177 Compositions, 163 Mappings, 194 attachment edges, 14 Sitemap pages**. SiteProject schema is 2; pack identity is `pinsel@0.2.0`, contract version 2. These are baseline counts, not permanent limits on authoring.

This document’s generation checked that field IDs and reference targets came from the actual imported model/entry set; the project builder validates the source structure. No browser, migration, static-build, restart, provider or AI acceptance was run for this inventory. No owner data was imported.

Before T4 changes, complete T3’s installed-renderer and capture acceptance. Then rehearse a reversible migration against known inputs, checking every field/value, all references and selectors above, baseline and new routes, assets, metadata and incoming fragment/query links. Exercise consultation reorder while preserving `?course=1`, shared price edits on Home and Lessons, Contact option labels, local slot edits and invalid-write refusal. Verify save/restart/capture/build against the reviewed state. Keep the seed historical proof while replacing obsolete design-fixed runtime restrictions with stronger ownership/slot/reference tests. Actual owner cutover stays held for a verified current export and an authorized reachable host.
