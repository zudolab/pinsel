import { describe, expect, it, vi } from "vitest";
import type { ContentEditorApplyInput } from "zudo-composer/host-storage";
import { createTransport } from "../transport";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const input: ContentEditorApplyInput = {
  operationId: "op-0001-abcdef",
  expectedBaselineRevision: "base",
  request: { kind: "put-entry-values", projectId: "pinsel", providerId: "pinsel-content", modelId: "course", entryId: "two-month", expectedRevision: 2, values: { "course-price": "¥55,000" } },
};

describe("transport error mapping", () => {
  it("passes typed Worker answers through unchanged", async () => {
    const conflict = { status: "conflict", reason: "draft-revision", current: { draftRevision: 3, baselineRevision: "base" } };
    const refused = { status: "refused", refusal: { ok: false, code: "forbidden", message: "表示順は並べ替え操作でのみ変更できます" } };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(409, conflict)).mockResolvedValueOnce(json(422, refused));
    const transport = createTransport(fetcher);
    expect(await transport.apply(input)).toEqual(conflict);
    expect(await transport.apply(input)).toEqual(refused);
  });

  it("maps identity refusals to unavailable with a Japanese message", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => json(401, { status: "unauthorized", code: "missing-assertion" }));
    const transport = createTransport(fetcher);
    expect(await transport.read()).toEqual({ status: "unavailable", message: expect.stringContaining("ログインが必要です") });
    expect(await transport.apply(input)).toMatchObject({ status: "unavailable" });
  });

  it("maps a CSRF refusal to unavailable (nothing was written)", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(403, { status: "forbidden", code: "csrf-origin" }));
    expect(await createTransport(fetcher).apply(input)).toMatchObject({ status: "unavailable" });
  });

  it("treats an unreadable answer to a write as uncertain, never as success", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 })).mockResolvedValueOnce(json(200, { status: "saved-ish" }));
    const transport = createTransport(fetcher);
    expect(await transport.apply(input)).toEqual({ status: "uncertain", operationId: input.operationId, message: expect.stringContaining("HTTP 502") });
    expect(await transport.apply(input)).toMatchObject({ status: "uncertain", operationId: input.operationId });
  });

  it("treats an unreadable read as unavailable and an unknown snapshot answer as unavailable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("oops", { status: 500 })).mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const transport = createTransport(fetcher);
    expect(await transport.read()).toMatchObject({ status: "unavailable" });
    expect(await transport.snapshot({ expectedDraftRevision: 2 })).toMatchObject({ status: "unavailable" });
  });

  it("lets a network failure reject so the editor recovers through readReceipt", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createTransport(fetcher).apply(input)).rejects.toThrow("Failed to fetch");
  });
});

describe("idempotency", () => {
  it("sends the operationId as Idempotency-Key and reuses it verbatim on retry", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("lost")).mockResolvedValueOnce(json(200, { status: "ok", value: {} }));
    const transport = createTransport(fetcher);
    await expect(transport.apply(input)).rejects.toThrow();
    await transport.apply(input);
    const sent = fetcher.mock.calls.map(([url, init]) => ({ url, key: (init?.headers as Record<string, string>)["idempotency-key"], body: JSON.parse(String(init?.body)) }));
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual(sent[1]);
    expect(sent[0]?.url).toBe("/api/v1/operations");
    expect(sent[0]?.key).toBe(input.operationId);
    expect(sent[0]?.body.operationId).toBe(input.operationId);
  });

  it("reads receipts by the same operation id", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(404, { status: "not-found" }));
    expect(await createTransport(fetcher).readReceipt("op/1")).toEqual({ status: "not-found" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/v1/operations/op%2F1");
  });
});
