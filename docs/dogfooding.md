# Pinsel Hosted Content dogfooding

Node.js **24.x** と pnpm **11.5.2** を使用します。初回は `pnpm install --frozen-lockfile`、以後はルートで次を実行します。

```sh
pnpm dev:dogfood
```

URL: **http://127.0.0.1:8787/editor/**

通常起動は assets/content/editor を準備し、**local** migration のみ適用して real workerd と D1 を起動します。永続 state は `apps/authoring-worker/.wrangler/dogfood/`。停止は Ctrl+C。次回起動で同じ下書き・履歴・snapshot・receiptを再利用し、DBをresetしません。`PINSEL_DOGFOOD_PORT`、`PINSEL_DOGFOOD_STATE` でポートと絶対stateパスを変更できます。テストは `hosted-e2e` 等または一時ディレクトリを使い、この日常stateを削除しません。

「編集する項目」で Note、FAQ、料金等を選び、保存します。Noteではタイトル・説明・Markdown本文、FAQでは質問・回答、料金では表示価格等を編集できます。順序・slug・構造の追加削除は今回のUI対象外です。「プレビュー」は保存後にimmutable snapshotを取得し、host所有のiframeに実サイトと同じrendererで描画します。別のページを見たい場合はプレビューページを選びます。画像・フォントの読み込みとsnapshot ID/digest/revision/definition/route一致を確認してから「確認済み」にします。

履歴は保存と同じD1 atomic commitで保持されます。「履歴を読み込む」で値を確認し、選んだ履歴を新しい下書きとして復元できます。競合時はローカル入力を保持し、現在のサーバー内容との比較と明示的な再適用/破棄を行います。復元もexpected identitiesを検証するため、新しい手動編集を黙って上書きしません。

応答を失った場合は「保存」で**同じoperationKey**のreceiptを照会・再試行します。ブラウザのlocalStorageにはactor/site/session単位のcheckpointを保存します。同じタブのreloadは編集対象も回復します。ブラウザ終了後にルートURLへ戻った場合は「保存済み回復セッション」から未完了セッションを選び、「このセッションを回復」→「保存」を実行します。Web Locksで開いているセッションを排他所有し、opener/複製タブは別のIDを取得します。現在開いている別タブのsessionは横取りしません。ブラウザデータを消すと未保存checkpointも消えるため、回復前に消さないでください。

## 確定snapshotからローカルbuild

プレビュー確認後「確定スナップショットを保存」でJSONを保存します。

```sh
pnpm build:snapshot -- /absolute/path/pinsel-snapshot-ID.json
```

出力は `.dogfood/builds/ID/`。snapshot Aのpublic projectionを共通rendererでHTML化します。snapshot digestと現在のhost definition/pack/policyを検証し、`build-evidence.json` にsource SHA、dirty状態、package/contract pin、Node、snapshotのidentityを残します。互換性のないdefinitionは拒否し、そのsnapshotを作った確認済みcheckoutを使うよう案内します。**content/entries・D1・baselineは書き換えないため、後続draft Bは残ります。**

## 保存契約と移行

`zudo-composer/hosted-content` を使用し、editorは `/hosted-content/editor` のprebuilt bundleと明示的 `editor.css`、previewは `/hosted-content/preview` を使用します。旧content-editor Vite plugin/mock APIは廃止しました。

D1 migration0004はhost専用 `pinsel_hosted_*` テーブルを追加します。commitはexpected storage version、実UPDATE件数のNOT NULL guard、receipt/snapshot/revisionのunique制約を**同じD1 batch**で検証し、拒否時は全部rollbackします。opaque draftRevision、snapshot id、digestは別々です。GETも含め全ルートは認証され、RPCは同一origin JSON必須です。production entryはAccess JWTが未設定ならfail-closed、local entryのみ固定fixture identityを使います。

旧baseline/draftテーブルがあれば、初回だけ完全な旧draftを検査して新headへ移し、旧baseline/draftのJSON archiveを `pinsel_hosted_migration` へ同時保存します。旧テーブル・history・receiptも残します。旧receiptは新definitionの操作として再利用しません。未知entry/型不整合/投影不可なら初期化を拒否し、元DBはそのまま保持します。既存hosted headに対する新definitionの自動adopt/resetはありません。明示的移行の調査・dry-runを要します。

このCloud checkoutに存在したDBはS1テスト生成の3stateのみで、日常ユーザーdraftは発見されませんでした。committed content/entriesとapproved-seedは保持しています。

## 今回の範囲

publication/deliveryは**実装経路を停止**しています。公開操作はconfiguration-requiredとなり、GitHub provider・scheduled deliveryはWorkerへ組み込みません。画面にも公開無効と表示します。旧publication記録のread-only CI検証は `scripts/publication/legacy-record.ts` に残しますが、新snapshotのid=digestとは扱いません。本番deploy、npm release、remote D1、実メール送信は行いません。Note AIは後続S5です。

旧API固有のfixture/mock/providerテストは新Hosted契約のreal D1/browser/production auth/snapshotA-build-draftB検証へ置き換えました。public site・renderer・static fidelity・approved-seed・content型/参照/route検証は保持。golden planは新public projectionのstatus/metadata形へ更新し、Node release compilerとWorker-safe projectionのroute一致を引き続き確認します。historical baseline digestの末尾改行は保持しています。

検証コマンド: `pnpm typecheck`, `pnpm test`, `pnpm verify:auth`, `pnpm verify:publication`, `pnpm test:browser`。`verify:publication` は現在、local snapshotのbuild/restart保存検証であり、公開配信を行いません。
