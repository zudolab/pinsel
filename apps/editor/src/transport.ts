import type { ContentDraftReadResult, ContentEditorStorage } from "zudo-composer/host-storage";

// `ContentEditorStorage` over fetch, mirroring Composer's reference
// fixtures/hosted-content-host/editor/main.mjs. The Worker always answers JSON
// with a `status` discriminator; a transport failure rejects, which the editor
// treats as an uncertain write and resolves through `readReceipt`.

const API = "/api/v1";

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json()) as { status?: string; message?: string };
  // Identity and CSRF failures are not part of the storage vocabulary; the editor shows them as unavailable.
  if (parsed.status === "unauthorized" || parsed.status === "forbidden") {
    return { status: "unavailable", message: parsed.message ?? `${response.status}` } as ContentDraftReadResult<never> as T;
  }
  return parsed as T;
}

export function createTransport(): ContentEditorStorage {
  return {
    read: () => call("/draft"),
    apply: (input) => call("/operations", input),
    readReceipt: (operationId) => call(`/operations/${encodeURIComponent(operationId)}`),
    snapshot: (input) => call("/snapshots", input),
  };
}
