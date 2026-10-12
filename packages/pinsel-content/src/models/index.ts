import type { ContentModelRecord } from "zudo-composer/site-project";

import {
  aboutCopyModel,
  contactCopyModel,
  instructorProfileModel,
  lessonsCopyModel,
  siteCopyModel,
} from "./singletons";
import {
  contactStepModel,
  courseModel,
  courseStepModel,
  faqGroupModel,
  faqItemModel,
  featureCardModel,
  homeFaqModel,
  homeResultModel,
  homeVoiceModel,
  knowledgeCardModel,
  legalRowModel,
  navLinkModel,
  noteModel,
  pageCopyModel,
  resultEntryModel,
  resultYearModel,
  specializationModel,
  targetItemModel,
  testimonialModel,
  timelineEntryModel,
} from "./collections";

export {
  MODEL_TIMESTAMP,
  PINSEL_CONTENT_PROVIDER_ID,
  defineModel,
  fieldByKey,
  fieldId,
  kebab,
} from "./define";
export type { FieldSpec, ModelSpec, ScalarFieldKind } from "./define";
export * from "./singletons";
export * from "./collections";

/** Declaration order: referenced models come before the models that reference them. */
export const PINSEL_MODELS = [
  siteCopyModel,
  pageCopyModel,
  navLinkModel,
  lessonsCopyModel,
  aboutCopyModel,
  instructorProfileModel,
  contactCopyModel,
  courseModel,
  courseStepModel,
  targetItemModel,
  specializationModel,
  featureCardModel,
  timelineEntryModel,
  resultYearModel,
  resultEntryModel,
  homeResultModel,
  testimonialModel,
  homeVoiceModel,
  faqGroupModel,
  faqItemModel,
  homeFaqModel,
  noteModel,
  knowledgeCardModel,
  contactStepModel,
  legalRowModel,
] as const satisfies readonly ContentModelRecord[];

export type PinselModelId = (typeof PINSEL_MODELS)[number]["id"];

export const PINSEL_MODEL_IDS = PINSEL_MODELS.map((model) => model.id) as PinselModelId[];

const byId = new Map<string, ContentModelRecord>(PINSEL_MODELS.map((model) => [model.id, model]));

export function modelById(modelId: string): ContentModelRecord | undefined {
  return byId.get(modelId);
}

export function isPinselModelId(value: string): value is PinselModelId {
  return byId.has(value);
}

/** Expected entry counts for the approved seed; the migration importer must reproduce them. */
export const SEED_ENTRY_COUNTS: Record<PinselModelId, number> = {
  "site-copy": 1,
  "page-copy": 9,
  "nav-link": 7,
  "lessons-copy": 1,
  "about-copy": 1,
  "instructor-profile": 1,
  "contact-copy": 1,
  course: 3,
  "course-step": 3,
  "target-item": 12,
  specialization: 9,
  "feature-card": 4,
  "timeline-entry": 15,
  "result-year": 11,
  "result-entry": 105,
  "home-result": 6,
  testimonial: 5,
  "home-voice": 3,
  "faq-group": 4,
  "faq-item": 18,
  "home-faq": 4,
  note: 5,
  "knowledge-card": 5,
  "contact-step": 5,
  "legal-row": 8,
};

/** Sum of `result-year.declaredCount` in the seed; distinct from the 105 detail rows. */
export const SEED_DECLARED_RESULT_COUNT = 123;
