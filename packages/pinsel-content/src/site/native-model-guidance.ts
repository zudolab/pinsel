import type { SiteProject } from "zudo-composer/site-project";

// Exact historical descriptions only: authored/custom guidance is never replaced.
const descriptions: Readonly<Record<string, readonly [readonly string[], string]>> = {
  "nav-link": [
    ["ヘッダー・フッターの共通リンク（7件、追加不可）。リンク先は変更不可"],
    "ヘッダー・フッターで共有するリンク情報。ヘッダーの表示対象と順序は Composition と Mapping、フッターの表示順は order で管理します。",
  ],
  "page-copy": [
    ["ルートごとの <title>・meta description・ページ見出し・CTA 文言（9件、追加不可）"],
    "ルートごとの <title>・meta description・ページ見出し・CTA 文言。ページとの対応は route で管理します。",
  ],
  course: [
    [
      "進路相談・2ヶ月・4ヶ月（3件）。表示順は識別子・お問い合わせリンクとは独立",
      "進路相談・2ヶ月・4ヶ月（3件、追加不可。並び順は ?course= の番号に対応）",
    ],
    "共有するコース情報・料金・お問い合わせ選択肢。表示順は識別子・お問い合わせリンクとは独立しています。",
  ],
};

/** Explicit native import projection; never called by ordinary startup or Hosted Content. */
export function projectNativeModelGuidance(input: SiteProject): SiteProject {
  const project = structuredClone(input);
  if (project.id !== "pinsel") return project;
  for (const provider of project.providers.content) {
    if (provider.id !== "content-filesystem") continue;
    for (const model of provider.models) {
      const replacement = Object.hasOwn(descriptions, model.id) ? descriptions[model.id] : undefined;
      if (replacement && model.document.id === model.id && replacement[0].includes(model.document.description)) {
        model.document.description = replacement[1];
      }
    }
  }
  return project;
}
