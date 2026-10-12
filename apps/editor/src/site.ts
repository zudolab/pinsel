import type { ContentEditorAssetCatalog, MountContentEditorOptions } from "zudo-composer/content-editor";

// `GET /api/v1/site`: everything the host page needs before it can mount the
// editor. The Worker is authoritative for all of it; the editor only presents.

export interface SitePreviewTarget {
  readonly snapshotId: string;
  readonly revision: number;
}

export interface SiteDescription {
  readonly status: "ok";
  readonly projectId: string;
  readonly providerId: string;
  readonly baselineRevision: string;
  readonly pack: { readonly packId: string; readonly packVersion: string };
  /** Upstream `ContentExportPackageIdentity.contractVersion`; not in the Gate-1 contract, 1 when absent. */
  readonly contractVersion?: number;
  readonly policy: MountContentEditorOptions["policy"];
  readonly routes: readonly string[];
  readonly preview: { readonly url: string; readonly origin: string; readonly route: string };
  /** Immutable snapshot of the integrated baseline for the comparison frame; not in the Gate-1 contract (asked of #11). */
  readonly baselinePreview?: SitePreviewTarget | null;
  /** Read-only committed asset catalog; not in the Gate-1 contract and absent while no model has asset fields. */
  readonly assets?: ContentEditorAssetCatalog;
  readonly actor?: { readonly subject: string };
}

export class SiteUnavailableError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SiteUnavailableError";
  }
}

const IDENTITY_MESSAGES: Record<string, string> = {
  "configuration-required": "編集サーバーの設定が完了していません。管理者に連絡してください。",
  "missing-assertion": "ログインが必要です。ページを開き直してログインしてください。",
  "invalid-assertion": "ログイン情報を確認できませんでした。ページを開き直してログインしてください。",
  "not-allowed": "このアカウントには編集の権限がありません。",
};

export function identityMessage(code: string | undefined): string {
  return (code && IDENTITY_MESSAGES[code]) ?? "編集サーバーに接続できませんでした。";
}

export async function describeSite(fetcher: typeof fetch = fetch): Promise<SiteDescription> {
  let response: Response;
  try {
    response = await fetcher("/api/v1/site", { headers: { accept: "application/json" }, credentials: "same-origin" });
  } catch {
    throw new SiteUnavailableError("編集サーバーに接続できませんでした。通信状態を確認して再読み込みしてください。", "network");
  }
  let body: { status?: string; code?: string; message?: string };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new SiteUnavailableError(`サイト情報を読み取れませんでした（HTTP ${response.status}）。`, "malformed");
  }
  if (body.status === "unauthorized" || body.status === "forbidden") throw new SiteUnavailableError(identityMessage(body.code), body.code ?? body.status);
  if (!response.ok || body.status !== "ok") throw new SiteUnavailableError(`サイト情報を取得できませんでした（HTTP ${response.status} ${body.message ?? body.status ?? ""}）。`, body.status ?? "unknown");
  return body as SiteDescription;
}
