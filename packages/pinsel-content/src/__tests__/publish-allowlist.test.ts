import { describe, expect, it } from "vitest";

import { PINSEL_PUBLISH_ALLOWLIST, entryFilePath, isPublishablePath } from "../import-rules";

describe("publication path allowlist", () => {
  it("names the entry files and the snapshot record", () => {
    expect(PINSEL_PUBLISH_ALLOWLIST).toEqual(["content/entries/**", "content/snapshot.json"]);
  });

  it("admits every entry file path and the snapshot", () => {
    expect(isPublishablePath(entryFilePath("course", "two-month"))).toBe(true);
    expect(isPublishablePath(entryFilePath("site-copy", "site-copy"))).toBe(true);
    expect(isPublishablePath("content/snapshot.json")).toBe(true);
  });

  it.each([
    "content/baseline.json",
    "content/entries/course/../../package.json",
    "content/entries/course/nested/x.json",
    "content/entries/Course/x.json",
    "content/entries/course/x.js",
    "apps/site/pages/index.tsx",
    "/content/entries/course/x.json",
    ".github/workflows/ci.yml",
  ])("refuses %s", (path) => {
    expect(isPublishablePath(path)).toBe(false);
  });
});
