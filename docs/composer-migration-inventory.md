# Exhaustive baseline field map

This is the **historical T4 field inventory**. It records baseline ownership; actual
staged migration and post-import verification are recorded separately. See the
[migration plan](composer-migration-plan.md), [adoption contract](composer-adoption.md)
and [compatibility ledger](composer-compatibility.md).

Provenance: public known-input capture
`ba87916a98db118b7609ab637b365731f32668b5a4eeba1309f408e807ff9060`,
snapshot schema version 1, workspace `pinsel`, originally captured with Composer
`b33f92aef1c94a366970808cd72264a1e0d9c402`. This inventory is not the owner's
current D1 data or a fresh capture of subsequently edited native state. Before
migration, capture the current saved workspace through the public API, verify its
identities and regenerate this map against that exact revision. T4 implementation
is tracked separately in the [migration recipe](composer-course-migration.md) and
compatibility ledger; owner-data import/cutover remains separately held.


181 fields across 25 models. All old fields retain their exact ID, kind, required flag, values and owning model unless an explicit staged amendment below is approved in implementation. Every Mapping binding/filter/sort and qualified reference is recorded in [machine-readable reference map](composer-migration-reference-map.json). At inventory creation no migration had run; see the migration recipe and compatibility ledger for subsequent rehearsals.

| Old owner.field | Kind | Destination | Current uses |
| --- | --- | --- | --- |
| about-copy.birthLine (`about-copy-birth-line`) | text | unchanged Content owner | about-instructor-identity:subtitle.text |
| about-copy.instagramLabel (`about-copy-instagram-label`) | text | unchanged Content owner | about-instructor-identity:instagram.label |
| about-copy.careerTitle (`about-copy-career-title`) | text | unchanged Content owner | about-cv:cv.careerTitle |
| about-copy.educationTitle (`about-copy-education-title`) | text | unchanged Content owner | about-cv:cv.educationTitle |
| about-copy.messageTitle (`about-copy-message-title`) | text | unchanged Content owner | about-message:message.title |
| about-copy.featuresTitle (`about-copy-features-title`) | text | unchanged Content owner | about-features:section.title |
| contact-copy.stepsTitle (`contact-copy-steps-title`) | text | unchanged Content owner | contact-aside:aside.title |
| contact-copy.legalSummary (`contact-copy-legal-summary`) | text | unchanged Content owner | contact-legal:legal.summary |
| contact-copy.formAriaLabel (`contact-copy-form-aria-label`) | text | unchanged Content owner | contact-form:form.formAriaLabel |
| contact-copy.nameLabel (`contact-copy-name-label`) | text | unchanged Content owner | contact-form:form.nameLabel |
| contact-copy.emailLabel (`contact-copy-email-label`) | text | unchanged Content owner | contact-form:form.emailLabel |
| contact-copy.courseLabel (`contact-copy-course-label`) | text | unchanged Content owner | contact-form:form.courseLabel |
| contact-copy.courseUndecidedOption (`contact-copy-course-undecided-option`) | text | unchanged Content owner | contact-form:form.undecidedOption |
| contact-copy.messageLabel (`contact-copy-message-label`) | text | unchanged Content owner | contact-form:form.messageLabel |
| contact-copy.requiredLabel (`contact-copy-required-label`) | text | unchanged Content owner | contact-form:form.requiredLabel |
| contact-copy.optionalLabel (`contact-copy-optional-label`) | text | unchanged Content owner | contact-form:form.optionalLabel |
| contact-copy.submitLabel (`contact-copy-submit-label`) | text | unchanged Content owner | contact-form:form.submitLabel |
| contact-copy.submittingLabel (`contact-copy-submitting-label`) | text | unchanged Content owner | contact-form:form.submittingLabel |
| contact-copy.successTitle (`contact-copy-success-title`) | text | unchanged Content owner | contact-form:form.successTitle |
| contact-copy.successBody (`contact-copy-success-body`) | long-text | unchanged Content owner | contact-form:form.successBody |
| contact-copy.errorMessage (`contact-copy-error-message`) | long-text | unchanged Content owner | contact-form:form.errorMessage |
| contact-copy.backLabel (`contact-copy-back-label`) | text | unchanged Content owner | contact-form:form.backLabel |
| contact-copy.valueMissingMessage (`contact-copy-value-missing-message`) | text | unchanged Content owner | contact-form:form.valueMissingMessage |
| contact-copy.emailFormatMessage (`contact-copy-email-format-message`) | text | unchanged Content owner | contact-form:form.emailFormatMessage |
| contact-copy.previewNotice (`contact-copy-preview-notice`) | long-text | unchanged Content owner | contact-form:form.previewNotice |
| contact-copy.successPreviewEyebrow (`contact-copy-success-preview-eyebrow`) | text | unchanged Content owner | contact-form:form.successPreviewEyebrow |
| contact-copy.successPreviewNotice (`contact-copy-success-preview-notice`) | long-text | unchanged Content owner | contact-form:form.successPreviewNotice |
| contact-step.title (`contact-step-title`) | text | unchanged Content owner | contact-steps:step.title |
| contact-step.description (`contact-step-description`) | text | unchanged Content owner | contact-steps:step.description |
| contact-step.order (`contact-step-order`) | number | unchanged Content owner | contact-steps:query |
| course.name (`course-name`) | text | unchanged Content owner | home-pricing-cards:card.name, lessons-consultation-course:price.name, lessons-price-cards:card.name |
| course.price (`course-price`) | text | unchanged Content owner | home-pricing-cards:card.price, lessons-consultation-course:price.price, lessons-price-cards:card.price |
| course.unit (`course-unit`) | text | unchanged Content owner | home-pricing-cards:card.unit |
| course.homeDescription (`course-home-description`) | text | unchanged Content owner | home-pricing-cards:card.description |
| course.lessonsNote (`course-lessons-note`) | text | unchanged Content owner | lessons-consultation-course:price.note, lessons-price-cards:card.note |
| course.contactOptionLabel (`course-contact-option-label`) | text | unchanged Content owner | contact-course-options:option.label |
| course.featured (`course-featured`) | boolean | unchanged Content owner | home-pricing-cards:card.featured |
| course.order (`course-order`) | number | unchanged Content owner | contact-course-options:query, home-pricing-cards:card.courseIndex, home-pricing-cards:query, lessons-consultation-course:query, lessons-consultation-course:query, lessons-price-cards:query, lessons-price-cards:query |
| course-step.title (`course-step-title`) | text | unchanged Content owner | lessons-course-steps:step.title |
| course-step.description (`course-step-description`) | long-text | unchanged Content owner | lessons-course-steps:step.description |
| course-step.order (`course-step-order`) | number | unchanged Content owner | lessons-course-steps:query |
| faq-group.title (`faq-group-title`) | text | unchanged Content owner | faq-category-faq-exam:category.title, faq-category-faq-fees:category.title, faq-category-faq-german:category.title, faq-category-faq-lessons:category.title, faq-toc-faq-exam:item.label, faq-toc-faq-fees:item.label, faq-toc-faq-german:item.label, faq-toc-faq-lessons:item.label |
| faq-group.order (`faq-group-order`) | number | unchanged Content owner | faq-category-faq-exam:query, faq-category-faq-fees:query, faq-category-faq-german:query, faq-category-faq-lessons:query, faq-toc-faq-exam:query, faq-toc-faq-fees:query, faq-toc-faq-german:query, faq-toc-faq-lessons:query |
| faq-item.group (`faq-item-group`) | reference | unchanged Content owner | faq-items-faq-exam:query, faq-items-faq-fees:query, faq-items-faq-german:query, faq-items-faq-lessons:query |
| faq-item.question (`faq-item-question`) | text | unchanged Content owner | faq-items-faq-exam:item.question, faq-items-faq-fees:item.question, faq-items-faq-german:item.question, faq-items-faq-lessons:item.question |
| faq-item.answer (`faq-item-answer`) | long-text | unchanged Content owner | faq-items-faq-exam:item.answer, faq-items-faq-fees:item.answer, faq-items-faq-german:item.answer, faq-items-faq-lessons:item.answer |
| faq-item.order (`faq-item-order`) | number | unchanged Content owner | faq-items-faq-exam:query, faq-items-faq-fees:query, faq-items-faq-german:query, faq-items-faq-lessons:query |
| feature-card.title (`feature-card-title`) | text | unchanged Content owner | about-feature-cards:card.title |
| feature-card.description (`feature-card-description`) | long-text | unchanged Content owner | about-feature-cards:card.description |
| feature-card.order (`feature-card-order`) | number | unchanged Content owner | about-feature-cards:query |
| home-faq.question (`home-faq-question`) | text | unchanged Content owner | home-faq-items:item.question |
| home-faq.answer (`home-faq-answer`) | long-text | unchanged Content owner | home-faq-items:item.answer |
| home-faq.order (`home-faq-order`) | number | unchanged Content owner | home-faq-items:query |
| home-result.yearLabel (`home-result-year-label`) | text | unchanged Content owner | home-result-cards:card.yearLabel |
| home-result.school (`home-result-school`) | text | unchanged Content owner | home-result-cards:card.school |
| home-result.detail (`home-result-detail`) | text | unchanged Content owner | home-result-cards:card.detail |
| home-result.order (`home-result-order`) | number | unchanged Content owner | home-result-cards:query |
| home-voice.quote (`home-voice-quote`) | long-text | unchanged Content owner | home-voice-cards:card.quote |
| home-voice.author (`home-voice-author`) | text | unchanged Content owner | home-voice-cards:card.author |
| home-voice.school (`home-voice-school`) | text | unchanged Content owner | home-voice-cards:card.school |
| home-voice.order (`home-voice-order`) | number | unchanged Content owner | home-voice-cards:query |
| instructor-profile.name (`instructor-profile-name`) | text | unchanged Content owner | about-profile:instructor.name, home-instructor-profile:instructor.name, lessons-instructor-profile:instructor.name |
| instructor-profile.latinName (`instructor-profile-latin-name`) | text | unchanged Content owner | about-profile:instructor.latinName, home-instructor-profile:instructor.latinName, lessons-instructor-profile:instructor.latinName |
| instructor-profile.title (`instructor-profile-title`) | text | unchanged Content owner | home-instructor-profile:subtitle.text |
| instructor-profile.portraitAlt (`instructor-profile-portrait-alt`) | text | unchanged Content owner | about-profile:instructor.portraitAlt, home-instructor-profile:instructor.portraitAlt, lessons-instructor-profile:instructor.portraitAlt |
| instructor-profile.homeBio (`instructor-profile-home-bio`) | long-text | unchanged Content owner | home-instructor-profile:bio.text |
| instructor-profile.lessonsBio (`instructor-profile-lessons-bio`) | long-text | unchanged Content owner | lessons-instructor-profile:bio.text |
| instructor-profile.aboutMessage (`instructor-profile-about-message`) | long-text | unchanged Content owner | about-message-body:paragraphs.text |
| knowledge-card.note (`knowledge-card-note`) | reference | unchanged Content owner | lessons-knowledge-cards:card.slug |
| knowledge-card.title (`knowledge-card-title`) | text | unchanged Content owner | lessons-knowledge-cards:card.title |
| knowledge-card.description (`knowledge-card-description`) | text | unchanged Content owner | lessons-knowledge-cards:card.description |
| knowledge-card.order (`knowledge-card-order`) | number | unchanged Content owner | lessons-knowledge-cards:query |
| legal-row.key (`legal-row-key`) | text | unchanged Content owner | contact-legal-rows:row.term |
| legal-row.value (`legal-row-value`) | text | unchanged Content owner | contact-legal-rows:row.value |
| legal-row.order (`legal-row-order`) | number | unchanged Content owner | contact-legal-rows:query |
| lessons-copy.tocForYou (`lessons-copy-toc-for-you`) | text | unchanged Content owner | lessons-toc:toc-for-you.label |
| lessons-copy.tocCourse (`lessons-copy-toc-course`) | text | unchanged Content owner | lessons-toc:toc-course.label |
| lessons-copy.tocPricing (`lessons-copy-toc-pricing`) | text | unchanged Content owner | lessons-toc:toc-pricing.label |
| lessons-copy.tocConsultation (`lessons-copy-toc-consultation`) | text | unchanged Content owner | lessons-toc:toc-consultation.label |
| lessons-copy.tocInstructor (`lessons-copy-toc-instructor`) | text | unchanged Content owner | lessons-toc:toc-instructor.label |
| lessons-copy.tocSpecializations (`lessons-copy-toc-specializations`) | text | unchanged Content owner | lessons-toc:toc-specializations.label |
| lessons-copy.tocGraduates (`lessons-copy-toc-graduates`) | text | unchanged Content owner | lessons-toc:toc-graduates.label |
| lessons-copy.tocKnowledge (`lessons-copy-toc-knowledge`) | text | unchanged Content owner | lessons-toc:toc-knowledge.label |
| lessons-copy.forYouTitle (`lessons-copy-for-you-title`) | text | unchanged Content owner | lessons-for-you:section.title |
| lessons-copy.courseTitle (`lessons-copy-course-title`) | text | unchanged Content owner | lessons-course:section.title |
| lessons-copy.courseIntro (`lessons-copy-course-intro`) | long-text | unchanged Content owner | lessons-course:intro.text |
| lessons-copy.pricingTitle (`lessons-copy-pricing-title`) | text | unchanged Content owner | lessons-pricing:section.title |
| lessons-copy.pricingScheduleNote (`lessons-copy-pricing-schedule-note`) | long-text | unchanged Content owner | lessons-pricing:schedule.text |
| lessons-copy.pricingContinueNote (`lessons-copy-pricing-continue-note`) | long-text | unchanged Content owner | lessons-pricing:continue.text |
| lessons-copy.pricingPaymentNote (`lessons-copy-pricing-payment-note`) | long-text | unchanged Content owner | lessons-pricing:payment.text |
| lessons-copy.consultationTitle (`lessons-copy-consultation-title`) | text | unchanged Content owner | lessons-consultation:section.title |
| lessons-copy.consultationTopicsTitle (`lessons-copy-consultation-topics-title`) | text | unchanged Content owner | lessons-consultation:intro.topicsTitle |
| lessons-copy.consultationTopics (`lessons-copy-consultation-topics`) | long-text | unchanged Content owner | lessons-consultation:intro.topics |
| lessons-copy.consultationFaqTitle (`lessons-copy-consultation-faq-title`) | text | unchanged Content owner | lessons-consultation:intro.faqTitle |
| lessons-copy.consultationFaqTopics (`lessons-copy-consultation-faq-topics`) | long-text | unchanged Content owner | lessons-consultation:intro.faqTopics |
| lessons-copy.instructorTitle (`lessons-copy-instructor-title`) | text | unchanged Content owner | lessons-instructor:section.title |
| lessons-copy.careerTitle (`lessons-copy-career-title`) | text | unchanged Content owner | lessons-instructor:career.title |
| lessons-copy.specializationsTitle (`lessons-copy-specializations-title`) | text | unchanged Content owner | lessons-specializations:section.title |
| lessons-copy.specializationsNote (`lessons-copy-specializations-note`) | long-text | unchanged Content owner | lessons-specializations:note.text |
| lessons-copy.graduatesTitle (`lessons-copy-graduates-title`) | text | unchanged Content owner | lessons-graduates:section.title |
| lessons-copy.graduatesParagraphs (`lessons-copy-graduates-paragraphs`) | long-text | unchanged Content owner | lessons-graduates:content.paragraphs |
| lessons-copy.knowledgeTitle (`lessons-copy-knowledge-title`) | text | unchanged Content owner | lessons-knowledge:section.title |
| nav-link.href (`nav-link-href`) | url | unchanged Content owner | frame-footer-nav:item.href, nav-item-nav-about:item.href, nav-item-nav-faq:item.href, nav-item-nav-lessons:item.href, nav-item-nav-notes:item.href, nav-item-nav-results:item.href, nav-item-nav-voices:item.href |
| nav-link.label (`nav-link-label`) | text | unchanged Content owner | frame-footer-nav:item.label |
| nav-link.headerLabel (`nav-link-header-label`) | text | unchanged Content owner | nav-item-nav-about:item.label, nav-item-nav-faq:item.label, nav-item-nav-lessons:item.label, nav-item-nav-notes:item.label, nav-item-nav-results:item.label, nav-item-nav-voices:item.label |
| nav-link.footerTitle (`nav-link-footer-title`) | text | unchanged Content owner | frame-footer-nav:item.title |
| nav-link.footerDescription (`nav-link-footer-description`) | text | unchanged Content owner | frame-footer-nav:item.description |
| nav-link.order (`nav-link-order`) | number | unchanged Content owner | frame-footer-nav:query, nav-item-nav-about:query, nav-item-nav-faq:query, nav-item-nav-lessons:query, nav-item-nav-notes:query, nav-item-nav-results:query, nav-item-nav-voices:query |
| note.slug (`note-slug`) | slug | unchanged Content owner | note-all-notes:link.slug, note-all-notes:query, note-exam-schedule-heading:heading.slug, note-free-tuition-heading:heading.slug, note-german-language-heading:heading.slug, note-online-exam-heading:heading.slug, note-what-is-mappe-heading:heading.slug, notes-index-cards:card.slug |
| note.title (`note-title`) | text | unchanged Content owner | note-all-notes:link.title, note-exam-schedule-crumb:breadcrumb.label, note-exam-schedule-heading:heading.title, note-free-tuition-crumb:breadcrumb.label, note-free-tuition-heading:heading.title, note-german-language-crumb:breadcrumb.label, note-german-language-heading:heading.title, note-online-exam-crumb:breadcrumb.label, note-online-exam-heading:heading.title, note-what-is-mappe-crumb:breadcrumb.label, note-what-is-mappe-heading:heading.title, notes-index-cards:card.title |
| note.description (`note-description`) | long-text | unchanged Content owner | note-exam-schedule-heading:heading.description, note-free-tuition-heading:heading.description, note-german-language-heading:heading.description, note-online-exam-heading:heading.description, note-what-is-mappe-heading:heading.description, notes-index-cards:card.description |
| note.body (`note-body`) | markdown | unchanged Content owner | note-exam-schedule-body:prose.markdown, note-exam-schedule-toc-items:items.markdown, note-free-tuition-body:prose.markdown, note-free-tuition-toc-items:items.markdown, note-german-language-body:prose.markdown, note-german-language-toc-items:items.markdown, note-online-exam-body:prose.markdown, note-online-exam-toc-items:items.markdown, note-what-is-mappe-body:prose.markdown, note-what-is-mappe-toc-items:items.markdown |
| note.order (`note-order`) | number | unchanged Content owner | note-exam-schedule-body:query, note-exam-schedule-crumb:query, note-exam-schedule-heading:query, note-exam-schedule-toc-items:query, note-free-tuition-body:query, note-free-tuition-crumb:query, note-free-tuition-heading:query, note-free-tuition-toc-items:query, note-german-language-body:query, note-german-language-crumb:query, note-german-language-heading:query, note-german-language-toc-items:query, note-online-exam-body:query, note-online-exam-crumb:query, note-online-exam-heading:query, note-online-exam-toc-items:query, note-what-is-mappe-body:query, note-what-is-mappe-crumb:query, note-what-is-mappe-heading:query, note-what-is-mappe-toc-items:query, notes-index-cards:query |
| page-copy.route (`page-copy-route`) | url | unchanged Content owner | faq-toc:query, page-about-cta-subcopy:query, page-about-head:query, page-contact-head:query, page-faq-cta-subcopy:query, page-faq-head:query, page-home-cta-subcopy:query, page-lessons-cta-subcopy:query, page-lessons-head:query, page-results-cta-subcopy:query, page-results-head:query, page-voices-cta-subcopy:query, page-voices-head:query, results-toc:query |
| page-copy.metaTitle (`page-copy-meta-title`) | text | unchanged Content owner | metadata / source-generation / identity or retained unbound field; inspect before removal |
| page-copy.metaDescription (`page-copy-meta-description`) | long-text | unchanged Content owner | metadata / source-generation / identity or retained unbound field; inspect before removal |
| page-copy.headerTitle (`page-copy-header-title`) | text | unchanged Content owner | page-about-head:breadcrumb.label, page-about-head:heading.title, page-contact-head:breadcrumb.label, page-contact-head:heading.title, page-faq-head:breadcrumb.label, page-faq-head:heading.title, page-lessons-head:breadcrumb.label, page-lessons-head:heading.title, page-results-head:breadcrumb.label, page-results-head:heading.title, page-voices-head:breadcrumb.label, page-voices-head:heading.title |
| page-copy.headerDescription (`page-copy-header-description`) | long-text | unchanged Content owner | page-about-head:heading.description, page-contact-head:heading.description, page-faq-head:heading.description, page-lessons-head:heading.description, page-results-head:heading.description, page-voices-head:heading.description |
| page-copy.asideLabel (`page-copy-aside-label`) | text | unchanged Content owner | faq-toc:toc.label, results-toc:toc.label |
| page-copy.ctaSubCopy (`page-copy-cta-sub-copy`) | text | unchanged Content owner | page-about-cta-subcopy:subcopy.text, page-faq-cta-subcopy:subcopy.text, page-home-cta-subcopy:subcopy.text, page-lessons-cta-subcopy:subcopy.text, page-results-cta-subcopy:subcopy.text, page-voices-cta-subcopy:subcopy.text |
| page-copy.order (`page-copy-order`) | number | unchanged Content owner | faq-toc:query, page-about-cta-subcopy:query, page-about-head:query, page-contact-head:query, page-faq-cta-subcopy:query, page-faq-head:query, page-home-cta-subcopy:query, page-lessons-cta-subcopy:query, page-lessons-head:query, page-results-cta-subcopy:query, page-results-head:query, page-voices-cta-subcopy:query, page-voices-head:query, results-toc:query |
| result-entry.year (`result-entry-year`) | reference | unchanged Content owner | results-rows-year-2015:query, results-rows-year-2016:query, results-rows-year-2017:query, results-rows-year-2018:query, results-rows-year-2019:query, results-rows-year-2020:query, results-rows-year-2021:query, results-rows-year-2022:query, results-rows-year-2023:query, results-rows-year-2024:query, results-rows-year-2025:query |
| result-entry.school (`result-entry-school`) | text | unchanged Content owner | results-rows-year-2015:row.school, results-rows-year-2016:row.school, results-rows-year-2017:row.school, results-rows-year-2018:row.school, results-rows-year-2019:row.school, results-rows-year-2020:row.school, results-rows-year-2021:row.school, results-rows-year-2022:row.school, results-rows-year-2023:row.school, results-rows-year-2024:row.school, results-rows-year-2025:row.school |
| result-entry.department (`result-entry-department`) | text | unchanged Content owner | results-rows-year-2015:row.department, results-rows-year-2016:row.department, results-rows-year-2017:row.department, results-rows-year-2018:row.department, results-rows-year-2019:row.department, results-rows-year-2020:row.department, results-rows-year-2021:row.department, results-rows-year-2022:row.department, results-rows-year-2023:row.department, results-rows-year-2024:row.department, results-rows-year-2025:row.department |
| result-entry.url (`result-entry-url`) | url | unchanged Content owner | results-rows-year-2015:row.url, results-rows-year-2016:row.url, results-rows-year-2017:row.url, results-rows-year-2018:row.url, results-rows-year-2019:row.url, results-rows-year-2020:row.url, results-rows-year-2021:row.url, results-rows-year-2022:row.url, results-rows-year-2023:row.url, results-rows-year-2024:row.url, results-rows-year-2025:row.url |
| result-entry.order (`result-entry-order`) | number | unchanged Content owner | results-rows-year-2015:query, results-rows-year-2016:query, results-rows-year-2017:query, results-rows-year-2018:query, results-rows-year-2019:query, results-rows-year-2020:query, results-rows-year-2021:query, results-rows-year-2022:query, results-rows-year-2023:query, results-rows-year-2024:query, results-rows-year-2025:query |
| result-year.label (`result-year-label`) | text | unchanged Content owner | results-toc-year-2015:item.label, results-toc-year-2015:item.href, results-toc-year-2016:item.label, results-toc-year-2016:item.href, results-toc-year-2017:item.label, results-toc-year-2017:item.href, results-toc-year-2018:item.label, results-toc-year-2018:item.href, results-toc-year-2019:item.label, results-toc-year-2019:item.href, results-toc-year-2020:item.label, results-toc-year-2020:item.href, results-toc-year-2021:item.label, results-toc-year-2021:item.href, results-toc-year-2022:item.label, results-toc-year-2022:item.href, results-toc-year-2023:item.label, results-toc-year-2023:item.href, results-toc-year-2024:item.label, results-toc-year-2024:item.href, results-toc-year-2025:item.label, results-toc-year-2025:item.href, results-year-year-2015:section.label, results-year-year-2016:section.label, results-year-year-2017:section.label, results-year-year-2018:section.label, results-year-year-2019:section.label, results-year-year-2020:section.label, results-year-year-2021:section.label, results-year-year-2022:section.label, results-year-year-2023:section.label, results-year-year-2024:section.label, results-year-year-2025:section.label |
| result-year.declaredCount (`result-year-declared-count`) | number | unchanged Content owner | results-year-year-2015:section.count, results-year-year-2016:section.count, results-year-year-2017:section.count, results-year-year-2018:section.count, results-year-year-2019:section.count, results-year-year-2020:section.count, results-year-year-2021:section.count, results-year-year-2022:section.count, results-year-year-2023:section.count, results-year-year-2024:section.count, results-year-year-2025:section.count |
| result-year.order (`result-year-order`) | number | unchanged Content owner | results-toc-year-2015:query, results-toc-year-2016:query, results-toc-year-2017:query, results-toc-year-2018:query, results-toc-year-2019:query, results-toc-year-2020:query, results-toc-year-2021:query, results-toc-year-2022:query, results-toc-year-2023:query, results-toc-year-2024:query, results-toc-year-2025:query, results-year-year-2015:query, results-year-year-2016:query, results-year-year-2017:query, results-year-year-2018:query, results-year-year-2019:query, results-year-year-2020:query, results-year-year-2021:query, results-year-year-2022:query, results-year-year-2023:query, results-year-year-2024:query, results-year-year-2025:query |
| site-copy.brandWord (`site-copy-brand-word`) | text | unchanged Content owner | frame-footer:footer.brandWord, frame-header:header.brandWord |
| site-copy.brandSub (`site-copy-brand-sub`) | text | unchanged Content owner | frame-footer:footer.brandSub, frame-header:header.brandSub |
| site-copy.heroLabel (`site-copy-hero-label`) | text | unchanged Content owner | home-hero:hero.label |
| site-copy.heroTitleLines (`site-copy-hero-title-lines`) | long-text | unchanged Content owner | home-hero:hero.titleLines |
| site-copy.heroLead (`site-copy-hero-lead`) | long-text | unchanged Content owner | home-hero:hero.lead |
| site-copy.heroPrimaryLabel (`site-copy-hero-primary-label`) | text | unchanged Content owner | home-hero:hero.primaryLabel |
| site-copy.heroPricingLabel (`site-copy-hero-pricing-label`) | text | unchanged Content owner | home-hero:hero.pricingLabel |
| site-copy.heroMetaLine (`site-copy-hero-meta-line`) | text | unchanged Content owner | home-hero-meta:meta.line |
| site-copy.heroIntro (`site-copy-hero-intro`) | long-text | unchanged Content owner | home-hero-meta:meta.intro |
| site-copy.forYouTitle (`site-copy-for-you-title`) | text | unchanged Content owner | home-for-you:section.title |
| site-copy.pricingTitle (`site-copy-pricing-title`) | text | unchanged Content owner | home-pricing:section.title |
| site-copy.pricingNote (`site-copy-pricing-note`) | text | unchanged Content owner | home-pricing:cards.note |
| site-copy.pricingMoreLabel (`site-copy-pricing-more-label`) | text | unchanged Content owner | home-pricing:cards.moreLabel |
| site-copy.instructorTitle (`site-copy-instructor-title`) | text | unchanged Content owner | home-instructor:section.title |
| site-copy.instructorDetailLabel (`site-copy-instructor-detail-label`) | text | unchanged Content owner | instructor-detail-link:link.label |
| site-copy.resultsTitle (`site-copy-results-title`) | text | unchanged Content owner | home-results:section.title |
| site-copy.voicesTitle (`site-copy-voices-title`) | text | unchanged Content owner | home-voices:section.title |
| site-copy.faqTitle (`site-copy-faq-title`) | text | unchanged Content owner | home-faq:section.title |
| site-copy.moreLabel (`site-copy-more-label`) | text | unchanged Content owner | home-faq:more.label, home-results:more.label, home-voices:more.label |
| site-copy.ctaTitle (`site-copy-cta-title`) | text | unchanged Content owner | page-about-cta:cta.title, page-faq-cta:cta.title, page-home-cta:cta.title, page-lessons-cta:cta.title, page-results-cta:cta.title, page-voices-cta:cta.title |
| site-copy.ctaButtonLabel (`site-copy-cta-button-label`) | text | unchanged Content owner | frame-header:header.contactLabel, page-about-cta:cta.buttonLabel, page-faq-cta:cta.buttonLabel, page-home-cta:cta.buttonLabel, page-lessons-cta:cta.buttonLabel, page-results-cta:cta.buttonLabel, page-voices-cta:cta.buttonLabel |
| site-copy.statsResultsNumber (`site-copy-stats-results-number`) | text | unchanged Content owner | results-stats:results.number |
| site-copy.statsResultsLabel (`site-copy-stats-results-label`) | text | unchanged Content owner | results-stats:results.label |
| site-copy.statsSchoolsNumber (`site-copy-stats-schools-number`) | text | unchanged Content owner | results-stats:schools.number |
| site-copy.statsSchoolsLabel (`site-copy-stats-schools-label`) | text | unchanged Content owner | results-stats:schools.label |
| site-copy.notesIndexTitle (`site-copy-notes-index-title`) | text | unchanged Content owner | notes-head:breadcrumb.label, notes-head:heading.title |
| site-copy.notesIndexDescription (`site-copy-notes-index-description`) | long-text | unchanged Content owner | notes-head:heading.description |
| site-copy.noteEyebrow (`site-copy-note-eyebrow`) | text | unchanged Content owner | note-exam-schedule-eyebrow:eyebrow.text, note-free-tuition-eyebrow:eyebrow.text, note-german-language-eyebrow:eyebrow.text, note-online-exam-eyebrow:eyebrow.text, note-what-is-mappe-eyebrow:eyebrow.text |
| site-copy.allNotesLabel (`site-copy-all-notes-label`) | text | unchanged Content owner | note-exam-schedule-related:related.title, note-free-tuition-related:related.title, note-german-language-related:related.title, note-online-exam-related:related.title, note-what-is-mappe-related:related.title |
| site-copy.contentsLabel (`site-copy-contents-label`) | text | unchanged Content owner | note-exam-schedule-toc:toc.label, note-free-tuition-toc:toc.label, note-german-language-toc:toc.label, note-online-exam-toc:toc.label, note-what-is-mappe-toc:toc.label |
| site-copy.notFoundTitle (`site-copy-not-found-title`) | text | unchanged Content owner | not-found-block:block.title |
| site-copy.notFoundBody (`site-copy-not-found-body`) | long-text | unchanged Content owner | not-found-block:block.body |
| site-copy.notFoundLinkLabel (`site-copy-not-found-link-label`) | text | unchanged Content owner | not-found-block:block.linkLabel |
| site-copy.footerInstagramLabel (`site-copy-footer-instagram-label`) | text | unchanged Content owner | frame-footer:footer.instagramLabel |
| site-copy.footerCopyright (`site-copy-footer-copyright`) | text | unchanged Content owner | frame-footer:footer.copyright |
| site-copy.backToTopLabel (`site-copy-back-to-top-label`) | text | unchanged Content owner | frame-footer:footer.backToTopLabel |
| specialization.de (`specialization-de`) | text | unchanged Content owner | lessons-specialization-items:item.de |
| specialization.ja (`specialization-ja`) | text | unchanged Content owner | lessons-specialization-items:item.ja |
| specialization.order (`specialization-order`) | number | unchanged Content owner | lessons-specialization-items:query |
| target-item.page (`target-item-page`) | choice | unchanged Content owner | target-items-home:query, target-items-lessons:query |
| target-item.text (`target-item-text`) | text | unchanged Content owner | target-items-home:item.text, target-items-lessons:item.text |
| target-item.order (`target-item-order`) | number | unchanged Content owner | target-items-home:query, target-items-lessons:query |
| testimonial.author (`testimonial-author`) | text | unchanged Content owner | voices-details:voice.author, voices-index:link.author |
| testimonial.yearLabel (`testimonial-year-label`) | text | unchanged Content owner | voices-details:voice.yearLabel |
| testimonial.school (`testimonial-school`) | text | unchanged Content owner | voices-details:voice.school, voices-index:link.school |
| testimonial.department (`testimonial-department`) | text | unchanged Content owner | voices-details:voice.department |
| testimonial.quote (`testimonial-quote`) | long-text | unchanged Content owner | voices-details:voice.quote |
| testimonial.order (`testimonial-order`) | number | unchanged Content owner | voices-details:query, voices-index:query |
| timeline-entry.timeline (`timeline-entry-timeline`) | choice | unchanged Content owner | timeline-about-career:query, timeline-about-education:query, timeline-lessons-career:query |
| timeline-entry.year (`timeline-entry-year`) | text | unchanged Content owner | timeline-about-career:item.year, timeline-about-education:item.year, timeline-lessons-career:item.year |
| timeline-entry.text (`timeline-entry-text`) | text | unchanged Content owner | timeline-about-career:item.text, timeline-about-education:item.text, timeline-lessons-career:item.text |
| timeline-entry.order (`timeline-entry-order`) | number | unchanged Content owner | timeline-about-career:query, timeline-about-education:query, timeline-lessons-career:query |
