import { describe, expect, it } from "vitest";
import { hostRenderMessage, readPreviewToHost } from "zudo-composer/preview-protocol";

import { previewClientMain, previewClientScript, type PreviewMessageEvent } from "../src/preview/preview-client";
import { PREVIEW_PACK } from "../src/preview/preview";

const ORIGIN = "https://authoring.example";
const SNAPSHOT = "f".repeat(64);

function fakeWindow() {
  const posted: { message: unknown; target: string }[] = [];
  const replaced: string[] = [];
  let listener: ((event: PreviewMessageEvent) => void) | null = null;
  const parent = { postMessage: (message: unknown, target: string) => posted.push({ message, target }) };
  const window = {
    parent,
    location: { origin: ORIGIN, replace: (url: string) => replaced.push(url) },
    crypto: { randomUUID: () => "load-1" },
    addEventListener: (_type: "message", next: (event: PreviewMessageEvent) => void) => {
      listener = next;
    },
  };
  const deliver = (data: unknown, origin = ORIGIN, source: unknown = parent) => listener?.({ data, origin, source });
  const received = () => posted.map(({ message }) => readPreviewToHost({ data: message, origin: ORIGIN, source: "frame" }, { source: "frame", origin: ORIGIN, pack: PREVIEW_PACK }));
  return { window, posted, replaced, deliver, received };
}

describe("preview protocol client", () => {
  it("announces ready, acknowledges its own identity and navigates for another", () => {
    const frame = fakeWindow();
    const frameLoadId = previewClientMain(frame.window, PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/" }, null);
    expect(frameLoadId).toBe("load-1");
    frame.deliver(hostRenderMessage(PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId }));
    frame.deliver(hostRenderMessage(PREVIEW_PACK, { snapshotId: "e".repeat(64), revision: 4, route: "/", frameLoadId }));
    frame.deliver(hostRenderMessage(PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId: "stale-load" }));
    frame.deliver(hostRenderMessage(PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId }), "https://evil.example");
    frame.deliver(hostRenderMessage({ packId: "other", packVersion: "9" }, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId }));
    const messages = frame.received();
    expect(messages.every((result) => result.ok)).toBe(true);
    expect(messages.map((result) => (result.ok ? result.message.type : result.reason))).toEqual(["ready", "rendered"]);
    expect(frame.posted.every(({ target }) => target === ORIGIN)).toBe(true);
    expect(frame.replaced).toEqual([`/preview/${"e".repeat(64)}/?revision=4`]);
  });

  it("reports a load error for its own identity and a malformed request as protocol errors", () => {
    const frame = fakeWindow();
    const frameLoadId = previewClientMain(frame.window, PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/" }, "captured at revision 2");
    frame.deliver(hostRenderMessage(PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId }));
    frame.deliver({ ...hostRenderMessage(PREVIEW_PACK, { snapshotId: SNAPSHOT, revision: 3, route: "/", frameLoadId }), snapshotId: "nope" });
    const messages = frame.received();
    expect(messages.map((result) => (result.ok ? result.message.type : result.reason))).toEqual(["ready", "error", "error"]);
    const errors = messages.map((result) => (result.ok && result.message.type === "error" ? result.message : null));
    expect(errors[1]?.snapshotId).toBe(SNAPSHOT);
    expect(errors[1]?.message).toBe("captured at revision 2");
    expect(errors[2]?.snapshotId).toBe(null);
    expect(frame.replaced).toEqual([]);
  });

  it("serialises to a self-contained inline script", () => {
    const script = previewClientScript(PREVIEW_PACK, null, null);
    expect(script.startsWith("(function previewClientMain(") || script.startsWith("(")).toBe(true);
    expect(script).toContain("zudo-composer-host-preview");
    expect(script).not.toContain("import ");
    expect(script).not.toContain("require(");
  });
});
