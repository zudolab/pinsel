import { defineModel } from "./define";

// Every collection carries an `order` number. The client reorders through the
// policy's `reorder-entries` operation, never by editing `order` directly.
const order = { key: "order", label: "表示順", kind: "number" } as const;

export const pageCopyModel = defineModel({
  id: "page-copy",
  name: "ページ見出しとメタ情報",
  description: "ルートごとの <title>・meta description・ページ見出し・CTA 文言（9件、追加不可）",
  kind: "collection",
  fields: [
    { key: "route", label: "ルート", kind: "url" },
    { key: "metaTitle", label: "ページタイトル", kind: "text" },
    { key: "metaDescription", label: "meta description", kind: "long-text", required: false },
    { key: "headerTitle", label: "ページ見出し", kind: "text", required: false },
    { key: "headerDescription", label: "ページ説明", kind: "long-text", required: false },
    { key: "asideLabel", label: "サイド目次 ラベル", kind: "text", required: false },
    { key: "ctaSubCopy", label: "CTA 補足文", kind: "text", required: false },
    order,
  ],
});

export const navLinkModel = defineModel({
  id: "nav-link",
  name: "ナビゲーションリンク",
  description: "ヘッダー・フッターの共通リンク（7件、追加不可）。リンク先は変更不可",
  kind: "collection",
  fields: [
    { key: "href", label: "リンク先", kind: "url" },
    { key: "label", label: "英語ラベル", kind: "text" },
    { key: "headerLabel", label: "ヘッダー表示名", kind: "text" },
    { key: "footerTitle", label: "フッター見出し", kind: "text" },
    { key: "footerDescription", label: "フッター説明", kind: "text" },
    order,
  ],
});

export const courseModel = defineModel({
  id: "course",
  name: "コース・料金",
  description: "進路相談・2ヶ月・4ヶ月（3件、追加不可。並び順は ?course= の番号に対応）",
  kind: "collection",
  fields: [
    { key: "name", label: "コース名", kind: "text" },
    { key: "price", label: "価格（表示）", kind: "text" },
    { key: "unit", label: "回数・単位", kind: "text" },
    { key: "homeDescription", label: "トップ 説明", kind: "text" },
    { key: "lessonsNote", label: "クラス価格 補足", kind: "text" },
    { key: "contactOptionLabel", label: "お問い合わせ 選択肢名", kind: "text" },
    { key: "featured", label: "人気表示", kind: "boolean" },
    order,
  ],
});

export const courseStepModel = defineModel({
  id: "course-step",
  name: "授業の流れ",
  description: "/lessons/ 授業内容カード（3件）",
  kind: "collection",
  fields: [
    { key: "title", label: "見出し", kind: "text" },
    { key: "description", label: "説明", kind: "long-text" },
    order,
  ],
});

export const targetItemModel = defineModel({
  id: "target-item",
  name: "こんな方へ",
  description: "トップ（5件）と /lessons/（7件）のチェックリスト。別々に管理",
  kind: "collection",
  fields: [
    {
      key: "page",
      label: "掲載ページ",
      kind: "choice",
      options: [
        { value: "home", label: "トップ" },
        { value: "lessons", label: "オンラインクラス" },
      ],
    },
    { key: "text", label: "項目", kind: "text" },
    order,
  ],
});

export const specializationModel = defineModel({
  id: "specialization",
  name: "専攻分野",
  description: "/lessons/ 専攻分野一例（9件）",
  kind: "collection",
  fields: [
    { key: "de", label: "ドイツ語名", kind: "text" },
    { key: "ja", label: "日本語名", kind: "text" },
    order,
  ],
});

export const featureCardModel = defineModel({
  id: "feature-card",
  name: "レッスンの特長",
  description: "/about/ 特長カード（4件）",
  kind: "collection",
  fields: [
    { key: "title", label: "見出し", kind: "text" },
    { key: "description", label: "説明", kind: "long-text" },
    order,
  ],
});

export const timelineEntryModel = defineModel({
  id: "timeline-entry",
  name: "年表",
  description: "/lessons/ 経歴（7件）、/about/ 経歴（6件）・学歴（2件）。3つの年表は別々に管理",
  kind: "collection",
  fields: [
    {
      key: "timeline",
      label: "年表",
      kind: "choice",
      options: [
        { value: "lessons-career", label: "オンラインクラス 経歴" },
        { value: "about-career", label: "講師紹介 経歴" },
        { value: "about-education", label: "講師紹介 学歴" },
      ],
    },
    { key: "year", label: "年", kind: "text" },
    { key: "text", label: "内容", kind: "text" },
    order,
  ],
});

export const resultYearModel = defineModel({
  id: "result-year",
  name: "合格実績 年度",
  description: "年度見出しと件数（11件）。件数は手入力の数値で、明細の行数とは独立",
  kind: "collection",
  fields: [
    { key: "label", label: "年度", kind: "text" },
    { key: "declaredCount", label: "件数", kind: "number" },
    order,
  ],
});

export const resultEntryModel = defineModel({
  id: "result-entry",
  name: "合格実績 明細",
  description: "大学・学科の行（105件）。URL は許可リストの大学のみ",
  kind: "collection",
  fields: [
    { key: "year", label: "年度", kind: "reference", target: "result-year" },
    { key: "school", label: "大学名", kind: "text" },
    { key: "department", label: "学科", kind: "text" },
    { key: "url", label: "大学サイト", kind: "url", required: false },
    order,
  ],
});

export const homeResultModel = defineModel({
  id: "home-result",
  name: "トップ 合格実績カード",
  description: "トップページの抜粋（6件）。詳細ページとは別に管理",
  kind: "collection",
  fields: [
    { key: "yearLabel", label: "年", kind: "text" },
    { key: "school", label: "大学名", kind: "text" },
    { key: "detail", label: "学科", kind: "text" },
    order,
  ],
});

export const testimonialModel = defineModel({
  id: "testimonial",
  name: "生徒の声",
  description: "/voices/ の合格体験談（5件）。引用は改行で段落を分ける",
  kind: "collection",
  fields: [
    { key: "author", label: "名前", kind: "text" },
    { key: "yearLabel", label: "合格年度", kind: "text" },
    { key: "school", label: "合格校", kind: "text" },
    { key: "department", label: "学科", kind: "text" },
    { key: "quote", label: "本文", kind: "long-text" },
    order,
  ],
});

export const homeVoiceModel = defineModel({
  id: "home-voice",
  name: "トップ 生徒の声",
  description: "トップページの抜粋（3件）。/voices/ とは別の文章",
  kind: "collection",
  fields: [
    { key: "quote", label: "抜粋", kind: "long-text" },
    { key: "author", label: "名前", kind: "text" },
    { key: "school", label: "合格校（表示）", kind: "text" },
    order,
  ],
});

export const faqGroupModel = defineModel({
  id: "faq-group",
  name: "FAQ カテゴリー",
  description: "/faq/ のカテゴリー（4件）",
  kind: "collection",
  fields: [{ key: "title", label: "カテゴリー名", kind: "text" }, order],
});

export const faqItemModel = defineModel({
  id: "faq-item",
  name: "FAQ",
  description: "/faq/ の質問と回答（18件）",
  kind: "collection",
  fields: [
    { key: "group", label: "カテゴリー", kind: "reference", target: "faq-group" },
    { key: "question", label: "質問", kind: "text" },
    { key: "answer", label: "回答", kind: "long-text" },
    order,
  ],
});

export const homeFaqModel = defineModel({
  id: "home-faq",
  name: "トップ FAQ",
  description: "トップページの質問と回答（4件）。/faq/ とは別の文章",
  kind: "collection",
  fields: [
    { key: "question", label: "質問", kind: "text" },
    { key: "answer", label: "回答", kind: "long-text" },
    order,
  ],
});

export const noteModel = defineModel({
  id: "note",
  name: "ノート記事",
  description: "/notes/<slug>/ の記事（5件）。slug は URL なので変更不可",
  kind: "collection",
  fields: [
    { key: "slug", label: "URL スラッグ", kind: "slug" },
    { key: "title", label: "タイトル", kind: "text" },
    { key: "description", label: "説明", kind: "long-text" },
    { key: "body", label: "本文（Markdown）", kind: "markdown" },
    order,
  ],
});

export const knowledgeCardModel = defineModel({
  id: "knowledge-card",
  name: "受験について知る カード",
  description: "/lessons/ のノート紹介カード（5件）。文言は記事とは別",
  kind: "collection",
  fields: [
    { key: "note", label: "リンク先の記事", kind: "reference", target: "note" },
    { key: "title", label: "見出し", kind: "text" },
    { key: "description", label: "説明", kind: "text" },
    order,
  ],
});

export const contactStepModel = defineModel({
  id: "contact-step",
  name: "お申し込みの流れ",
  description: "/contact/ の手順（5件）。番号は表示順から付く",
  kind: "collection",
  fields: [
    { key: "title", label: "見出し", kind: "text" },
    { key: "description", label: "説明", kind: "text" },
    order,
  ],
});

export const legalRowModel = defineModel({
  id: "legal-row",
  name: "特定商取引法に基づく表記",
  description: "/contact/ の表の行（8件）",
  kind: "collection",
  fields: [
    { key: "key", label: "項目", kind: "text" },
    { key: "value", label: "内容", kind: "text" },
    order,
  ],
});
