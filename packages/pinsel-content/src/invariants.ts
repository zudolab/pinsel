// Structure the client editor can never change. Values are the approved
// prototype's (seed 2026-10-12, build.py / ui.py / site.js) — the migration
// sub-issue reproduces them with `defineSite`, the checker and the publication
// gate assert them.

/** `astro.config.mjs` `site`; also the 特定商取引法 URL row. */
export const SITE_ORIGIN = "https://pinsel-germany.com";

export const INSTAGRAM_URL = "https://www.instagram.com/yuko_takatsudo";

export const NOTE_SLUGS = [
  "exam-schedule",
  "free-tuition",
  "german-language",
  "online-exam",
  "what-is-mappe",
] as const;
export type NoteSlug = (typeof NOTE_SLUGS)[number];

/** Notes-index card order (`build.py notes_index()`); the seed `note.order` values follow it. */
export const NOTE_INDEX_ORDER: readonly NoteSlug[] = [
  "free-tuition",
  "what-is-mappe",
  "exam-schedule",
  "online-exam",
  "german-language",
];

export const PAGE_ROUTES = ["/", "/lessons/", "/about/", "/results/", "/voices/", "/faq/", "/notes/", "/contact/"] as const;
export const NOTE_ROUTES = NOTE_SLUGS.map((slug) => `/notes/${slug}/` as const);
export const NOT_FOUND_ROUTE = "/404.html";

export type PinselRoute = (typeof PAGE_ROUTES)[number] | (typeof NOTE_ROUTES)[number] | typeof NOT_FOUND_ROUTE;

/** The 14 outputs the strict checker verifies, in `page-manifest.json` order. */
export const PINSEL_ROUTES: readonly PinselRoute[] = [
  "/",
  "/lessons/",
  "/about/",
  "/results/",
  "/voices/",
  "/faq/",
  "/notes/",
  ...NOTE_ROUTES,
  "/contact/",
  NOT_FOUND_ROUTE,
];

export function outputFileForRoute(route: PinselRoute): string {
  return route === NOT_FOUND_ROUTE ? "404.html" : `${route.slice(1)}index.html`;
}

/**
 * `page-copy` entry ids, one per non-note route; notes derive their meta from
 * the `note` entry. Composer entry ids are unique per provider, not per model,
 * hence the `page-` prefix (`nav-link` uses `nav-`).
 */
export const PAGE_COPY_IDS: Readonly<Record<(typeof PAGE_ROUTES)[number] | typeof NOT_FOUND_ROUTE, string>> = {
  "/": "page-home",
  "/lessons/": "page-lessons",
  "/about/": "page-about",
  "/results/": "page-results",
  "/voices/": "page-voices",
  "/faq/": "page-faq",
  "/notes/": "page-notes",
  "/contact/": "page-contact",
  "/404.html": "page-not-found",
};

/** `nav-link` entry id for a navigation href (`/lessons/` → `nav-lessons`). */
export function navLinkId(href: string): string {
  return `nav-${href.replaceAll("/", "")}`;
}

export const RESULT_YEAR_LABELS = [
  "2025年度",
  "2024年度",
  "2023年度",
  "2022年度",
  "2021年度",
  "2020年度",
  "2019年度",
  "2018年度",
  "2017年度",
  "2016年度",
  "2015年度",
] as const;

/** `result-year` entry id for a year label (`2025年度` → `year-2025`). */
export function resultYearId(label: string): string {
  return `year-${label.replace(/年度$/, "")}`;
}

/** Results page section id: `year-` + the raw year label (non-ASCII by design, as in the prototype). */
export function resultYearFragment(label: string): string {
  return `year-${label}`;
}

/** `## ` heading count per note in the seed, which fixes the `#section-N` range. */
export const NOTE_SECTION_COUNTS: Readonly<Record<NoteSlug, number>> = {
  "exam-schedule": 6,
  "free-tuition": 6,
  "german-language": 8,
  "online-exam": 6,
  "what-is-mappe": 6,
};

function range(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

/** Content fragment ids per route (without `#`). UI anchors like `#main`, `#top`, `#legal` are not content. */
export const ROUTE_FRAGMENTS: Readonly<Record<PinselRoute, readonly string[]>> = {
  "/": ["for-you", "pricing", "instructor", "results", "voices", "faq"],
  "/lessons/": ["for-you", "course", "pricing", "consultation", "instructor", "specializations", "graduates", "knowledge"],
  "/about/": ["message"],
  "/results/": RESULT_YEAR_LABELS.map(resultYearFragment),
  "/voices/": range("student-", 5),
  "/faq/": range("faq-", 4),
  "/notes/": [],
  "/notes/exam-schedule/": range("section-", NOTE_SECTION_COUNTS["exam-schedule"]),
  "/notes/free-tuition/": range("section-", NOTE_SECTION_COUNTS["free-tuition"]),
  "/notes/german-language/": range("section-", NOTE_SECTION_COUNTS["german-language"]),
  "/notes/online-exam/": range("section-", NOTE_SECTION_COUNTS["online-exam"]),
  "/notes/what-is-mappe/": range("section-", NOTE_SECTION_COUNTS["what-is-mappe"]),
  "/contact/": [],
  "/404.html": [],
};

/** Positional fragments: `#student-N`, `#faq-N`, `#section-N` follow collection/heading order 1-based. */
export const POSITIONAL_FRAGMENT_PREFIXES = { testimonial: "student-", faqGroup: "faq-", noteSection: "section-" } as const;

/**
 * `/contact/?course=N` → `form.course.selectedIndex = N` (site.js). Index 0 is
 * the 未定 default; 1..3 are the `course` entries in `order`.
 */
export const COURSE_QUERY_OPTIONS = [
  { index: 0, label: "未定", courseId: null },
  { index: 1, label: "有料進路相談", courseId: "consultation" },
  { index: 2, label: "2ヶ月コース", courseId: "two-month" },
  { index: 3, label: "4ヶ月コース", courseId: "four-month" },
] as const;
export const COURSE_IDS = ["consultation", "two-month", "four-month"] as const;

export function contactHrefForCourse(courseId: (typeof COURSE_IDS)[number]): string {
  const option = COURSE_QUERY_OPTIONS.find((candidate) => candidate.courseId === courseId);
  return option ? `/contact/?course=${option.index}` : "/contact/";
}

/** Header (6) and footer (7) navigation targets; `nav-link` entries keep exactly these hrefs. */
export const NAV_HREFS = ["/lessons/", "/notes/", "/results/", "/voices/", "/about/", "/faq/", "/contact/"] as const;
export const HEADER_NAV_HREFS = NAV_HREFS.filter((href) => href !== "/contact/");
export const HERO_PRICING_HREF = "/#pricing";
export const CONTACT_HREF = "/contact/";

/** Fixed asset paths rendered by structure; content only supplies alt text. */
export const ASSET_PATHS = {
  instructorPortrait: "/assets/instructor-yuko.jpg",
  graduatesIllustration: "/assets/illustrations/10-form-through-dialogue.png",
  favicon: "/favicon.svg",
} as const;

/**
 * `content.json` → `data.schoolUrls`, verbatim (47 keys). Name variants that
 * map to one URL are intentional. A `result-entry.url` must be one of these
 * values; a new school needs a developer change, not a CMS edit.
 */
export const SCHOOL_URL_ALLOWLIST: Readonly<Record<string, string>> = {
  ベルリン芸術大学: "https://www.udk-berlin.de/",
  "ベルリン・ヴァイセンゼー美術大学": "https://kh-berlin.de/",
  ベルリン技術経済大学: "https://www.htw-berlin.de/",
  ミュンヘン芸術大学: "https://www.adbk.de/",
  ミュンヘン美術大学: "https://www.adbk.de/",
  ハンブルク美術大学: "https://www.hfbk-hamburg.de/",
  ハンブルク芸術大学: "https://www.hfbk-hamburg.de/",
  ハンブルク応用科学大学: "https://www.haw-hamburg.de/",
  ニュルンベルク美術大学: "https://adbk-nuernberg.de/",
  ニュルンベルク芸術大学: "https://adbk-nuernberg.de/",
  ブレーメン美術大学: "https://www.hfk-bremen.de/",
  ブレーメン芸術大学: "https://www.hfk-bremen.de/",
  ドレスデン美術大学: "https://www.hfbk-dresden.de/",
  マインツ美術大学: "https://kunsthochschule-mainz.de/",
  マインツ応用科学大学: "https://www.hs-mainz.de/",
  "フランクフルト美術大学・シュテーデルシューレ": "https://staedelschule.de/",
  カッセル芸術大学: "https://kunsthochschulekassel.de/",
  カッセル大学: "https://www.uni-kassel.de/",
  バウハウス大学ワイマール: "https://www.uni-weimar.de/",
  "ワイマール・バウハウス大学": "https://www.uni-weimar.de/",
  カールスルーエ芸術デザイン大学: "https://hfg-karlsruhe.de/",
  カールスルーへ造形大学: "https://hfg-karlsruhe.de/",
  カールスルーエ美術大学: "https://www.kunstakademie-karlsruhe.de/",
  ヴッパタール大学: "https://www.uni-wuppertal.de/",
  ミュンスター芸術大学: "https://www.kunstakademie-muenster.de/",
  ミュンスター美術大学: "https://www.kunstakademie-muenster.de/",
  ミュンスター専門大学: "https://www.fh-muenster.de/",
  "MSD/ミュンスタースクールオブデザイン": "https://www.fh-muenster.de/msd/",
  ビーレフェルト専門大学: "https://www.hsbi.de/",
  ドルトムント応用科学大学: "https://www.fh-dortmund.de/",
  ケルンインターナショナルスクールオブデザイン: "https://kisd.de/",
  "キール・ムテジウス美術大学": "https://muthesius-kunsthochschule.de/",
  "ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ": "https://www.burg-halle.de/",
  ライプツィヒ版画製本芸術大学: "https://www.hgb-leipzig.de/",
  ブラウンシュバイク美術大学: "https://www.hbk-bs.de/",
  ポツダム専門大学: "https://www.fh-potsdam.de/",
  マグデブルク大学: "https://www.ovgu.de/",
  シュトゥットガルト美術大学: "https://www.abk-stuttgart.de/",
  ザールブリュッケン芸術大学: "https://www.hbksaar.de/",
  アーヘン応用科学大学: "https://www.fh-aachen.de/",
  ヴィスマール大学: "https://www.hs-wismar.de/",
  "オーストリア・ウィーン応用美術大学": "https://www.dieangewandte.at/",
  "オーストリア・ウィーン芸術大学": "https://www.akbild.ac.at/",
  "オーストリア・ウィーン美術大学": "https://www.akbild.ac.at/",
  "オーストリア・リンツ工科造形芸術大学": "https://www.kunstuni-linz.at/",
  "オーストリア・リンツ芸術産業デザイン大学": "https://www.kunstuni-linz.at/",
  "スペイン・バルセロナ ヨーロッパデザイン学院": "https://www.ied.edu/barcelona",
};

export const ALLOWED_EXTERNAL_URLS: ReadonlySet<string> = new Set([
  ...Object.values(SCHOOL_URL_ALLOWLIST),
  INSTAGRAM_URL,
]);

export function isAllowedSchoolUrl(url: string): boolean {
  return Object.values(SCHOOL_URL_ALLOWLIST).includes(url);
}
