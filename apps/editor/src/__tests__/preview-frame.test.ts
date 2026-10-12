import { describe, expect, it, vi } from "vitest";
import { previewReadyMessage, previewRenderedMessage, type HostPreviewState } from "zudo-composer/preview-protocol";
import { PREVIEW_SANDBOX, attachComparisonFrame, enforcePreviewSandbox } from "../preview-frame";

const pack = { packId: "pinsel", packVersion: "0.1.0" };
const SNAPSHOT = "c".repeat(64);

function deliver(data: unknown, source: unknown, origin = location.origin): void {
  const event = new MessageEvent("message", { data, origin });
  Object.defineProperty(event, "source", { value: source });
  window.dispatchEvent(event);
}

describe("comparison frame", () => {
  it("acknowledges only the exact snapshot, revision, route and frame load", () => {
    const posted: unknown[] = [];
    const contentWindow = { postMessage: (message: unknown) => posted.push(message) };
    const states: HostPreviewState[] = [];
    const bridge = attachComparisonFrame({ contentWindow } as unknown as HTMLIFrameElement, { origin: location.origin, pack, target: { snapshotId: SNAPSHOT, revision: 1, route: "/" }, onStateChange: (state) => states.push(state) });

    deliver(previewReadyMessage(pack, "load-1"), contentWindow);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: "render", snapshotId: SNAPSHOT, revision: 1, route: "/", frameLoadId: "load-1" });

    // Wrong revision, wrong route, wrong load, wrong source: all dropped.
    deliver(previewRenderedMessage(pack, { snapshotId: SNAPSHOT, revision: 2, route: "/", frameLoadId: "load-1" }), contentWindow);
    deliver(previewRenderedMessage(pack, { snapshotId: SNAPSHOT, revision: 1, route: "/lessons/", frameLoadId: "load-1" }), contentWindow);
    deliver(previewRenderedMessage(pack, { snapshotId: SNAPSHOT, revision: 1, route: "/", frameLoadId: "load-0" }), contentWindow);
    deliver(previewRenderedMessage(pack, { snapshotId: SNAPSHOT, revision: 1, route: "/", frameLoadId: "load-1" }), {});
    expect(bridge.state.status).toBe("pending");

    deliver(previewRenderedMessage(pack, { snapshotId: SNAPSHOT, revision: 1, route: "/", frameLoadId: "load-1" }), contentWindow);
    expect(bridge.state).toMatchObject({ status: "rendered", request: { snapshotId: SNAPSHOT, revision: 1, route: "/", frameLoadId: "load-1" } });
    expect(states.at(-1)?.status).toBe("rendered");
    bridge.dispose();
  });
});

describe("preview sandbox", () => {
  it("sandboxes the editor's preview frame and reloads its shell under the sandbox", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const stop = enforcePreviewSandbox(root);
    const frame = document.createElement("iframe");
    frame.className = "sg-hosted-content-editor__frame";
    frame.setAttribute("src", "about:blank#shell");
    const setAttribute = vi.spyOn(frame, "setAttribute");
    root.append(frame);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(frame.getAttribute("sandbox")).toBe(PREVIEW_SANDBOX);
    expect(setAttribute.mock.calls.map(([name]) => name)).toEqual(["sandbox", "src"]);
    frame.removeAttribute("sandbox");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(frame.getAttribute("sandbox")).toBe(PREVIEW_SANDBOX);
    stop();
    root.remove();
  });
});
