// `pnpm content:validate`: content/entries + structure through Composer's
// validateSiteProject and the portable compiler (zero diagnostics), the
// Pinsel policy rules on every stored value, the structure invariants, the
// component contract, and reference integrity of every rendered link.
import { fileURLToPath } from "node:url";
import type { JsonValue, TrustedComponentPack } from "@zudo-composer/component-contract";
import { pinselPack } from "@pinsel/ui";
import { compileSiteProjectPlan, serializeSiteProject, validateSiteProject } from "zudo-composer/content";
import type { SiteProjectPlanRoute } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import {
  ALLOWED_EXTERNAL_URLS,
  COURSE_QUERY_OPTIONS,
  NAV_HREFS,
  NOTE_SLUGS,
  PAGE_COPY_IDS,
  PINSEL_ROUTES,
  planPathname,
  routeForPlanPathname,
  type PinselRoute,
} from "../invariants";
import { PINSEL_MODELS, fieldId, modelById } from "../models";
import { checkFieldValue } from "../policy";
import { checkPackAgainstContract } from "./contract-pack";
import { readContentEntries } from "./entries";
import { structurePack } from "./pack";
import { expectedFragments, routeFacts, type RouteFacts } from "./plan-facts";
import { buildPinselSite } from "./structure";

/** Models that are singletons in meaning (one entry, id = model id). */
export const SINGLE_ENTRY_MODELS = ["site-copy", "lessons-copy", "about-copy", "instructor-profile", "contact-copy"] as const;

const value = (entry: ContentEntryRecord, key: string): JsonValue | undefined => entry.values[fieldId(entry.modelId, key)] as JsonValue | undefined;
const ordered = (entries: readonly ContentEntryRecord[], modelId: string) =>
  entries.filter((entry) => entry.modelId === modelId).sort((left, right) => Number(value(left, "order")) - Number(value(right, "order")) || (left.id < right.id ? -1 : 1));
const sameSet = (left: readonly string[], right: readonly string[]) => left.length === right.length && [...left].sort().join("\u0000") === [...right].sort().join("\u0000");

export function checkEntries(entries: readonly ContentEntryRecord[]): string[] {
  const issues: string[] = [];
  for (const entry of entries) {
    const model = modelById(entry.modelId);
    if (!model) {
      issues.push(`${entry.modelId}/${entry.id}: unknown model`);
      continue;
    }
    for (const [id, stored] of Object.entries(entry.values)) {
      const field = model.document.fields.find((candidate) => candidate.id === id);
      if (!field) issues.push(`${entry.modelId}/${entry.id}: unknown field ${id}`);
      else if (stored !== null && stored !== undefined) {
        const refused = checkFieldValue(model, field, stored as JsonValue);
        if (refused) issues.push(`${entry.modelId}/${entry.id}: ${refused.code} ${refused.message}`);
      }
    }
  }
  for (const modelId of SINGLE_ENTRY_MODELS) {
    const found = entries.filter((entry) => entry.modelId === modelId);
    if (found.length !== 1 || found[0]!.id !== modelId) issues.push(`${modelId}: needs exactly one entry with id "${modelId}" (found ${found.map((entry) => entry.id).join(", ") || "none"})`);
  }
  const pageCopy = entries.filter((entry) => entry.modelId === "page-copy");
  for (const [route, id] of Object.entries(PAGE_COPY_IDS)) {
    const entry = pageCopy.find((candidate) => candidate.id === id);
    if (!entry || value(entry, "route") !== route) issues.push(`page-copy/${id}: must exist with route ${route}`);
  }
  if (pageCopy.length !== Object.keys(PAGE_COPY_IDS).length) issues.push(`page-copy: expected ${Object.keys(PAGE_COPY_IDS).length} entries, found ${pageCopy.length}`);
  const navHrefs = entries.filter((entry) => entry.modelId === "nav-link").map((entry) => String(value(entry, "href")));
  if (!sameSet(navHrefs, NAV_HREFS)) issues.push(`nav-link: hrefs ${JSON.stringify(navHrefs)} must be exactly ${JSON.stringify(NAV_HREFS)}`);
  const courses = ordered(entries, "course");
  const expectedCourses = COURSE_QUERY_OPTIONS.filter((option) => option.courseId !== null);
  if (courses.length !== expectedCourses.length || expectedCourses.some((option, index) => courses[index]?.id !== option.courseId || value(courses[index]!, "order") !== option.index)) {
    issues.push(`course: entries must be ${expectedCourses.map((option) => `${option.courseId}@${option.index}`).join(", ")} so /contact/?course=N selects option N`);
  }
  const notes = entries.filter((entry) => entry.modelId === "note");
  if (!sameSet(notes.map((entry) => entry.id), NOTE_SLUGS) || notes.some((entry) => value(entry, "slug") !== entry.id)) issues.push(`note: entries must be ${NOTE_SLUGS.join(", ")} with id = slug`);
  const ids = new Set(entries.map((entry) => `${entry.modelId}/${entry.id}`));
  for (const entry of entries) {
    const model = modelById(entry.modelId);
    for (const field of model?.document.fields ?? []) {
      if (field.kind !== "reference") continue;
      const target = entry.values[field.id] as { modelId?: string; recordId?: string } | undefined;
      if (target && !ids.has(`${target.modelId}/${target.recordId}`)) issues.push(`${entry.modelId}/${entry.id}: ${field.key} → ${target.modelId}/${target.recordId} does not exist`);
    }
  }
  return issues;
}

function normalisedRoute(path: string): PinselRoute | undefined {
  const withSlash = path === "" || path.endsWith("/") || path.endsWith(".html") ? path : `${path}/`;
  return (PINSEL_ROUTES as readonly string[]).includes(withSlash) ? (withSlash as PinselRoute) : routeForPlanPathname(path);
}

export function checkLinks(facts: readonly RouteFacts[]): string[] {
  const issues: string[] = [];
  const fragmentsByRoute = new Map<string, Set<string>>();
  for (const fact of facts) fragmentsByRoute.set(routeForPlanPathname(fact.pathname) ?? fact.pathname, new Set(fact.fragments));
  const uiAnchors = new Set(["main", "top", "site-navigation", "legal", "contact-form", "hero-title"]);
  for (const fact of facts) {
    const here = routeForPlanPathname(fact.pathname)!;
    for (const href of fact.links) {
      if (/^https?:/.test(href)) {
        if (!ALLOWED_EXTERNAL_URLS.has(href)) issues.push(`${here}: external link ${href} is not allowed`);
        continue;
      }
      const [beforeHash, hash] = href.split("#", 2) as [string, string | undefined];
      const [path, query] = beforeHash.split("?", 2) as [string, string | undefined];
      const target = path === "" ? here : normalisedRoute(path);
      if (!target) {
        issues.push(`${here}: link ${href} targets no output route`);
        continue;
      }
      if (query !== undefined) {
        const course = /^course=(\d+)$/.exec(query);
        const option = course ? COURSE_QUERY_OPTIONS.find((candidate) => candidate.index === Number(course[1])) : undefined;
        if (target !== "/contact/" || !option || option.courseId === null) issues.push(`${here}: link ${href} has an unknown query`);
      }
      if (hash !== undefined && !uiAnchors.has(hash) && !fragmentsByRoute.get(target)?.has(hash)) issues.push(`${here}: link ${href} points to a missing fragment`);
    }
  }
  return issues;
}

export function checkPlan(routes: readonly SiteProjectPlanRoute[], entries: readonly ContentEntryRecord[]): string[] {
  const issues: string[] = [];
  const pathnames = routes.map((route) => route.pathname);
  const expected = PINSEL_ROUTES.map(planPathname);
  if (!sameSet(pathnames, expected)) issues.push(`plan routes ${JSON.stringify(pathnames)} must be ${JSON.stringify(expected)}`);
  const facts = routes.map(routeFacts);
  for (const fact of facts) {
    const route = routeForPlanPathname(fact.pathname);
    if (!route) continue;
    const wanted = expectedFragments(route, entries);
    if (JSON.stringify(fact.fragments) !== JSON.stringify(wanted)) issues.push(`${route}: fragments ${JSON.stringify(fact.fragments)}, expected ${JSON.stringify(wanted)}`);
  }
  return [...issues, ...checkLinks(facts)];
}

export interface ValidationReport {
  issues: string[];
  routes: readonly SiteProjectPlanRoute[];
}

export async function validateContent(entries: readonly ContentEntryRecord[], pack: TrustedComponentPack): Promise<ValidationReport> {
  const issues = checkEntries(entries);
  const { project } = buildPinselSite(entries, pack);
  const validated = validateSiteProject(project, { componentPack: pack.manifest });
  for (const diagnostic of validated.diagnostics) issues.push(`validateSiteProject ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`);
  if (!validated.ok) return { issues, routes: [] };
  // Compile the canonical form, exactly what site-project.json and a Worker snapshot carry.
  const compiled = await compileSiteProjectPlan(JSON.parse(serializeSiteProject(validated.project)), pack.manifest);
  if (compiled.status !== "ready") {
    const diagnostics = "diagnostics" in compiled ? (compiled.diagnostics as unknown as readonly { code: string; message: string; pathname?: string }[]) : [];
    for (const diagnostic of diagnostics) issues.push(`compile ${diagnostic.code} ${diagnostic.pathname ?? ""}: ${diagnostic.message}`);
    if (diagnostics.length === 0) issues.push(`compile status ${compiled.status}`);
    return { issues, routes: [] };
  }
  issues.push(...checkPlan(compiled.plan.routes, entries));
  return { issues, routes: compiled.plan.routes };
}

async function main(): Promise<void> {
  const issues: string[] = [];
  if (process.env.PINSEL_STRUCTURE_PACK !== "contract") {
    issues.push(...checkPackAgainstContract(pinselPack.manifest).map((problem) => `component contract ${problem.componentId}: ${problem.message}`));
  }
  const entries = await readContentEntries();
  const pack = issues.length === 0 ? structurePack() : (await import("./contract-pack")).contractPack();
  const report = await validateContent(entries, pack);
  issues.push(...report.issues);
  const counts = PINSEL_MODELS.map((model) => `${model.id} ${entries.filter((entry) => entry.modelId === model.id).length}`);
  if (issues.length > 0) {
    console.error(`content:validate found ${issues.length} problem(s):\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`content:validate ok: ${entries.length} entries (${counts.join(", ")}), ${report.routes.length} routes, zero diagnostics`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
