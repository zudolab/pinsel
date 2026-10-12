import { describe, expect, it } from "vitest";
import { previewReadyMessage, previewRenderedMessage, type HostPreviewState } from "zudo-composer/preview-protocol";
import { attachComparisonFrame } from "../preview-frame";

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

