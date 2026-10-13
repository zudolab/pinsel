import { describe, expect, it, vi } from "vitest";
import type { ContentExportSubmission } from "zudo-composer/export";
import {
  PUBLICATION_CANCELLED,
  PUBLICATION_LABELS,
  PUBLICATION_STATES,
  createPublicationAdapter,
  publicationDisplay,
  upstreamState,
  type PublicationStatus,
} from "../publication";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const SNAPSHOT = "a".repeat(64);
const submission: ContentExportSubmission = {
  snapshotId: SNAPSHOT,
  projectRevision: SNAPSHOT,
  baselineRevision: "base",
  packageIdentity: { packId: "pinsel", packVersion: "0.1.0", contractVersion: 1 },
  idempotencyKey: `submit-${SNAPSHOT.slice(0, 48)}`,
};

function status(state: PublicationStatus["state"], evidence?: PublicationStatus["evidence"], extra: Partial<PublicationStatus> = {}): PublicationStatus {
  return { publicationId: "pub-1", state, snapshotId: SNAPSHOT, baselineRevision: "base", updatedAt: "2026-10-13T00:00:00.000Z", ...(evidence ? { evidence } : {}), ...extra };
}

const COMMIT = "1".repeat(40);
const DEPLOYED = { commit: COMMIT, deployment: { deploymentId: "dep-1", commit: COMMIT, observedAt: "2026-10-13T00:00:00.000Z" } };

describe("publication status derivation", () => {
  it("labels all nine server states 1:1", () => {
    expect(PUBLICATION_STATES).toHaveLength(9);
    const labels = PUBLICATION_STATES.map((state) => PUBLICATION_LABELS[state]);
    expect(new Set(labels).size).toBe(9);
    expect(labels).toEqual(["下書き保存済み", "公開申請済み", "ビルド中", "検証済み", "反映済み", "公開中", "失敗", "公開内容の競合", "設定が必要"]);
    for (const state of PUBLICATION_STATES) {
      if (state === "live") continue;
      expect(publicationDisplay(status(state))).toMatchObject({ kind: "state", state, label: PUBLICATION_LABELS[state] });
    }
  });

  it("never shows 公開中 without deployment evidence for the integration commit", () => {
    const unproven: PublicationStatus["evidence"][] = [
      undefined,
      {},
      { commit: COMMIT, pr: "https://github.com/x/y/pull/1", buildId: "b1" },
      { commit: COMMIT, deployment: { deploymentId: "", commit: COMMIT } },
      { commit: COMMIT, deployment: { deploymentId: "dep-1", commit: "2".repeat(40) } },
      { deployment: { deploymentId: "dep-1", commit: COMMIT } },
    ];
    for (const evidence of unproven) {
      const display = publicationDisplay(status("live", evidence));
      expect(display.kind).toBe("unverified");
      expect(display.label).not.toContain("公開中");
      expect(upstreamState(status("live", evidence))).toBeNull();
    }
    expect(publicationDisplay(status("live", DEPLOYED))).toMatchObject({ kind: "state", label: "公開中" });
    expect(upstreamState(status("live", DEPLOYED))).toBe("deployed");
  });

  it("maps validated to upstream verified and has no upstream state for host-only states", () => {
    expect(upstreamState(status("validated"))).toBe("verified");
    expect(upstreamState(status("configuration-required"))).toBeNull();
    expect(upstreamState(status("draft-saved"))).toBeNull();
  });

  it("shows the last stored state under configuration-required", () => {
    expect(publicationDisplay(status("configuration-required", undefined, { lastObservedState: "building" })).label).toBe("設定が必要（最後の状況: ビルド中）");
  });
});

describe("publication adapter", () => {
  it("sends nothing when the confirmation is declined", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = createPublicationAdapter({ confirm: async () => false, onStatus: () => undefined, fetcher });
    expect(await adapter.submit(submission)).toEqual({ status: "rejected", message: PUBLICATION_CANCELLED });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows the exact submission to the confirmation and sends exactly { snapshotId, expectedBaselineRevision }", async () => {
    const confirm = vi.fn(async () => true);
    const seen: PublicationStatus[] = [];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(json(200, { status: "ok", value: status("submitted"), replayed: true }));
    const adapter = createPublicationAdapter({ confirm, onStatus: (value) => seen.push(value), fetcher });
    expect(await adapter.submit(submission)).toMatchObject({ status: "unavailable" });
    expect(await adapter.submit(submission)).toEqual({ status: "ok", value: { operationId: "pub-1", replayed: true } });
    expect(confirm).toHaveBeenCalledWith({ submission });
    expect(seen.map((value) => value.state)).toEqual(["submitted"]);
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toBe("/api/v1/publications");
      expect(JSON.parse(String(init?.body))).toEqual({ snapshotId: SNAPSHOT, expectedBaselineRevision: "base" });
    }
  });

  it("reports configuration-required (status unavailable + code) without claiming a submission", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(503, { status: "unavailable", code: "configuration-required", state: "configuration-required", message: "PUBLISHER_PROVIDER=disabled" }));
    const adapter = createPublicationAdapter({ confirm: async () => true, onStatus: () => undefined, fetcher });
    expect(await adapter.submit(submission)).toEqual({ status: "unavailable", message: "設定が必要: PUBLISHER_PROVIDER=disabled" });
  });

  it("maps a baseline conflict to a Japanese refusal, and an uncertain answer to the durable job", async () => {
    const seen: PublicationStatus[] = [];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(409, { status: "conflict", reason: "baseline-revision", current: { baselineRevision: "next" }, message: "moved" }))
      .mockResolvedValueOnce(json(503, { status: "uncertain", operationId: "pub-1", message: "no answer", value: status("submitted") }))
      .mockResolvedValueOnce(json(422, { status: "rejected", code: "provider-rejected", message: "refused by provider", value: status("failed") }))
      .mockResolvedValueOnce(json(404, { status: "not-found" }));
    const adapter = createPublicationAdapter({ confirm: async () => true, onStatus: (value) => seen.push(value), fetcher });
    expect(await adapter.submit(submission)).toEqual({ status: "rejected", message: expect.stringContaining("公開内容の競合: 公開版がこの下書きの作成後に更新されました") });
    expect(await adapter.submit(submission)).toEqual({ status: "ok", value: { operationId: "pub-1", replayed: false } });
    expect(await adapter.submit(submission)).toEqual({ status: "rejected", message: "refused by provider" });
    expect(await adapter.submit(submission)).toMatchObject({ status: "rejected" });
    expect(seen.map((value) => value.state)).toEqual(["submitted", "failed"]);
  });

  it("records the Pinsel job and gives the editor only a proven upstream state", async () => {
    const seen: PublicationStatus[] = [];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(200, { status: "ok", value: status("submitted") }))
      .mockResolvedValueOnce(json(200, { status: "ok", value: status("live") }))
      .mockResolvedValueOnce(json(200, { status: "ok", value: { ...status("submitted"), state: "deployed" } }))
      .mockResolvedValueOnce(json(404, { status: "not-found" }));
    const adapter = createPublicationAdapter({ confirm: async () => true, onStatus: (value) => seen.push(value), fetcher });
    expect(await adapter.status("pub-1")).toMatchObject({ status: "ok", value: { operationId: "pub-1", state: "submitted" } });
    expect(await adapter.status("pub-1")).toMatchObject({ status: "unavailable" });
    // An unknown state word is not a status.
    expect(await adapter.status("pub-1")).toMatchObject({ status: "unavailable" });
    expect(await adapter.status("pub-1")).toEqual({ status: "not-found" });
    expect(seen.map((value) => value.state)).toEqual(["submitted", "live"]);
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/v1/publications/pub-1");
  });
});
