import { createHostPreviewBridge, type HostPreviewBridge, type HostPreviewPackIdentity, type HostPreviewState } from "zudo-composer/preview-protocol";

// Preview iframe lifecycle around the mount. The editor's own frame and bridge
// are created by `mountContentEditor`; it sets no `sandbox`, so the host adds
// one and reloads the protocol shell once so the shell itself loads
// sandboxed (the attribute only applies to navigations that start after it is
// set). Reload = navigate the frame back to the shell: the shell announces
// `ready` with a new frameLoadId and the bridge replays its newest request.

export const PREVIEW_SANDBOX = "allow-same-origin allow-scripts";
const FRAME_SELECTOR = ".sg-hosted-content-editor__frame";

export function previewFrameOf(root: Element): HTMLIFrameElement | null {
  return root.querySelector<HTMLIFrameElement>(FRAME_SELECTOR);
}

/** Re-navigates the frame to its protocol shell URL. */
export function reloadPreviewFrame(frame: HTMLIFrameElement): void {
  const shell = frame.getAttribute("src");
  if (shell) frame.setAttribute("src", shell);
}

function sandbox(frame: HTMLIFrameElement): void {
  if (frame.getAttribute("sandbox") === PREVIEW_SANDBOX) return;
  frame.setAttribute("sandbox", PREVIEW_SANDBOX);
  reloadPreviewFrame(frame);
}

/** Keeps every preview frame under `root` sandboxed; returns the disposer. */
export function enforcePreviewSandbox(root: Element): () => void {
  const apply = () => {
    const frame = previewFrameOf(root);
    if (frame) sandbox(frame);
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["sandbox"] });
  return () => observer.disconnect();
}

export interface ComparisonTarget {
  readonly snapshotId: string;
  readonly revision: number;
  readonly route: string;
}

/**
 * The integrated-version frame: a second, independent frame (not a second
 * bridge on the editor's frame) speaking the same protocol, so it too reports
 * `rendered` only for the exact baseline snapshot + revision + route + load.
 */
export function attachComparisonFrame(frame: HTMLIFrameElement, options: { origin: string; pack: HostPreviewPackIdentity; target: ComparisonTarget; onStateChange(state: HostPreviewState): void }): HostPreviewBridge {
  const bridge = createHostPreviewBridge({ frame, origin: options.origin, hostWindow: window, pack: options.pack, onStateChange: options.onStateChange });
  bridge.preview(options.target);
  return bridge;
}
