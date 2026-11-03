import { HostedContentError, type HostedErrorCode, type HostedTransport } from "zudo-composer/hosted-content";
export class AuthenticationExpired extends Error {}
export async function rpc<T>(method: string, argument?: unknown): Promise<T> {
 const response = await fetch("/api/hosted/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, argument }) });
 if (response.status === 401) throw new AuthenticationExpired("ログインが必要です。編集内容はこのブラウザに保持されています。");
 const result = await response.json();
 if (!response.ok) {
  if (result.error && response.status !== 503) throw new HostedContentError(result.error.code as HostedErrorCode, result.error.message, result.error.diagnostics, result.error.restoreDiagnostics);
  throw new Error(result.error?.message ?? `HTTP ${response.status}`);
 }
 return result as T;
}
export const transport: HostedTransport = {
 readState: () => rpc("readState"), execute: request => rpc("execute", request), readReceipt: key => rpc("readReceipt", key), getPublication: id => rpc("getPublication", id),
 listModels: () => rpc("listModels"), listEntries: query => rpc("listEntries", query), readEntry: query => rpc("readEntry", query), listRevisions: query => rpc("listRevisions", query), readRevision: id => rpc("readRevision", id), compareRevisions: query => rpc("compareRevisions", query), readPublicationStatus: () => rpc("readPublicationStatus"),
};
