import { useEffect, useRef } from "preact/hooks";
import type { PublicationRequestSummary } from "./publication";
import { routeLabel } from "./groups";

// The explicit confirmation before 公開を申請 sends anything: the exact
// snapshot identity and what will (and will not) happen.

export interface PublishDialogProps {
  readonly summary: PublicationRequestSummary;
  /** The draft revision the acknowledged preview showed (= the snapshot's). */
  readonly revision: number | null;
  readonly route: string;
  onAnswer(confirmed: boolean): void;
}

export function PublishDialog({ summary, revision, route, onAnswer }: PublishDialogProps) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal?.();
  }, []);
  const { submission } = summary;
  return (
    <dialog class="pinsel-dialog" ref={dialog} aria-labelledby="pinsel-publish-title" onCancel={(event) => { event.preventDefault(); onAnswer(false); }}>
      <h2 id="pinsel-publish-title">公開を申請しますか？</h2>
      <p>プレビューで確認した次の保存済み下書きを、そのまま公開用に申請します。</p>
      <dl class="pinsel-dialog__identity">
        <dt>下書きの改訂</dt>
        <dd data-testid="publish-revision">{revision === null ? "–" : `改訂 ${revision}`}</dd>
        <dt>スナップショット</dt>
        <dd><code data-testid="publish-snapshot">{submission.snapshotId}</code></dd>
        <dt>元になる公開版</dt>
        <dd><code>{submission.baselineRevision}</code></dd>
        <dt>部品セット</dt>
        <dd><code>{submission.packageIdentity.packId}@{submission.packageIdentity.packVersion}</code></dd>
        <dt>確認したページ</dt>
        <dd>{routeLabel(route)}</dd>
      </dl>
      <ul class="pinsel-dialog__effects">
        <li>文章・料金などのコンテンツだけを変更する申請（コンテンツのみのプルリクエスト）を作成します。サイトの構成・デザイン・ページの追加は変わりません。</li>
        <li>状況は「公開申請済み → ビルド中 → 検証済み → 反映済み」と進みます。</li>
        <li>「公開中」になるには公開サービスからの公開確認が必要です。この環境ではまだ設定されていないため、「公開中」とは表示されません。</li>
        <li>申請後に編集した内容は、この申請には含まれません。</li>
      </ul>
      <div class="pinsel-dialog__actions">
        <button type="button" class="pinsel-button" onClick={() => onAnswer(false)}>やめる</button>
        <button type="button" class="pinsel-button pinsel-button--primary" onClick={() => onAnswer(true)}>この内容で申請する</button>
      </div>
    </dialog>
  );
}
