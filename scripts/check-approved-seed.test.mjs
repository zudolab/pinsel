import { describe, expect, it } from "vitest";
import { checkApprovedSeed, compareFixtures } from "./check-approved-seed.mjs";

const digest = (sha256 = "0".repeat(64), bytes = 1) => ({ bytes, sha256 });
/** @param {string} path */
const entry = (path, sha256 = "0".repeat(64), bytes = 1) => ({ path, seedPath: null, bytes, sha256 });

describe("compareFixtures", () => {
  it("accepts an exact match", () => {
    expect(compareFixtures([entry("a.json")], new Map([["a.json", digest()]]))).toEqual([]);
  });

  it("reports added, removed and changed files", () => {
    const problems = compareFixtures(
      [entry("kept.json"), entry("gone.json"), entry("size.json")],
      new Map([
        ["kept.json", digest("1".repeat(64))],
        ["size.json", digest(undefined, 2)],
        ["new.json", digest()],
      ]),
    );
    expect(problems).toEqual([
      expect.stringMatching(/^changed kept\.json/),
      "removed gone.json",
      expect.stringMatching(/^changed size\.json/),
      "added new.json",
    ]);
  });

  it("rejects duplicate manifest entries", () => {
    expect(compareFixtures([entry("a.json"), entry("a.json")], new Map([["a.json", digest()]]))).toEqual(["duplicate manifest entry a.json"]);
  });
});

describe("checkApprovedSeed", () => {
  it("passes on the committed fixtures", async () => {
    const { problems, checked } = await checkApprovedSeed();
    expect(problems).toEqual([]);
    expect(checked).toBe(83);
  });
});
