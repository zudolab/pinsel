import type {
  ContentDraftMutationResult,
  ContentDraftReadResult,
  ContentDraftState,
  ContentEditorApplyInput,
  ContentEditorStorage,
  ContentOperationReceipt,
  ContentSnapshotRecord,
  HostContentApplyResult,
} from "zudo-composer/host-storage";
import { identityMessage } from "./site";

// `ContentEditorStorage` over fetch, mirroring Composer's reference
// fixtures/hosted-content-host/editor/main.mjs. The Worker answers JSON with a
// `status` discriminator; anything else is mapped onto the storage vocabulary
// here so the editor never sees an untyped failure:
// - identity / CSRF refusals and unreadable read responses -> `unavailable`
//   (nothing was written);
// - an unreadable or unknown answer to a write -> `uncertain`, which the
//   editor resolves through `readReceipt` and an identical retry. The retry
//   carries the same operationId, sent again as `Idempotency-Key`.

export const API = "/api/v1";

const READ_STATUSES = new Set(["ok", "not-found", "unavailable"]);
const MUTATION_STATUSES = new Set([...READ_STATUSES, "conflict", "rejected", "uncertain"]);
const APPLY_STATUSES = new Set([...MUTATION_STATUSES, "refused"]);

interface Answer {
  readonly httpStatus: number;
  readonly body: { status?: unknown; code?: unknown; message?: unknown } | null;
}

async function send(fetcher: typeof fetch, path: string, init: { body?: unknown; idempotencyKey?: string } = {}): Promise<Answer> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.idempotencyKey !== undefined) headers["idempotency-key"] = init.idempotencyKey;
  const response = await fetcher(`${API}${path}`, {
    method: init.body === undefined ? "GET" : "POST",
    headers,
    credentials: "same-origin",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let body: Answer["body"] = null;
  try {
    const parsed: unknown = await response.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Answer["body"]) : null;
  } catch {
    body = null;
  }
  return { httpStatus: response.status, body };
}

function refusalMessage(answer: Answer): string | null {
  const status = answer.body?.status;
  if (status === "unauthorized") return identityMessage(typeof answer.body?.code === "string" ? answer.body.code : undefined);
  if (status === "forbidden") return "この操作は受け付けられませんでした（同じ画面から開き直してください）。";
  return null;
}

/** Read results: anything not in the read vocabulary is `unavailable`. */
export function mapReadAnswer<T>(answer: Answer): ContentDraftReadResult<T> {
  const refused = refusalMessage(answer);
  if (refused) return { status: "unavailable", message: refused };
  const status = answer.body?.status;
  if (typeof status === "string" && READ_STATUSES.has(status)) return answer.body as ContentDraftReadResult<T>;
  return { status: "unavailable", message: `編集サーバーから想定外の応答がありました（HTTP ${answer.httpStatus}）。` };
}

/** Write results: a refusal before the handler is `unavailable`, an unknown answer is `uncertain`. */
export function mapWriteAnswer<T>(answer: Answer, operationId: string | null, statuses: ReadonlySet<string>): T {
  const refused = refusalMessage(answer);
  if (refused) return { status: "unavailable", message: refused } as T;
  const status = answer.body?.status;
  if (typeof status === "string" && statuses.has(status)) return answer.body as T;
  const message = `保存結果を確認できませんでした（HTTP ${answer.httpStatus}）。`;
  if (operationId === null) return { status: "unavailable", message } as T;
  return { status: "uncertain", message, operationId } as T;
}

export function createTransport(fetcher: typeof fetch = (input, init) => fetch(input, init)): ContentEditorStorage {
  return {
    read: async () => mapReadAnswer<ContentDraftState>(await send(fetcher, "/draft")),
    apply: async (input: ContentEditorApplyInput) =>
      mapWriteAnswer<HostContentApplyResult>(await send(fetcher, "/operations", { body: input, idempotencyKey: input.operationId }), input.operationId, APPLY_STATUSES),
    readReceipt: async (operationId) => mapReadAnswer<ContentOperationReceipt>(await send(fetcher, `/operations/${encodeURIComponent(operationId)}`)),
    // A snapshot is an idempotent freeze of one revision; an unknown answer is simply not a snapshot.
    snapshot: async (input) => mapWriteAnswer<ContentDraftMutationResult<ContentSnapshotRecord>>(await send(fetcher, "/snapshots", { body: input }), null, MUTATION_STATUSES),
  };
}
