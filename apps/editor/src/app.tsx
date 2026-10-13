import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CONTENT_EDITOR_LABELS_JA, type ContentEditorHandle, type ContentEditorState, type MountContentEditorOptions } from "zudo-composer/content-editor";
import type { HostPreviewBridge, HostPreviewState } from "zudo-composer/preview-protocol";
import { EditorMount } from "./editor-mount";
import { groupsForPolicy, policyForGroup, routeLabel } from "./groups";
import { translateChrome } from "./localize";
import { PREVIEW_SANDBOX, attachComparisonFrame, previewFrameOf, reloadPreviewFrame } from "./preview-frame";
import { PUBLICATION_LABELS, createPublicationAdapter, fetchPublicationStatus, publicationDisplay, type PublicationRequestSummary, type PublicationStatus } from "./publication";
import { PublishDialog } from "./publish-dialog";
import type { SiteDescription } from "./site";
import { EDITOR_LABELS, previewDisplay, saveStatusLabel } from "./status";
import { createTransport } from "./transport";

const LAST_PUBLICATION_KEY = "pinsel-editor:last-publication";
const POLL_MS = 5000;
// Required by the mount's export option but never sent: the Worker derives the package identity it builds.
const PACKAGE_CONTRACT_VERSION = 2;

interface PendingConfirm {
  readonly summary: PublicationRequestSummary;
  readonly resolve: (confirmed: boolean) => void;
}

function rememberPublication(publicationId: string): void {
  try {
    localStorage.setItem(LAST_PUBLICATION_KEY, publicationId);
  } catch {
    // Storage may be disabled; the status is still shown for this page.
  }
}

function lastPublication(): string | null {
  try {
    return localStorage.getItem(LAST_PUBLICATION_KEY);
  } catch {
    return null;
  }
}

function ComparisonFrame({ site, route }: { site: SiteDescription; route: string }) {
  const [state, setState] = useState<HostPreviewState>({ status: "idle" });
  const bridge = useRef<HostPreviewBridge | null>(null);
  const target = site.baselinePreview;
  const attach = useCallback((frame: HTMLIFrameElement | null) => {
    bridge.current?.dispose();
    bridge.current = null;
    if (!frame || !target) return;
    bridge.current = attachComparisonFrame(frame, { origin: site.preview.origin, pack: site.pack, target: { ...target, route }, onStateChange: setState });
  }, [route, target?.snapshotId, target?.revision]);
  useEffect(() => () => { bridge.current?.dispose(); bridge.current = null; }, []);
  if (!target) return <p class="pinsel-note" role="status">公開版（反映済み）のプレビューはまだ用意されていません。</p>;
  const label = state.status === "rendered" && state.request.snapshotId === target.snapshotId && state.request.route === route ? `表示中: 公開版（改訂 ${state.request.revision}）` : state.status === "error" ? `プレビューのエラー: ${state.message}` : "読み込み中";
  return (
    <section class="pinsel-compare" aria-label="公開版のプレビュー">
      <p class="pinsel-compare__state" role="status" data-compare={state.status}>{label}</p>
      <iframe key={`${target.snapshotId}${route}`} ref={attach} class="pinsel-compare__frame" sandbox={PREVIEW_SANDBOX} src={site.preview.url} title="公開版のプレビュー" />
    </section>
  );
}

export function App({ site }: { site: SiteDescription }) {
  const groups = useMemo(() => groupsForPolicy(site.policy), [site.policy]);
  const routes = site.routes.length > 0 ? site.routes : [site.preview.route];
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [route, setRoute] = useState(routes.includes(site.preview.route) ? site.preview.route : (routes[0] ?? "/"));
  const [generation, setGeneration] = useState(0);
  const [editor, setEditor] = useState<ContentEditorState | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [publication, setPublication] = useState<PublicationStatus | null>(null);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const handleRef = useRef<ContentEditorHandle | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const adoptPublication = useCallback((status: PublicationStatus) => {
    setPublication(status);
    setPublicationError(null);
    rememberPublication(status.publicationId);
  }, []);

  const adapter = useMemo(() => createPublicationAdapter({
    confirm: (summary) => new Promise<boolean>((resolve) => setPendingConfirm({ summary, resolve })),
    onStatus: adoptPublication,
  }), [adoptPublication]);

  const refreshPublication = useCallback(async (publicationId: string) => {
    const result = await fetchPublicationStatus(publicationId);
    if ("error" in result) setPublicationError(result.error);
    else adoptPublication(result);
  }, [adoptPublication]);

  useEffect(() => {
    const known = lastPublication();
    if (known) void refreshPublication(known);
  }, []);

  const settled = publication ? publicationDisplay(publication).settled : true;
  useEffect(() => {
    if (!publication || settled) return;
    const timer = setInterval(() => void refreshPublication(publication.publicationId), POLL_MS);
    return () => clearInterval(timer);
  }, [publication?.publicationId, settled]);

  const group = groups.find((candidate) => candidate.id === groupId) ?? groups[0];
  const options = useMemo<MountContentEditorOptions | null>(() => group ? {
    project: { id: site.projectId, label: `Pinsel — ${group.label}` },
    revision: site.baselineRevision,
    policy: policyForGroup(site.policy, group),
    storage: createTransport(),
    ...(site.assets ? { assets: site.assets } : {}),
    preview: { url: site.preview.url, origin: site.preview.origin, pack: site.pack, route, title: `プレビュー: ${routeLabel(route)}`, sandbox: PREVIEW_SANDBOX },
    export: { adapter, packageIdentity: { packId: site.pack.packId, packVersion: site.pack.packVersion, contractVersion: PACKAGE_CONTRACT_VERSION } },
    labels: { ...CONTENT_EDITOR_LABELS_JA, ...EDITOR_LABELS },
  } : null, [group?.id, route, generation]);

  // Leaving the current mount must not drop an edit: flush first, refuse while a conflict or failure is open.
  const switchTo = async (next: { groupId?: string; route?: string }) => {
    setSwitchError(null);
    const status = editor?.status;
    if (status === "conflict" || status === "recovering" || status === "failed") {
      setSwitchError("保存が完了していない変更があるため切り替えられません。先に下の案内に従って解決してください。");
      return;
    }
    // Nothing is editable before the draft loads, so there is nothing to flush.
    const loaded = status !== undefined && status !== "loading" && status !== "load-failed" && status !== "blocked";
    try {
      if (loaded) await handleRef.current?.flush();
    } catch (cause) {
      setSwitchError(`変更を保存できなかったため切り替えませんでした: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    if (next.groupId !== undefined) setGroupId(next.groupId);
    if (next.route !== undefined) setRoute(next.route);
  };

  const answerConfirm = (confirmed: boolean) => {
    pendingConfirm?.resolve(confirmed);
    setPendingConfirm(null);
  };

  const status = editor?.status ?? "loading";
  const saveText = saveStatusLabel(status, editor?.revision ?? null);
  const preview = editor ? previewDisplay(editor.preview, { revision: editor.revision, route, status }) : null;
  const publicationView = publication ? publicationDisplay(publication) : null;
  const confirmRevision = editor && editor.preview.status !== "idle" ? editor.preview.request.revision : null;

  if (!group || !options) return <p role="alert" class="pinsel-note">編集できる項目がありません。</p>;

  return (
    <div class="pinsel-editor">
      <header class="pinsel-editor__bar">
        <h1 class="pinsel-editor__title">Pinsel 編集</h1>
        <p class="pinsel-editor__status" role="status" aria-live="polite" data-save-status={status} data-testid="save-status">
          {saveText}{editor?.message && status !== "conflict" ? ` — ${translateChrome(editor.message) ?? editor.message}` : ""}
        </p>
        <p class="pinsel-editor__preview-status" role="status" data-preview={preview?.kind ?? "idle"} data-testid="preview-status">{preview?.label ?? "プレビュー未表示"}</p>
        <div class="pinsel-editor__publication" data-testid="publication-status" data-publication-state={publicationView?.kind === "state" ? publicationView.state : publicationView ? "unverified" : "none"}>
          <span>公開状況: {publicationView ? publicationView.label : site.publication && "state" in site.publication ? PUBLICATION_LABELS["configuration-required"] : "未申請"}</span>
          {publication ? <button type="button" class="pinsel-button pinsel-button--small" onClick={() => void refreshPublication(publication.publicationId)}>状況を更新</button> : null}
        </div>
        {site.actor ? <span class="pinsel-editor__actor">{site.actor.subject}</span> : null}
      </header>
      {publication?.message || publication?.evidence ? (
        <p class="pinsel-note" data-testid="publication-detail">
          {publication.message ? `${publication.message} ` : ""}
          {publication.evidence?.pr ? <a href={publication.evidence.pr} target="_blank" rel="noreferrer">プルリクエスト</a> : null}
          {publication.evidence?.commit ? ` コミット ${publication.evidence.commit.slice(0, 12)}` : ""}
        </p>
      ) : null}
      {publicationError ? <p class="pinsel-banner pinsel-banner--error" role="alert">{publicationError}</p> : null}
      {switchError ? <p class="pinsel-banner pinsel-banner--error" role="alert">{switchError}</p> : null}
      {status === "conflict" ? (
        <section class="pinsel-banner pinsel-banner--warn" aria-label="競合の解決" data-testid="conflict-panel">
          <p><strong>競合:</strong> 他の方（または別の画面）が先に保存しました。あなたの変更はまだ保存されていません。</p>
          <ul>
            <li>編集欄の上の「自分の変更を再適用」を押すと、最新の内容にあなたの変更を重ねて保存し直します。</li>
            <li>「最新の内容を使う」を押すか、下のボタンで読み込み直すと、あなたの変更は破棄されます。</li>
          </ul>
          <button type="button" class="pinsel-button" onClick={() => { setSwitchError(null); setGeneration((value) => value + 1); }}>最新の内容を読み込み直す（自分の変更を破棄）</button>
        </section>
      ) : null}
      <div class="pinsel-editor__layout">
        <nav class="pinsel-editor__groups" aria-label="コンテンツの種類">
          <ul>
            {groups.map((candidate) => (
              <li key={candidate.id}>
                <button type="button" class="pinsel-group" aria-current={candidate.id === group.id ? "page" : undefined} onClick={() => void switchTo({ groupId: candidate.id })}>{candidate.label}</button>
              </li>
            ))}
          </ul>
        </nav>
        <main class="pinsel-editor__main">
          <div class="pinsel-editor__toolbar">
            <label class="pinsel-field">
              <span>プレビューするページ</span>
              <select value={route} onChange={(event) => void switchTo({ route: event.currentTarget.value })} data-testid="route-select">
                {routes.map((candidate) => <option key={candidate} value={candidate}>{routeLabel(candidate)}</option>)}
              </select>
            </label>
            <button type="button" class="pinsel-button" onClick={() => { const frame = rootRef.current && previewFrameOf(rootRef.current); if (frame) reloadPreviewFrame(frame); }}>プレビューを再読み込み</button>
            <button type="button" class="pinsel-button" aria-pressed={compare} onClick={() => setCompare(!compare)} disabled={!site.baselinePreview} title={site.baselinePreview ? undefined : "公開版のプレビューはまだ用意されていません"}>
              {compare ? "比較を閉じる" : "公開版（反映済み）と比較"}
            </button>
          </div>
          {compare ? <ComparisonFrame site={site} route={route} /> : null}
          <EditorMount options={options} mountKey={`${group.id}|${route}|${generation}`} onState={setEditor} handleRef={handleRef} rootRef={rootRef} />
        </main>
      </div>
      {pendingConfirm ? <PublishDialog summary={pendingConfirm.summary} revision={confirmRevision} route={route} onAnswer={answerConfirm} /> : null}
    </div>
  );
}
