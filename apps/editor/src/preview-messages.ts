/** Japanese preview failure text. Kept free of Composer imports: the preview iframe bundles it. */
export interface PreviewIncompleteField { code: string; modelId: string; model: string; entryId: string; fieldId: string; field: string }
const MAX_LISTED = 5;
const isField = (value: unknown): value is PreviewIncompleteField => !!value && typeof value === "object" && ["code", "model", "entryId", "field"].every(key => typeof (value as Record<string, unknown>)[key] === "string");
export function describeIncompleteField(field: PreviewIncompleteField): string {
 return `${field.model}「${field.entryId}」の「${field.field}」${field.code === "required-value-missing" ? "が空です" : "の内容が不完全です"}`;
}
/** Message for a failed `/preview/document` or `/preview/ai-document` response. */
export function previewFailureMessage(status: number, body: unknown): string {
 const error = body && typeof body === "object" ? (body as { error?: { code?: unknown; diagnostics?: unknown } }).error : undefined;
 if (error?.code === "incomplete") {
  const fields = Array.isArray(error.diagnostics) ? error.diagnostics.filter(isField) : [];
  if (!fields.length) return "必須の内容が不足しているため、プレビューできません。入力内容を確認して保存してから、もう一度プレビューしてください。";
  const listed = fields.slice(0, MAX_LISTED).map(describeIncompleteField).join("、");
  const more = fields.length > MAX_LISTED ? `（ほか ${fields.length - MAX_LISTED} 件）` : "";
  return `プレビューできません。${listed}${more}。必須項目が1つでも空のままだと、どのページもプレビューできません。入力して保存してから、もう一度プレビューしてください。`;
 }
 if (status === 401) return "ログインが必要です。編集内容はこのブラウザに保持されています。";
 if (status === 404 || error?.code === "not-found") return "プレビューするページまたはスナップショットが見つかりません。保存してから、もう一度プレビューしてください。";
 return `プレビューを作成できませんでした（HTTP ${status}）。保存内容は保持されています。もう一度お試しください。`;
}
