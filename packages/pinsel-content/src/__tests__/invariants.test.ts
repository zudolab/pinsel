import { describe, expect, it } from "vitest";

import { decideImport, entryFilePath, seedEntryId } from "../import-rules";
import {
  ALLOWED_EXTERNAL_URLS,
  COURSE_IDS,
  COURSE_QUERY_OPTIONS,
  HEADER_NAV_HREFS,
  INSTAGRAM_URL,
  NAV_HREFS,
  NOTE_INDEX_ORDER,
  NOTE_SLUGS,
  PAGE_COPY_IDS,
  PINSEL_ROUTES,
  RESULT_YEAR_LABELS,
  ROUTE_FRAGMENTS,
  SCHOOL_URL_ALLOWLIST,
  contactHrefForCourse,
  isAllowedSchoolUrl,
  outputFileForRoute,
  resultYearFragment,
  resultYearId,
} from "../invariants";
import { readFixture } from "../import/seed-entries";

interface ExpectedContent {
  shared: { destinations: { href: string }[]; instagram: string };
  pages: { route: string; links: { href: string; kind: string }[]; recordGroups: { year?: string; declaredCount?: number }[] }[];
}
interface SeedContent {
  data: { schoolUrls: Record<string, string>; resultsData: { year: string; entries: { school: string }[] }[] };
  contact: { courseOptions: string[] };
  frontmatter: Record<string, { navLinks?: { href: string }[] }>;
}
interface ManifestPage {
  route: string;
  file: string;
}

const expected = readFixture<ExpectedContent>("expected-content.json");
const seed = readFixture<SeedContent>("content.json");
const manifest = readFixture<ManifestPage[]>("page-manifest.json");

function resolveLink(href: string): { route: string; fragment: string | null } {
  const [path, fragment = null] = href.split("#") as [string, string?];
  return { route: path === "" ? "/" : path, fragment };
}

describe("routes", () => {
  it("list the 14 outputs in page-manifest order with matching files", () => {
    expect(PINSEL_ROUTES).toHaveLength(14);
    expect(PINSEL_ROUTES.map((route) => (route === "/404.html" ? "404.html" : route.slice(1)))).toEqual(manifest.map((page) => page.route));
    expect(PINSEL_ROUTES.map(outputFileForRoute)).toEqual(manifest.map((page) => page.file));
    expect(new Set(expected.pages.map((page) => page.route))).toEqual(new Set(PINSEL_ROUTES));
  });

  it("give every non-note route a page-copy id and every note a slug", () => {
    for (const route of PINSEL_ROUTES) {
      if (route.startsWith("/notes/") && route !== "/notes/") {
        expect(NOTE_SLUGS).toContain(route.slice("/notes/".length, -1));
      } else {
        expect(PAGE_COPY_IDS[route as keyof typeof PAGE_COPY_IDS], route).toBeDefined();
      }
    }
    expect([...NOTE_INDEX_ORDER].sort()).toEqual([...NOTE_SLUGS].sort());
  });

  it("resolve every link the checker expects to a route (+ fragment) or an allowed external URL", () => {
    const links = [
      ...expected.shared.destinations.map((destination) => destination.href),
      expected.shared.instagram,
      ...expected.pages.flatMap((page) => page.links.map((link) => link.href)),
    ];
    for (const href of links) {
      if (href.startsWith("http")) {
        expect(ALLOWED_EXTERNAL_URLS.has(href), href).toBe(true);
        continue;
      }
      const { route, fragment } = resolveLink(href);
      expect(PINSEL_ROUTES, href).toContain(route);
      if (fragment) expect(ROUTE_FRAGMENTS[route as keyof typeof ROUTE_FRAGMENTS], href).toContain(fragment);
    }
    expect(expected.shared.instagram).toBe(INSTAGRAM_URL);
  });
});

describe("fragments", () => {
  it("cover the approved anchor set per route", () => {
    expect(ROUTE_FRAGMENTS["/"]).toEqual(["for-you", "pricing", "instructor", "results", "voices", "faq"]);
    expect(ROUTE_FRAGMENTS["/lessons/"]).toEqual(["for-you", "course", "pricing", "consultation", "instructor", "specializations", "graduates", "knowledge"]);
    expect(ROUTE_FRAGMENTS["/about/"]).toEqual(["message"]);
    expect(ROUTE_FRAGMENTS["/voices/"]).toEqual(["student-1", "student-2", "student-3", "student-4", "student-5"]);
    expect(ROUTE_FRAGMENTS["/faq/"]).toEqual(["faq-1", "faq-2", "faq-3", "faq-4"]);
    expect(ROUTE_FRAGMENTS["/results/"]).toHaveLength(11);
    expect(ROUTE_FRAGMENTS["/results/"][0]).toBe("year-2025年度");
    expect(ROUTE_FRAGMENTS["/notes/german-language/"]).toHaveLength(8);
    expect(ROUTE_FRAGMENTS["/notes/what-is-mappe/"].at(-1)).toBe("section-6");
    for (const fragments of Object.values(ROUTE_FRAGMENTS)) expect(new Set(fragments).size).toBe(fragments.length);
  });

  it("derive result-year ids and fragments from the seed year labels", () => {
    const labels = seed.data.resultsData.map((year) => year.year);
    expect([...RESULT_YEAR_LABELS]).toEqual(labels);
    expect(expected.pages.find((page) => page.route === "/results/")!.recordGroups.map((group) => group.year)).toEqual(labels);
    expect(resultYearId("2025年度")).toBe("year-2025");
    expect(resultYearFragment("2025年度")).toBe("year-2025年度");
    expect(ROUTE_FRAGMENTS["/results/"]).toEqual(labels.map(resultYearFragment));
  });
});

describe("course query mapping", () => {
  it("maps ?course=0..3 to the contact form options in order", () => {
    expect(COURSE_QUERY_OPTIONS.map((option) => option.label)).toEqual(seed.contact.courseOptions);
    expect(COURSE_QUERY_OPTIONS.map((option) => option.index)).toEqual([0, 1, 2, 3]);
    expect(COURSE_QUERY_OPTIONS.slice(1).map((option) => option.courseId)).toEqual([...COURSE_IDS]);
    expect(contactHrefForCourse("two-month")).toBe("/contact/?course=2");
  });
});

describe("navigation", () => {
  it("matches the footer links (7) and the header subset (6)", () => {
    const footer = seed.frontmatter["components/site-footer/site-footer.astro"]!.navLinks!.map((link) => link.href);
    expect([...NAV_HREFS]).toEqual(footer);
    expect(HEADER_NAV_HREFS).toHaveLength(6);
    expect(HEADER_NAV_HREFS).not.toContain("/contact/");
    expect(expected.shared.destinations.map((destination) => destination.href)).toEqual(footer);
  });
});

describe("external school URL allowlist", () => {
  it("equals the seed schoolUrls map verbatim (47 names)", () => {
    expect(SCHOOL_URL_ALLOWLIST).toEqual(seed.data.schoolUrls);
    expect(Object.keys(SCHOOL_URL_ALLOWLIST)).toHaveLength(47);
  });

  it("has an https URL for every school in the result rows", () => {
    const schools = new Set(seed.data.resultsData.flatMap((year) => year.entries.map((entry) => entry.school)));
    for (const school of schools) {
      const url = SCHOOL_URL_ALLOWLIST[school];
      expect(url, school).toBeDefined();
      expect(url).toMatch(/^https:\/\//);
      expect(isAllowedSchoolUrl(url!)).toBe(true);
    }
    expect(isAllowedSchoolUrl("https://www.udk-berlin.de")).toBe(false);
  });
});

describe("import rules", () => {
  it("place entries under content/entries/<model>/<id>.json with 2-digit seed ids", () => {
    expect(entryFilePath("note", "free-tuition")).toBe("content/entries/note/free-tuition.json");
    expect(seedEntryId("year-2025", 3)).toBe("year-2025-03");
  });

  it("are idempotent and never overwrite a CMS edit", () => {
    expect(decideImport({ seedDigest: "a", baselineDigest: undefined, currentDigest: undefined })).toBe("create");
    expect(decideImport({ seedDigest: "a", baselineDigest: "a", currentDigest: "a" })).toBe("unchanged");
    expect(decideImport({ seedDigest: "b", baselineDigest: "a", currentDigest: "a" })).toBe("update-from-seed");
    expect(decideImport({ seedDigest: "b", baselineDigest: "a", currentDigest: "c" })).toBe("keep-newer");
    expect(decideImport({ seedDigest: "a", baselineDigest: "a", currentDigest: "c" })).toBe("keep-newer");
    expect(decideImport({ seedDigest: "a", baselineDigest: undefined, currentDigest: "c" })).toBe("keep-newer");
    expect(decideImport({ seedDigest: "a", baselineDigest: undefined, currentDigest: "a" })).toBe("unchanged");
  });
});
