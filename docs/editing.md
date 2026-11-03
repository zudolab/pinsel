# ローカルで文章・料金を編集する

現在の編集画面はローカル dogfooding 用です。本番ログインや公開配信は未提供で、「保存」は公開ではありません。実行環境と保存契約は [dogfooding.md](dogfooding.md)、AIの限定受け入れは [note-ai-acceptance.md](note-ai-acceptance.md) を参照してください。

1. Node 24とrepo指定pnpmで `pnpm install --frozen-lockfile`、続けてrootで `pnpm dev:dogfood`。`http://127.0.0.1:8787/editor/` を開きます。
2. 「編集する項目」でNote、FAQ、料金を選びます。Noteのタイトル・説明・Markdown本文、FAQの質問・回答、料金の表示テキストを変更し「保存」します。
3. 保存後「プレビュー」で現在のsnapshotを確認します。ページ切替は「プレビューページ」で行います。Note AIの候補previewはまだ保存されていない内容です。
4. 「履歴を読み込む」で変更内容を確認します。復元は新しいrevisionとして保存します。2タブの競合では新しい保存内容を黙って上書きせず、入力を保持します。
5. 応答を失った場合は通常編集の「保存」で同じ操作を回復します。閉じたタブは「保存済み回復セッション」から選びます。不正・未対応の記録の警告が出ても元記録は保持され、新セッションで通常編集できます。localStorageを消さないでください。
6. Ctrl+Cで停止。次回も同じcommandで起動します。永続D1は `apps/authoring-worker/.wrangler/dogfood/` に残り、通常起動でresetしません。

Note AIは既定fakeです。providerがreadyの場合だけ新規提案を作れます。未認証・unknown・状態取得失敗は起動/認証を確認し「providerを再確認」。保存済み提案の再確認・Undoと通常編集は別経路で利用できます。差分→候補の実preview→明示Applyが必要で、Apply後の手動変更はUndoの競合になります。AIはtitle/bodyだけを対象とし、description・slug・order・別Entryは変更しません。

確定snapshotはダウンロードして `pnpm build:snapshot -- /absolute/path/snapshot.json` でローカルbuildできます。後続draftは変更しません。旧API・旧publication設計は歴史資料であり、現在の画面操作や配信手順ではありません。
