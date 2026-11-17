import { expect, it } from "vitest";
import { PINSEL_MODELS } from "../models";
import { readContentEntries } from "../site/entries";
import { validateContentField } from "../native-content-validation";
import type { JsonValue } from "@zudo-composer/component-contract";

const entries = await readContentEntries();
function context(modelId: string, key: string, value: JsonValue | undefined, purpose: "write" | "publish" = "write") {
  const model = PINSEL_MODELS.find(model => model.id === modelId)!;
  const field = model.document.fields.find(field => field.key === key)!;
  const entry = entries.find(entry => entry.modelId === modelId)!;
  return { providerId: "content-filesystem", model, entry, field, value, previousValue: entry.values[field.id], purpose };
}
it("retains every committed Note body and the same supported human/AI value rules", () => {
  const notes = entries.filter(entry => entry.modelId === "note");
  expect(notes).toHaveLength(5);
  for (const entry of notes) {
    for (const purpose of ["write", "publish"] as const) {
      const input = { ...context("note", "body", undefined, purpose), entry };
      input.value = entry.values[input.field.id];
      expect(typeof input.value).toBe("string");
      expect((input.value as string).trim().length).toBeGreaterThan(0);
      expect(validateContentField(input)).toEqual([]);
    }
  }
  expect(validateContentField(context("note", "body", "## Heading\n\nPlain *emphasis* and **strong**.\n\n- Item\n\n[Link](https://example.com/)"))).toEqual([]);
});
it.each(["write", "publish"] as const)("rejects unsupported Note values during %s without mutating context", purpose => {
  for (const [value, code] of [["# Wrong heading", "invalid-value"], ["<script>alert(1)</script>", "invalid-value"], ["![image](/image.png)", "invalid-value"], ["[link](http://example.com/)", "unsafe-reference"], ["[link](javascript:alert(1))", "unsafe-reference"], ["Good paragraph\n\n1. Ordered", "invalid-value"]]) {
    const input = context("note", "body", value!, purpose), before = structuredClone(input);
    const result = validateContentField(input);
    expect(result).toHaveLength(1); expect(result[0]!.code).toBe(code);
    expect(result[0]!.message).toContain("body");
    expect(input).toEqual(before);
  }
  expect(validateContentField(context("note", "body", "Allowed\n\n### Wrong", purpose))[0]!.message).toContain("3行目");
});
it("keeps value validation separate from obsolete fixed-record and structural permissions", () => {
  const newNote = context("note", "body", "## New note\n\nNew supported content");
  newNote.entry = { ...newNote.entry, id: "new-native-note", lifecycle: "draft" };
  expect(validateContentField(newNote)).toEqual([]);
  expect(validateContentField(context("note", "title", "A new native title"))).toEqual([]);
  expect(validateContentField(context("nav-link", "href", "/new-page/"))).toEqual([]);
  expect(validateContentField(context("nav-link", "href", "javascript:alert(1)"))[0]!.code).toBe("unsafe-reference");
  expect(validateContentField(context("result-entry", "url", "https://example.com/"))[0]!.code).toBe("unsafe-reference");
  expect(validateContentField(context("course", "price", "Updated price"))).toEqual([]);
});
it("leaves optional clearing, required completeness and other providers to their own validators", () => {
  expect(validateContentField(context("note", "body", undefined))).toEqual([]);
  expect(validateContentField({ ...context("note", "body", "# Other contract"), providerId: "other-content" })).toEqual([]);
});

it("accepts every retained committed field value under the shared native value contract", () => {
  expect(entries).toHaveLength(246);
  let checked = 0;
  for (const entry of entries) {
    const model = PINSEL_MODELS.find(model => model.id === entry.modelId)!;
    expect(model).toBeDefined();
    for (const [fieldId, value] of Object.entries(entry.values)) {
      const field = model.document.fields.find(field => field.id === fieldId)!;
      expect(field).toBeDefined();
      for (const purpose of ["write", "publish"] as const) {
        expect(validateContentField({ providerId: "content-filesystem", model, entry, field, value, previousValue: value, purpose }), `${model.id}/${entry.id}/${fieldId}`).toEqual([]);
      }
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(246);
});
