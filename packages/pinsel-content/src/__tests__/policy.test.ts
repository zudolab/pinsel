import { describe, expect, it } from "vitest";
import { createPinselHostedPolicy } from "../policy";
import { PINSEL_MODELS, PINSEL_CONTENT_PROVIDER_ID } from "../models";
import { buildSeedEntries } from "../import/seed-entries";
describe("hosted policy", () => {
 const entries = buildSeedEntries(PINSEL_MODELS);
 const policy = createPinselHostedPolicy([{ providerId: PINSEL_CONTENT_PROVIDER_ID, models: [...PINSEL_MODELS], entries }]);
 it("permits note title, description and body but protects slug and order", () => {
  expect(policy.models.find(model => model.modelId === "note")!.fields.map(field => field.fieldId)).toEqual(expect.arrayContaining(["note-title", "note-description", "note-body"]));
  expect(policy.models.find(model => model.modelId === "note")!.fields.map(field => field.fieldId)).not.toEqual(expect.arrayContaining(["note-slug", "note-order"]));
 });
 it("explicitly scopes all entries and refuses structural collection mutations", () => {
  expect(policy.collections).toEqual([]);
  for(const model of policy.models) expect(model.entryIds).toEqual(entries.filter(entry => entry.modelId === model.modelId).map(entry => entry.id));
 });
});
