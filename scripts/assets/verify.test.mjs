import { describe, expect, it } from "vitest";
import { EXCLUDED, R7_10_PATH, R7_10_SHA256, planExpectations } from "./verify.mjs";

/** @param {string} path */
const entry = (path, sha256 = "0".repeat(64)) => ({ path, bytes: 1, sha256 });

describe("planExpectations", () => {
  it("maps public and art entries and drops excluded files", () => {
    const manifest = [
      entry(R7_10_PATH, R7_10_SHA256),
      entry("prototype/src/art/water-paper-hero.svg"),
      ...[...EXCLUDED].map((path) => entry(path)),
    ];
    const { publicFiles, artFiles, problems } = planExpectations(manifest);
    expect(problems).toEqual([]);
    expect([...publicFiles.keys()]).toEqual(["assets/illustrations/10-form-through-dialogue.png"]);
    expect([...artFiles.keys()]).toEqual(["water-paper-hero.svg"]);
  });

  it("rejects a manifest whose R7-10 hash drifted", () => {
    const { problems } = planExpectations([entry(R7_10_PATH)]);
    expect(problems).toEqual([expect.stringContaining("R7-10 sha256")]);
  });

  it("rejects entries outside the approved roots", () => {
    const { problems } = planExpectations([entry(R7_10_PATH, R7_10_SHA256), entry("prototype/dist/index.html")]);
    expect(problems).toEqual([expect.stringContaining("prototype/dist/index.html")]);
  });
});
