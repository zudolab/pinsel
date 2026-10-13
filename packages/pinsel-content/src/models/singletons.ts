import { defineModel } from "./define";

// Field order inside each model is the editor's display order. Keys name the
// rendered slot; values come from the approved seed (`content.json` plus the
// copy the prototype build hard-codes), see docs/content-model.md.
// These are "singletons" in meaning but `collection` in kind with exactly one
// entry (no create/delete in the policy): Composer 7ca114a3 only injects
// collection models through attachments, and every page needs several of
// them. Multi-item copy is long-text with one item per line because list
// fields cannot be bound to component props.

export const siteCopyModel = defineModel({
  id: "site-copy",
  name: "サイト共通コピー",
  description: "ヘッダー・フッター・トップページ・ノート一覧・404 の文言（1件のみ）",
  kind: "collection",
  fields: [
    { key: "brandWord", label: "ブランド名", kind: "text" },
    { key: "brandSub", label: "ブランド副題", kind: "text" },
    { key: "heroLabel", label: "ヒーロー ラベル", kind: "text" },
    { key: "heroTitleLines", label: "ヒーロー 見出し（1行ずつ改行）", kind: "long-text" },
    { key: "heroLead", label: "ヒーロー 本文（改行区切り）", kind: "long-text" },
    { key: "heroPrimaryLabel", label: "ヒーロー 主ボタン", kind: "text" },
    { key: "heroPricingLabel", label: "ヒーロー 料金リンク", kind: "text" },
    { key: "heroMetaLine", label: "ヒーロー下 キャッチ", kind: "text" },
    { key: "heroIntro", label: "ヒーロー下 紹介文", kind: "long-text" },
    { key: "forYouTitle", label: "トップ「こんな方へ」見出し", kind: "text" },
    { key: "pricingTitle", label: "トップ 料金 見出し", kind: "text" },
    { key: "pricingNote", label: "トップ 料金 注記", kind: "text" },
    { key: "pricingMoreLabel", label: "トップ 料金 詳細リンク", kind: "text" },
    { key: "instructorTitle", label: "トップ 講師 見出し", kind: "text" },
    { key: "instructorDetailLabel", label: "講師 詳細リンク", kind: "text" },
    { key: "resultsTitle", label: "トップ 合格実績 見出し", kind: "text" },
    { key: "voicesTitle", label: "トップ 生徒の声 見出し", kind: "text" },
    { key: "faqTitle", label: "トップ FAQ 見出し", kind: "text" },
    { key: "moreLabel", label: "「もっと見る」", kind: "text" },
    { key: "ctaTitle", label: "CTA 見出し", kind: "text" },
    { key: "ctaButtonLabel", label: "CTA ボタン", kind: "text" },
    { key: "statsResultsNumber", label: "実績数（表示）", kind: "text" },
    { key: "statsResultsLabel", label: "実績数 ラベル", kind: "text" },
    { key: "statsSchoolsNumber", label: "合格校数（表示）", kind: "text" },
    { key: "statsSchoolsLabel", label: "合格校数 ラベル", kind: "text" },
    { key: "notesIndexTitle", label: "ノート一覧 見出し", kind: "text" },
    { key: "notesIndexDescription", label: "ノート一覧 説明", kind: "long-text" },
    { key: "noteEyebrow", label: "ノート記事 小見出し", kind: "text" },
    { key: "allNotesLabel", label: "「All Notes」", kind: "text" },
    { key: "contentsLabel", label: "「Contents」", kind: "text" },
    { key: "notFoundTitle", label: "404 見出し", kind: "text" },
    { key: "notFoundBody", label: "404 本文", kind: "long-text" },
    { key: "notFoundLinkLabel", label: "404 リンク", kind: "text" },
    { key: "footerInstagramLabel", label: "フッター Instagram 表示名", kind: "text" },
    { key: "footerCopyright", label: "コピーライト", kind: "text" },
    { key: "backToTopLabel", label: "「ページの先頭へ」", kind: "text" },
  ],
});

export const lessonsCopyModel = defineModel({
  id: "lessons-copy",
  name: "オンラインクラス ページ文言",
  description: "/lessons/ の見出し・本文・目次ラベル（1件のみ）",
  kind: "collection",
  fields: [
    { key: "tocForYou", label: "目次 受講をお勧めする方", kind: "text" },
    { key: "tocCourse", label: "目次 授業内容", kind: "text" },
    { key: "tocPricing", label: "目次 クラス価格", kind: "text" },
    { key: "tocConsultation", label: "目次 有料進路相談", kind: "text" },
    { key: "tocInstructor", label: "目次 講師紹介", kind: "text" },
    { key: "tocSpecializations", label: "目次 専攻分野", kind: "text" },
    { key: "tocGraduates", label: "目次 美大卒の方へ", kind: "text" },
    { key: "tocKnowledge", label: "目次 受験について知る", kind: "text" },
    { key: "forYouTitle", label: "お勧めする方 見出し", kind: "text" },
    { key: "courseTitle", label: "授業内容 見出し", kind: "text" },
    { key: "courseIntro", label: "授業内容 本文", kind: "long-text" },
    { key: "pricingTitle", label: "クラス価格 見出し", kind: "text" },
    { key: "pricingScheduleNote", label: "レッスンスケジュール", kind: "long-text" },
    { key: "pricingContinueNote", label: "継続受講 注記", kind: "long-text" },
    { key: "pricingPaymentNote", label: "お支払い 注記", kind: "long-text" },
    { key: "consultationTitle", label: "有料進路相談 見出し", kind: "text" },
    { key: "consultationTopicsTitle", label: "面談で話す内容 見出し", kind: "text" },
    { key: "consultationTopics", label: "面談で話す内容（1項目ずつ改行）", kind: "long-text" },
    { key: "consultationFaqTitle", label: "よくある質問 見出し", kind: "text" },
    { key: "consultationFaqTopics", label: "よくある質問（1項目ずつ改行）", kind: "long-text" },
    { key: "instructorTitle", label: "講師紹介 見出し", kind: "text" },
    { key: "careerTitle", label: "経歴 見出し", kind: "text" },
    { key: "specializationsTitle", label: "専攻分野 見出し", kind: "text" },
    { key: "specializationsNote", label: "専攻分野 補足", kind: "long-text" },
    { key: "graduatesTitle", label: "美大卒の方へ 見出し", kind: "text" },
    { key: "graduatesParagraphs", label: "美大卒の方へ 本文（1段落ずつ改行）", kind: "long-text" },
    { key: "knowledgeTitle", label: "受験について知る 見出し", kind: "text" },
  ],
});

export const aboutCopyModel = defineModel({
  id: "about-copy",
  name: "講師紹介 ページ文言",
  description: "/about/ の見出し（1件のみ）",
  kind: "collection",
  fields: [
    { key: "birthLine", label: "生年・出身", kind: "text" },
    { key: "instagramLabel", label: "Instagram リンク文言", kind: "text" },
    { key: "careerTitle", label: "経歴 見出し", kind: "text" },
    { key: "educationTitle", label: "学歴 見出し", kind: "text" },
    { key: "messageTitle", label: "メッセージ 見出し", kind: "text" },
    { key: "featuresTitle", label: "レッスンの特長 見出し", kind: "text" },
  ],
});

export const instructorProfileModel = defineModel({
  id: "instructor-profile",
  name: "講師プロフィール",
  description: "講師の名前・肩書・各ページの紹介文（1件のみ）。経歴の年表は「年表」モデル",
  kind: "collection",
  fields: [
    { key: "name", label: "氏名", kind: "text" },
    { key: "latinName", label: "氏名（ローマ字）", kind: "text" },
    { key: "title", label: "肩書", kind: "text" },
    { key: "portraitAlt", label: "写真の代替テキスト", kind: "text" },
    { key: "homeBio", label: "トップ 紹介文", kind: "long-text" },
    { key: "lessonsBio", label: "オンラインクラス 紹介文", kind: "long-text" },
    { key: "aboutMessage", label: "講師紹介 メッセージ（1段落ずつ改行）", kind: "long-text" },
  ],
});

export const contactCopyModel = defineModel({
  id: "contact-copy",
  name: "お問い合わせ ページ文言",
  description: "/contact/ のフォーム文言・流れ・法定表記の見出し（1件のみ）",
  kind: "collection",
  fields: [
    { key: "stepsTitle", label: "お申し込みの流れ 見出し", kind: "text" },
    { key: "legalSummary", label: "特定商取引法 見出し", kind: "text" },
    { key: "formAriaLabel", label: "フォーム名（読み上げ）", kind: "text" },
    { key: "nameLabel", label: "お名前 ラベル", kind: "text" },
    { key: "emailLabel", label: "メールアドレス ラベル", kind: "text" },
    { key: "courseLabel", label: "ご希望のコース ラベル", kind: "text" },
    { key: "courseUndecidedOption", label: "コース未定の選択肢", kind: "text" },
    { key: "messageLabel", label: "ご相談内容 ラベル", kind: "text" },
    { key: "requiredLabel", label: "必須 表記", kind: "text" },
    { key: "optionalLabel", label: "任意 表記", kind: "text" },
    { key: "submitLabel", label: "送信ボタン", kind: "text" },
    { key: "submittingLabel", label: "送信中 表記", kind: "text" },
    { key: "successTitle", label: "送信完了 見出し", kind: "text" },
    { key: "successBody", label: "送信完了 本文", kind: "long-text" },
    { key: "errorMessage", label: "送信失敗 メッセージ", kind: "long-text" },
    { key: "backLabel", label: "入力画面に戻る", kind: "text" },
    { key: "valueMissingMessage", label: "未入力エラー（{label} はラベル）", kind: "text" },
    { key: "emailFormatMessage", label: "メール形式エラー", kind: "text" },
    { key: "previewNotice", label: "プレビュー注記（フォーム）", kind: "long-text" },
    { key: "successPreviewEyebrow", label: "プレビュー注記 見出し（完了画面）", kind: "text" },
    { key: "successPreviewNotice", label: "プレビュー注記（完了画面）", kind: "long-text" },
  ],
});
