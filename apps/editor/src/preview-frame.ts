import { createHostPreviewBridge, type HostPreviewBridge, type HostPreviewPackIdentity, type HostPreviewState } from "zudo-composer/preview-protocol";

// Preview iframe lifecycle around the mount. The editor's own frame and bridge
// are created by `mountContentEditor` (sandboxed through `preview.sandbox`).
// Reload = navigate the frame back to the shell: the shell announces `ready`
// with a new frameLoadId and the bridge replays its newest request.

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
