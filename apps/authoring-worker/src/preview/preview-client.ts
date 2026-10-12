// The preview document's protocol client. Written as one self-contained
// function so the Worker can inline `previewClientMain.toString()` into the
// document and the tests can call it with a fake window: no DOM library, no
// eval. Messages are the strict shapes of zudo-composer/preview-protocol.

export interface PreviewPackIdentity {
  packId: string;
  packVersion: string;
}

export interface PreviewIdentity {
  snapshotId: string;
  revision: number;
  route: string;
}

export interface PreviewMessageEvent {
  source: unknown;
  origin: string;
  data: unknown;
}

/** The slice of `window` the client touches. */
export interface PreviewClientWindow {
  parent: { postMessage(message: unknown, targetOrigin: string): void };
  location: { origin: string; replace(url: string): void };
  crypto: { randomUUID(): string };
  addEventListener(type: "message", listener: (event: PreviewMessageEvent) => void): void;
}

export function previewClientMain(window: PreviewClientWindow, pack: PreviewPackIdentity, self: PreviewIdentity | null, loadError: string | null): string {
  const frameLoadId = window.crypto.randomUUID();
  const base = { channel: "zudo-composer-host-preview", v: 1, packId: pack.packId, packVersion: pack.packVersion };
  const post = (message: Record<string, unknown>): void => window.parent.postMessage({ ...base, ...message }, window.location.origin);
  const failure = (message: string, request: PreviewIdentity | null, recoverable: boolean): void =>
    post({ type: "error", snapshotId: request ? request.snapshotId : null, revision: request ? request.revision : null, route: request ? request.route : null, frameLoadId, message, recoverable });
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data as Record<string, unknown> | null;
    if (!data || typeof data !== "object" || data.channel !== base.channel || data.v !== 1 || data.packId !== pack.packId || data.packVersion !== pack.packVersion || data.type !== "render") return;
    if (data.frameLoadId !== frameLoadId) return;
    const snapshotId = data.snapshotId;
    const revision = data.revision;
    const route = data.route;
    if (typeof snapshotId !== "string" || !/^[0-9a-f]{64}$/.test(snapshotId) || typeof route !== "string" || !route.startsWith("/") || typeof revision !== "number" || !Number.isSafeInteger(revision)) {
      failure("Malformed render request.", null, false);
      return;
    }
    const request = { snapshotId, revision, route };
    if (self && self.snapshotId === snapshotId && self.revision === revision && self.route === route) {
      if (loadError) failure(loadError, request, false);
      else post({ type: "rendered", snapshotId, revision, route, frameLoadId });
      return;
    }
    window.location.replace("/preview/" + snapshotId + route + "?revision=" + encodeURIComponent(String(revision)));
  });
  post({ type: "ready", frameLoadId });
  return frameLoadId;
}

/**
 * Wrangler's esbuild runs with keep-names, which rewrites function bodies to
 * call its module-level `__name(fn, "name")` helper. A body inlined through
 * `.toString()` loses that helper, so the inline script brings an identity one.
 */
export const INLINE_NAME_PRELUDE = "var __name = (target) => target;";

/** `source` (a function expression) called with `args`, in its own scope with the `__name` prelude. */
export function inlineFunctionScript(source: string, args: readonly string[]): string {
  return `(() => { ${INLINE_NAME_PRELUDE} (${source})(${args.join(", ")}); })();`;
}

/** The inline `<script>` body for one preview document. */
export function previewClientScript(pack: PreviewPackIdentity, self: PreviewIdentity | null, loadError: string | null): string {
  return inlineFunctionScript(previewClientMain.toString(), ["window", JSON.stringify(pack), JSON.stringify(self), JSON.stringify(loadError)]);
}
