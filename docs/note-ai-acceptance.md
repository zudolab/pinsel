# Note AI 限定受け入れ

実CLIはCloudでは実行しません。fakeは契約と保存経路の検証であり、実モデルの日本語編集能力を証明しません。現在のpinとNode24を使用し、個人設定・認証・model・speed・課金設定を変更しないでください。

## 自動fake回帰

rootで `pnpm exec playwright test tests/browser/note-ai.spec.ts`。重い検証は環境のheavy-guardを使用します。独立temporary D1で日常launcherを実行し、テストごとのtimeoutは最大240秒、各title/bodyケースのPrepareは2回です。停止後WorkerとNodeの両TCP portに接続を試し、ECONNREFUSEDを確認します。終了後はテスト専用stateだけ削除します。日常stateは使用しません。

`PINSEL_AI_FAKE_FIELD=body` または `title` は**fake専用の受け入れfixture**です。公開fake proposerへ渡すfieldを一つに制限します。日本語指示からscopeを推論する機能ではなく、title-only/body-only候補のhost保存・実preview・Apply・restart・Undo・手動競合を検証します。未指定のfakeはtitle/body両方を変更します。実CLIへのこの設定は起動時に拒否されます。

## x0xでのopt-in実CLI確認（手動・最大10分／Prepare最大2回）

開始前に本人が認証済みの対応CLIと設定を確認します。Cloudで得たfake成功を実CLI成功に置き換えません。独立した新規stateディレクトリを選び、初期fixtureだけで検証します。既存日常stateをreset/コピーせず、資格情報やユーザー本文を出力しません。

1. `git rev-parse HEAD`、`node --version`、`pnpm --version`、`packages/pinsel-content/package.json` のComposer full pin、contract pinを記録します。ブラウザNetworkのstate応答から `draftRevision` だけを記録し、本文付きresponse/HAR/traceは保存しません。開始時刻と10分後の停止時刻を決めます。
2. 既存設定を明示した下記のどちらか**1 provider**だけをforeground起動します。`PINSEL_AI_FAKE_FIELD` は未設定にします。`PINSEL_DOGFOOD_STATE=/absolute/new/test-state PINSEL_DOGFOOD_PORT=8798` を同じcommandへ追加します。Node hostにはランダムportが割り当てられるので、OSの `lsof -nP -iTCP -sTCP:LISTEN`（Linuxは `ss -ltnp`）で今回起動したNode/WorkerのPIDとloopback portを控えます。秘密を含むprocess environmentやtemporary `.dev.vars` は表示しません。

   ```sh
   PINSEL_AI_PROVIDER=claude-cli PINSEL_AI_MODEL=opus PINSEL_AI_EFFORT=medium pnpm dev:dogfood
   # または（既存設定を本人が確認済みの場合）
   PINSEL_AI_PROVIDER=codex-cli PINSEL_AI_MODEL=gpt-6-astra PINSEL_AI_EFFORT=medium PINSEL_AI_SERVICE_TIER=default pnpm dev:dogfood
   ```

3. provider readyを確認します。未認証・unknown・失敗ならPrepareせず停止します。資格情報の変更・CLI更新や自動再試行はしません。
4. 1回目のPrepareは「本文だけを日本語Markdownで整理。見出し、箇条書き、強調を含め、タイトルと他fieldは変更しない」。2回目は「タイトルだけを短く。本文と他fieldは変更しない」。各回でPrepare前後とpreview後のrevisionが不変であること、差分が指定fieldだけであること、Note実previewの日本語/Markdownを確認します。違うfield/entryが含まれたらApplyせず停止し、FAILとします。追加Prepareで成功まで追い込まないでください。
5. 各回の元の値はブラウザ内だけで比較し、responseや本文をファイルへ保存しません。1回目(body-only)は明示Apply後のrevisionを記録し、停止・同stateで再起動して保存済み提案を読み、Undoで全fieldの元値に戻ることを確認します。2回目(title-only)は明示Applyの後にdescriptionを手動保存し、それからUndoが競合となって手動編集を保持することを確認します（既にUndo済みの提案のreceipt再読は競合試験ではありません）。各Applyでは対象Noteの指定fieldだけが変わり、description/slug/orderと他entryの全値が不変であることを比較します。確認用に本文を記録へ貼りません。
6. 10分到達、2回のPrepare、最初の不一致/失敗、応答不明のいずれかで新規推論を止めます。応答不明は提案一覧/receiptの読み取りだけで確認し、自動再送しません。Ctrl+Cでlauncherを終了し、控えた両portを `nc -z 127.0.0.1 PORT` で調べ、接続拒否とOSのLISTEN消滅を確認します。残存時は今回記録したPIDだけを停止し、受け入れをFAILにします。

記録はsource/package/contract SHA、Node/pnpm、provider名、開始終了時刻、Prepare回数、前/Apply後/Undo後revision、結果PASS/FAIL/NOT_RUN、停止port検証の真偽だけ。token・環境変数全体・HAR・提案全文・元本文・ユーザー情報は残しません。失敗stateは勝手に削除せず保留します。記録後もfixture stateの削除は明示したテストディレクトリだけを対象にします。
