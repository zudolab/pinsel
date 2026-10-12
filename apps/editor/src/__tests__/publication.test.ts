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

function status(state: PublicationStatus["state"], evidence?: PublicationStatus["evidence"]): PublicationStatus {
  return { operationId: "pub-1", state, snapshotId: SNAPSHOT, baselineRevision: "base", updatedAt: "2026-10-13T00:00:00.000Z", ...(evidence ? { evidence } : {}) };
}

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

  it("never shows 公開中 without deployment evidence", () => {
    for (const evidence of [undefined, {}, { commit: "abc", pr: "https://github.com/x/y/pull/1", buildId: "b1" }, { deployment: { id: "" } }]) {
      const display = publicationDisplay(status("live", evidence));
      expect(display.kind).toBe("unverified");
      expect(display.label).not.toContain("公開中");
      expect(upstreamState(status("live", evidence))).toBeNull();
    }
    expect(publicationDisplay(status("live", { deployment: { id: "dep-1" } }))).toMatchObject({ kind: "state", label: "公開中" });
    expect(upstreamState(status("live", { deployment: { id: "dep-1" } }))).toBe("deployed");
  });

  it("maps validated to upstream verified and has no upstream state for host-only states", () => {
    expect(upstreamState(status("validated"))).toBe("verified");
    expect(upstreamState(status("configuration-required"))).toBeNull();
    expect(upstreamState(status("draft-saved"))).toBeNull();
  });
});

describe("publication adapter", () => {
  it("sends nothing when the confirmation is declined", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = createPublicationAdapter({ confirm: async () => false, onStatus: () => undefined, fetcher });
    expect(await adapter.submit(submission)).toEqual({ status: "rejected", message: PUBLICATION_CANCELLED });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows the exact submission to the confirmation and reuses its idempotency key on retry", async () => {
    const confirm = vi.fn(async () => true);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("bad gateway", { status: 502 })).mockResolvedValueOnce(json(200, { status: "ok", value: { operationId: "pub-1", replayed: true } }));
    const adapter = createPublicationAdapter({ confirm, onStatus: () => undefined, fetcher });
    expect(await adapter.submit(submission)).toMatchObject({ status: "unavailable" });
    expect(await adapter.submit(submission)).toEqual({ status: "ok", value: { operationId: "pub-1", replayed: true } });
    expect(confirm).toHaveBeenCalledWith({ submission });
    const keys = fetcher.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)["idempotency-key"]);
    expect(keys).toEqual([submission.idempotencyKey, submission.idempotencyKey]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/v1/publications", "/api/v1/publications"]);
  });

  it("reports configuration-required as unavailable, not as a submission", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(503, { status: "configuration-required", message: "PUBLISHER_PROVIDER=disabled" }));
    const adapter = createPublicationAdapter({ confirm: async () => true, onStatus: () => undefined, fetcher });
    expect(await adapter.submit(submission)).toEqual({ status: "unavailable", message: expect.stringContaining("設定が必要") });
  });

  it("records the Pinsel state and gives the editor only a proven upstream state", async () => {
    const seen: PublicationStatus[] = [];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(200, { status: "ok", value: status("submitted") }))
      .mockResolvedValueOnce(json(200, { status: "ok", value: status("live") }))
      .mockResolvedValueOnce(json(200, { status: "ok", value: { ...status("submitted"), state: "deployed" } }));
    const adapter = createPublicationAdapter({ confirm: async () => true, onStatus: (value) => seen.push(value), fetcher });
    expect(await adapter.status("pub-1")).toMatchObject({ status: "ok", value: { state: "submitted" } });
    expect(await adapter.status("pub-1")).toMatchObject({ status: "unavailable" });
    // An unknown state word is not a status.
    expect(await adapter.status("pub-1")).toMatchObject({ status: "unavailable" });
    expect(seen.map((value) => value.state)).toEqual(["submitted", "live"]);
  });
});
