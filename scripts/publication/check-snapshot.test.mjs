import { describe, expect, it } from "vitest";
import { publicOutputProblems } from "./check-public-output.mjs";
import { changedPathProblems, recordProblems } from "./check-snapshot.mjs";
import { loadImportRules, loadPublicationRecord } from "./lib.mjs";

const IDENTITY = { zfb: "4.3.2", composerSha: "547b532eb56dfecaec1e2bd9060f8d579ad8862c", contractSha: "c0b452da075b66757c60bd0d721a47062d4354d0" };
const ID = "a".repeat(64);

describe("publication CI checks", () => {
  it("accepts only allowlisted paths and requires the snapshot record", async () => {
    const { isPublishablePath } = await loadImportRules();
    expect(changedPathProblems(["content/entries/course/two-month.json", "content/snapshot.json"], isPublishablePath)).toEqual([]);
    expect(changedPathProblems(["content/entries/course/two-month.json"], isPublishablePath)).toEqual(["content/snapshot.json is not part of the change"]);
    const problems = changedPathProblems(["content/snapshot.json", "content/baseline.json", ".github/workflows/ci.yml", "tests/fixtures/approved-seed/page-manifest.json", "content/entries/../../x.json"], isPublishablePath);
    expect(problems).toHaveLength(4);
  });

  it("checks the snapshot record against the repository's package identity", async () => {
    const { parseSnapshotRecord, serializeSnapshotRecord } = await loadPublicationRecord();
    const record = { snapshotId: ID, baselineGitSha: "b".repeat(40), contentDigest: ID, packageIdentity: IDENTITY, requestedBy: "editor@example.test", requestedAt: "2026-10-13T00:00:00.000Z" };
    expect(recordProblems(parseSnapshotRecord(serializeSnapshotRecord(record)), IDENTITY)).toEqual([]);
    expect(recordProblems(null, IDENTITY)).toEqual(["content/snapshot.json is not a valid snapshot record"]);
    expect(recordProblems({ ...record, contentDigest: "c".repeat(64) }, IDENTITY)).toHaveLength(1);
    expect(recordProblems(record, { ...IDENTITY, zfb: "4.3.3" })).toEqual(["packageIdentity.zfb is 4.3.2, this repository builds with 4.3.3"]);
  });

  it("finds repository-only material in a public build", () => {
    expect(publicOutputProblems([{ path: "index.html", text: "<html></html>" }, { path: "assets/fonts/x.woff2" }])).toEqual([]);
    const problems = publicOutputProblems([
      { path: "assets/fonts/font-provenance.json", text: "{}" },
      { path: "content/snapshot.json", text: "{}" },
      { path: "__zfb/routes.json", text: "{}" },
      { path: "lessons/index.html", text: "<!-- pinsel-publication-identity {} -->" },
    ]);
    expect(problems).toHaveLength(4);
  });
});
