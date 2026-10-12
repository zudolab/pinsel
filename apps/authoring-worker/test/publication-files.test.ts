import { PINSEL_PUBLISH_ALLOWLIST, isPublishablePath } from "@pinsel/content";
import { describe, expect, it } from "vitest";
import type { ContentSnapshotRecord } from "zudo-composer/host-storage";

import workerManifest from "../package.json";
import siteManifest from "../../site/package.json";
import { formatIdentityReport, packageIdentityFromManifest, parseIdentityReport, parseSnapshotRecord, serializeSnapshotRecord } from "../src/publish/publication-record";
import { PUBLICATION_PACKAGE_IDENTITY, planPublication, serializeEntryFile } from "../src/publish/snapshot-files";
import { BASELINE } from "../src/site/baseline";
import { PRICE } from "./helpers";

const DISK = import.meta.glob("../../../content/entries/**/*.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const BASE = "ba5e".repeat(10);

function snapshotOf(project = BASELINE.project): ContentSnapshotRecord {
  return { snapshotId: "a".repeat(64), project, draftRevision: 2, baselineRevision: BASE, createdAt: "2026-10-13T00:00:00.000Z" };
}

const plan = (project = BASELINE.project) => planPublication({ snapshot: snapshotOf(project), baselineProject: BASELINE.project, packageIdentity: PUBLICATION_PACKAGE_IDENTITY, requestedBy: "editor@example.test", requestedAt: "2026-10-13T00:00:00.000Z" });

describe("publication files", () => {
  it("rewrites every committed entry byte for byte when its content is unchanged", () => {
    const entries = BASELINE.project.providers.content[0]!.entries;
    expect(entries.length).toBe(Object.keys(DISK).length);
    for (const entry of entries) {
      const disk = DISK[`../../../content/entries/${entry.modelId}/${entry.id}.json`];
      expect(disk, `${entry.modelId}/${entry.id}`).toBeDefined();
      expect(serializeEntryFile(entry, BASELINE.project, JSON.parse(disk!))).toBe(disk);
    }
  });

  it("writes only changed entries, removes deleted ones, and never leaves the allowlist", () => {
    expect(plan().writes).toEqual([]);
    const edited = structuredClone(BASELINE.project);
    const entries = edited.providers.content[0]!.entries;
    entries.find((entry) => entry.id === "two-month")!.values[PRICE] = "¥55,000";
    const removed = entries.findIndex((entry) => entry.modelId === "testimonial");
    const [gone] = entries.splice(removed, 1);
    entries.push({ ...structuredClone(gone!), id: "testimonial-new" });
    const result = plan(edited);
    expect(result.writes.map((write) => [write.path, write.existed])).toEqual([
      ["content/entries/course/two-month.json", true],
      [`content/entries/testimonial/testimonial-new.json`, false],
    ]);
    expect(result.deletes).toEqual([`content/entries/testimonial/${gone!.id}.json`]);
    expect([...result.writes.map((write) => write.path), ...result.deletes, "content/snapshot.json"].every(isPublishablePath)).toBe(true);
    expect(PINSEL_PUBLISH_ALLOWLIST).toEqual(["content/entries/**", "content/snapshot.json"]);
    expect(result.branch).toBe(`content/${"a".repeat(64)}`);
    // A new file uses the importer layout: record keys in schema order.
    const fresh = serializeEntryFile(result.writes[1]!.entry, edited);
    expect(Object.keys(JSON.parse(fresh))).toEqual(["schemaVersion", "id", "modelId", "createdAt", "updatedAt", "values", "lifecycle", "generation"]);
  });

  it("round-trips the snapshot record strictly and declares the site's package identity", () => {
    const record = plan().record;
    expect(parseSnapshotRecord(serializeSnapshotRecord(record))).toEqual(record);
    expect(parseSnapshotRecord(JSON.stringify({ ...record, extra: 1 }))).toBeNull();
    expect(parseSnapshotRecord(JSON.stringify({ ...record, baselineGitSha: "main" }))).toBeNull();
    expect(packageIdentityFromManifest(workerManifest)).toEqual(PUBLICATION_PACKAGE_IDENTITY);
    expect(siteManifest.dependencies["@takazudo/zfb"]).toBe(PUBLICATION_PACKAGE_IDENTITY.zfb);
    const report = { snapshotId: record.snapshotId, contentDigest: record.contentDigest, headSha: "c0de".repeat(10), packageIdentity: record.packageIdentity };
    expect(parseIdentityReport(formatIdentityReport(report))).toEqual(report);
    expect(parseIdentityReport("no marker")).toBeNull();
  });
});
