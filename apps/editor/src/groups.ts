import type { HostContentPolicy } from "zudo-composer/content";

// The client-facing content list. Composer's restricted directory lists every
// policy model in one flat grid, so the host groups them and remounts the
// editor with a policy narrowed to one group (presentation only: the Worker
// enforces the full policy on every write).

export interface ContentGroup {
  readonly id: string;
  readonly label: string;
  readonly modelIds: readonly string[];
}

export const CONTENT_GROUPS: readonly ContentGroup[] = [
  {
    id: "site",
    label: "サイト共通テキスト",
    modelIds: ["site-copy", "page-copy", "nav-link", "lessons-copy", "about-copy", "instructor-profile", "target-item", "specialization", "feature-card", "timeline-entry"],
  },
  { id: "courses", label: "コースと料金", modelIds: ["course", "course-step"] },
  { id: "results", label: "合格実績", modelIds: ["result-year", "result-entry", "home-result"] },
  { id: "voices", label: "生徒の声", modelIds: ["testimonial", "home-voice"] },
  { id: "faq", label: "よくある質問", modelIds: ["faq-group", "faq-item", "home-faq"] },
  { id: "notes", label: "Notes", modelIds: ["note", "knowledge-card"] },
  { id: "contact", label: "お問い合わせ", modelIds: ["contact-copy", "contact-step"] },
  { id: "legal", label: "特定商取引法", modelIds: ["legal-row"] },
];

const OTHER_GROUP_ID = "other";

/** The groups that hold at least one policy model, plus "その他" for models no group names. */
export function groupsForPolicy(policy: HostContentPolicy): ContentGroup[] {
  const listed = Object.keys(policy.models);
  const groups = CONTENT_GROUPS.map((group) => ({ ...group, modelIds: group.modelIds.filter((id) => listed.includes(id)) })).filter((group) => group.modelIds.length > 0);
  const grouped = new Set(groups.flatMap((group) => group.modelIds));
  const rest = listed.filter((id) => !grouped.has(id));
  if (rest.length > 0) groups.push({ id: OTHER_GROUP_ID, label: "その他", modelIds: rest });
  return groups;
}

/** The presentation policy for one group; the server keeps the full policy. */
export function policyForGroup(policy: HostContentPolicy, group: ContentGroup): HostContentPolicy {
  return { ...policy, models: Object.fromEntries(Object.entries(policy.models).filter(([id]) => group.modelIds.includes(id))) };
}

const ROUTE_LABELS: Record<string, string> = {
  "/": "トップ",
  "/lessons/": "オンラインクラス",
  "/about/": "講師紹介",
  "/results/": "合格実績",
  "/voices/": "生徒の声",
  "/faq/": "よくある質問",
  "/notes/": "Notes 一覧",
  "/contact/": "お問い合わせ",
  "/404.html": "ページが見つかりません",
};

export function routeLabel(route: string): string {
  const known = ROUTE_LABELS[route];
  if (known) return `${known}（${route}）`;
  if (route.startsWith("/notes/")) return `Notes 記事（${route}）`;
  return route;
}
