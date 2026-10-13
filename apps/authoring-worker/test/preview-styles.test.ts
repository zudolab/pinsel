import { describe, expect, it } from "vitest";
import { PREVIEW_STYLES } from "../src/preview/styles.generated";

// Unlayered tokens beat `@layer responsive`, so the preview would ignore the ≤70rem / ≤47.99rem overrides.
describe("preview styles", () => {
  it("wraps the pinsel-ui token files in @layer tokens ahead of the components", () => {
    const blocks = PREVIEW_STYLES.split("@layer tokens {");
    expect(blocks[0]).toBe("");
    expect(blocks.length).toBe(3);
    const firstTokens = blocks[1];
    for (const token of ["--header-height:", "--gutter:", "--space-section:", "--space-8:"]) {
      expect(firstTokens).toContain(token);
    }
    expect(blocks[2]).toContain("--palette-paper:");
  });
});
