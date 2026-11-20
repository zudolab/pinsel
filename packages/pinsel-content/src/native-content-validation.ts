import type { ContentFieldValidationInput, ContentPolicyIssue } from "zudo-composer/authoring";
import { PINSEL_CONTENT_PROVIDER_ID } from "./models/define";
import { checkFieldValue } from "./policy";

/** Native human and Assistant value validation; no historical Hosted editing permissions. */
export function validateContentField(input: ContentFieldValidationInput): readonly ContentPolicyIssue[] {
  // Optional clearing and required-field completeness belong to Composer's schema.
  // This adapter governs only Pinsel's qualified native Content provider.
  if (input.providerId !== PINSEL_CONTENT_PROVIDER_ID || input.value === undefined) return [];
  const issue = checkFieldValue(input.model, input.field, input.value);
  return issue ? [{ code: issue.code, message: issue.message }] : [];
}
