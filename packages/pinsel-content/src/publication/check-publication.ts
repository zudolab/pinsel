import { parseMarkdown, type InlineNode } from "@pinsel/ui/src/markdown/safe-markdown.ts";
import type { JsonValue } from "@zudo-composer/component-contract";
import { compileSiteProjectPlan, serializeSiteProject } from "zudo-composer/content";
import type { ContentEntryRecord } from "zudo-composer/site-project";

import { baselineKey, type ContentBaseline } from "../import-rules";
import { ASSET_PATHS, PINSEL_ROUTES, planPathname, routeForPlanPathname, type PinselRoute } from "../invariants";
import { modelById } from "../models";
import { fieldId } from "../models/define";
import { PINSEL_EDITABLE_FIELDS } from "../policy";
import { protectedDigest } from "../import/import-seed";
import { PUBLICATION_MAP, type PublicationRow } from "../publication-map";
import { contractPack } from "../site/contract-pack";
import { expectedFragments, routeFacts } from "../site/plan-facts";
import { buildPinselSite } from "../site/structure";

// The publication gate: a built dist/ against the snapshot's entries, through
// the explicit PUBLICATION_MAP (not "every value appears somewhere"), plus the
// structure the client can never change: routes, fragments, art windows,
// asset paths, the metadata policy and every protected field vs
// content/baseline.json. DOM access goes through the minimal interface below
// so the caller picks the parser (scripts/content/check-publication.mjs uses
// happy-dom).

export interface DomNode {
  readonly nodeType: number;
  readonly textContent: string | null;
  readonly childNodes: ArrayLike<DomNode>;
}

export interface DomElement extends DomNode {
  readonly tagName: string;
  readonly id: string;
  readonly children: ArrayLike<DomElement>;
  readonly previousElementSibling: DomElement | null;
  getAttribute(name: string): string | null;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
}

export interface DomDocument {
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
}

export interface PublicationInput {
  entries: readonly ContentEntryRecord[];
  /** The page for an output route, or `undefined` when the file is missing. */
  page(route: PinselRoute): DomDocument | undefined;
  baseline: ContentBaseline;
}

const ELEMENT = 1;
const TEXT = 3;

function textOf(node: DomNode, own = false): string {
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT) out += child.textContent ?? "";
    else if (child.nodeType === ELEMENT && !own) {
      const element = child as DomElement;
      const tag = element.tagName.toLowerCase();
      if (tag === "svg" || tag === "script" || tag === "style" || element.getAttribute("aria-hidden") === "true") continue;
      out += textOf(element);
    }
  }
  return out;
}

export const normalise = (text: string): string => text.replace(/\s+/g, " ").trim();

const valueOf = (entry: ContentEntryRecord, key: string): JsonValue | undefined => entry.values[fieldId(entry.modelId, key)] as JsonValue | undefined;
const asText = (value: JsonValue | undefined): string => (value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value));
const SHARED_CTA_PREFIX = "まずはお気軽にご相談ください。";

function sorted(entries: readonly ContentEntryRecord[], modelId: string, sortBy = "order"): ContentEntryRecord[] {
  return entries
    .filter((entry) => entry.modelId === modelId)
    .sort((left, right) => {
      const a = valueOf(left, sortBy);
      const b = valueOf(right, sortBy);
      const compared = typeof a === "number" && typeof b === "number" ? a - b : asText(a) < asText(b) ? -1 : asText(a) > asText(b) ? 1 : 0;
      return compared || (left.id < right.id ? -1 : 1);
    });
}

function passes(entry: ContentEntryRecord, row: PublicationRow): boolean {
  if (!row.filter) return true;
  const equal = valueOf(entry, row.filter.field) === row.filter.equals;
  return row.filter.operator === "not-equals" ? !equal : equal;
}

function target(scope: DomElement | DomDocument, selector: string): DomElement | null {
  return selector === "" ? (scope as DomElement) : scope.querySelector(selector);
}

function inlineText(nodes: readonly InlineNode[]): string {
  return nodes.map((node) => node.text).join("");
}

function inlineLinks(nodes: readonly InlineNode[]): string[] {
  return nodes.flatMap((node) => (node.kind === "link" ? [node.href] : []));
}

function linksOf(element: DomElement): string[] {
  return Array.from(element.querySelectorAll("a[href]")).map((anchor) => anchor.getAttribute("href") ?? "");
}

/** The note body through the same safe tree the renderer uses, compared block by block. */
function checkMarkdown(markdown: string, prose: DomElement, where: string): string[] {
  const issues: string[] = [];
  const blocks = parseMarkdown(markdown);
  const elements = Array.from(prose.children);
  if (elements.length !== blocks.length) issues.push(`${where}: ${elements.length} rendered blocks, the markdown has ${blocks.length}`);
  blocks.forEach((block, index) => {
    const element = elements[index];
    if (!element) return;
    const tag = element.tagName.toLowerCase();
    if (block.kind === "heading") {
      if (tag !== "h2" || element.id !== block.id || normalise(textOf(element)) !== normalise(block.text)) issues.push(`${where}: block ${index + 1} should be h2#${block.id} "${block.text}"`);
    } else if (block.kind === "paragraph") {
      if (tag !== "p" || normalise(textOf(element)) !== normalise(inlineText(block.children)) || linksOf(element).join(" ") !== inlineLinks(block.children).join(" ")) {
        issues.push(`${where}: block ${index + 1} should be the paragraph "${inlineText(block.children).slice(0, 40)}…"`);
      }
    } else {
      const items = Array.from(element.children);
      if (tag !== "ul" || items.length !== block.items.length || block.items.some((item, at) => normalise(textOf(items[at]!)) !== normalise(inlineText(item)))) {
        issues.push(`${where}: block ${index + 1} should be a list of ${block.items.length} items`);
      }
    }
  });
  return issues;
}

function expectation(row: PublicationRow, value: JsonValue | undefined): string {
  const text = asText(value);
  switch (row.render) {
    case "joined-lines":
      return text.split("\n").join("");
    case "cta-subcopy":
      return text.startsWith(SHARED_CTA_PREFIX) ? text.slice(SHARED_CTA_PREFIX.length) : text;
    case "count":
      return `（${text}件）`;
    case "course-href":
      return `/contact/?course=${text}`;
    case "note-href":
      return `/notes/${typeof value === "object" && value !== null && !Array.isArray(value) ? asText((value as { recordId?: JsonValue }).recordId) : text}/`;
    case "note-title":
      return `${text} - Pinsel Notes`;
    default:
      return text;
  }
}

/** One element against one entry's value; returns the problem or null. */
function compare(row: PublicationRow, element: DomElement | null, entry: ContentEntryRecord, where: string): string | null {
  const value = valueOf(entry, row.field);
  if (row.render === "presence") return (element !== null) === (value === true) ? null : `${where}: ${row.selector} ${element ? "present" : "absent"} but ${row.model}/${entry.id}.${row.field} is ${String(value)}`;
  if (row.optional && asText(value) === "") return element === null || (row.attribute && element.getAttribute(row.attribute) === null) ? null : `${where}: ${row.selector} rendered for an empty ${row.field}`;
  if (!element) return `${where}: ${row.selector || "item"} missing for ${row.model}/${entry.id}.${row.field}`;
  if (row.render === "markdown") return checkMarkdown(asText(value), element, where).join("; ") || null;
  const actual = row.attribute ? (element.getAttribute(row.attribute) ?? "") : textOf(element, row.render === "own-text");
  const expected = expectation(row, value);
  return normalise(actual) === normalise(expected) ? null : `${where}: ${row.model}/${entry.id}.${row.field} expected "${normalise(expected).slice(0, 80)}", rendered "${normalise(actual).slice(0, 80)}"`;
}

function checkRow(row: PublicationRow, route: PinselRoute, page: DomDocument, entries: readonly ContentEntryRecord[]): string[] {
  const where = `${route} [${row.model}.${row.field}${row.selector ? ` ${row.selector}` : ""}]`;
  const issues: string[] = [];
  if (row.entry === "single" || row.entry === "route" || row.entry === "route-note") {
    const entry =
      row.entry === "single"
        ? entries.find((candidate) => candidate.modelId === row.model)
        : row.entry === "route"
          ? entries.find((candidate) => candidate.modelId === "page-copy" && valueOf(candidate, "route") === route)
          : entries.find((candidate) => candidate.modelId === "note" && `/notes/${asText(valueOf(candidate, "slug"))}/` === route);
    if (!entry) return [`${where}: no entry`];
    if (row.render === "lines") return checkLines(row, Array.from(page.querySelectorAll(row.items ?? row.selector)), entry, where);
    const problem = compare(row, page.querySelector(row.selector), entry, where);
    return problem ? [problem] : [];
  }
  if (row.entry === "keyed") {
    const items = Array.from(page.querySelectorAll(row.items!));
    const selected = entries.filter((entry) => entry.modelId === row.model && passes(entry, row));
    if (items.length !== selected.length) issues.push(`${where}: ${items.length} items for ${selected.length} entries`);
    for (const entry of selected) {
      const item = items.find((candidate) => candidate.getAttribute(row.keyAttribute!) === asText(valueOf(entry, row.keyField!))) ?? null;
      const problem = compare(row, item && target(item, row.selector), entry, where);
      if (problem) issues.push(problem);
    }
    return issues;
  }
  const groups: { scope: DomDocument | DomElement; entries: ContentEntryRecord[]; label: string }[] = [];
  if (row.entry === "nested") {
    const parents = sorted(entries, row.parent!.model);
    const scopes = Array.from(page.querySelectorAll(row.parent!.items));
    if (scopes.length !== parents.length) issues.push(`${where}: ${scopes.length} ${row.parent!.items} for ${parents.length} ${row.parent!.model} entries`);
    parents.forEach((parent, index) => {
      const scope = scopes[index];
      if (!scope) return;
      const children = sorted(entries, row.model, row.sortBy).filter((entry) => (valueOf(entry, row.parent!.via) as { recordId?: string } | undefined)?.recordId === parent.id);
      groups.push({ scope, entries: children, label: `${where} in ${parent.id}` });
    });
  } else {
    const selected = sorted(entries, row.model, row.sortBy).filter((entry) => passes(entry, row));
    // `lines` on the items themselves: a one-entry model whose value has one line per item.
    if (row.render === "lines" && row.selector === "") return selected.length === 1 ? checkLines(row, Array.from(page.querySelectorAll(row.items!)), selected[0]!, where) : [`${where}: expected one ${row.model} entry`];
    groups.push({ scope: page, entries: selected, label: where });
  }
  for (const group of groups) {
    const items = Array.from(group.scope.querySelectorAll(row.items!));
    if (items.length !== group.entries.length) issues.push(`${group.label}: ${items.length} items for ${group.entries.length} entries`);
    group.entries.forEach((entry, index) => {
      const item = items[index];
      if (!item) return;
      if (row.render === "lines") {
        issues.push(...checkLines(row, Array.from(item.querySelectorAll(row.selector)), entry, `${group.label} #${index + 1}`));
        return;
      }
      const element = target(item, row.selector);
      const problem = compare(row, element, entry, `${group.label} #${index + 1}`);
      if (problem) issues.push(problem);
      if (row.adjacentTo && element) {
        const sibling = PUBLICATION_MAP.find((candidate) => candidate.model === row.model && candidate.field === row.adjacentTo && candidate.entry === row.entry);
        const before = sibling ? target(item, sibling.selector) : null;
        if (!before || element.previousElementSibling !== before || visibleTextBetween(before, element)) issues.push(`${group.label} #${index + 1}: ${row.field} must directly follow ${row.adjacentTo}`);
      }
    });
  }
  return issues;
}

/** Text a reader (or the seed checker's text-order rule) would see between two sibling elements. */
function visibleTextBetween(before: DomElement, after: DomElement): boolean {
  const siblings = Array.from((before as unknown as { parentNode: DomNode | null }).parentNode?.childNodes ?? []);
  const from = siblings.indexOf(before);
  const to = siblings.indexOf(after);
  return siblings.slice(from + 1, to).some((node) => normalise(node.nodeType === TEXT ? (node.textContent ?? "") : textOf({ nodeType: 1, textContent: null, childNodes: [node] })) !== "");
}

function checkLines(row: PublicationRow, elements: DomElement[], entry: ContentEntryRecord, where: string): string[] {
  const lines = asText(valueOf(entry, row.field)).split("\n");
  if (elements.length !== lines.length) return [`${where}: ${elements.length} elements for ${lines.length} lines of ${row.model}/${entry.id}.${row.field}`];
  return lines.flatMap((line, index) => (normalise(textOf(elements[index]!)) === normalise(line) ? [] : [`${where}: line ${index + 1} expected "${line.slice(0, 60)}"`]));
}

/** Content fragment ids in document order: sections, the about message, years, FAQ categories, testimonials, note headings. */
const FRAGMENT_SELECTOR = "main section.section[id], main section#message, main section.year-section[id], main section.faq-category[id], main article.voice-detail[id], main .prose > h2[id]";

function artOf(page: DomDocument): string[] {
  return Array.from(page.querySelectorAll(".art-window")).map((element) => {
    const size = /art-window--([a-z]+)/.exec(element.getAttribute("class") ?? "")?.[1] ?? "?";
    return `${size}/${element.getAttribute("data-drift") ?? "?"}/${element.getAttribute("data-motion-range") ?? "?"}`;
  });
}

/** Everything the structure fixes, read from the compiled plan of the snapshot's own entries. */
async function structureChecks(input: PublicationInput, pages: Map<PinselRoute, DomDocument>): Promise<string[]> {
  const issues: string[] = [];
  const pack = contractPack();
  const { project } = buildPinselSite(input.entries, pack);
  const compiled = await compileSiteProjectPlan(JSON.parse(serializeSiteProject(project)), pack.manifest);
  if (compiled.status !== "ready") return [`structure: the snapshot's project does not compile (${compiled.status})`];
  for (const route of compiled.plan.routes) {
    const output = routeForPlanPathname(route.pathname);
    const page = output && pages.get(output);
    if (!output || !page) continue;
    const facts = routeFacts(route);
    const expectedArt = facts.art.map((art) => art.split("/").slice(1).join("/"));
    const renderedArt = artOf(page);
    if (JSON.stringify(renderedArt) !== JSON.stringify(expectedArt)) issues.push(`${output}: art windows ${JSON.stringify(renderedArt)}, structure ${JSON.stringify(expectedArt)}`);
    const fragments = Array.from(page.querySelectorAll(FRAGMENT_SELECTOR)).map((element) => element.id);
    const wanted = expectedFragments(output, input.entries);
    if (JSON.stringify(fragments) !== JSON.stringify(wanted)) issues.push(`${output}: fragments ${JSON.stringify(fragments)}, expected ${JSON.stringify(wanted)}`);
  }
  return issues;
}

function assetChecks(pages: Map<PinselRoute, DomDocument>): string[] {
  const issues: string[] = [];
  const images = new Set<string>([ASSET_PATHS.instructorPortrait, ASSET_PATHS.graduatesIllustration]);
  const metaPolicy = new Map<string, string>();
  for (const [route, page] of pages) {
    for (const image of Array.from(page.querySelectorAll("img[src]"))) if (!images.has(image.getAttribute("src") ?? "")) issues.push(`${route}: image ${image.getAttribute("src")} is not an approved asset path`);
    const icon = page.querySelector("link[rel=icon]");
    if (icon?.getAttribute("href") !== ASSET_PATHS.favicon) issues.push(`${route}: favicon must be ${ASSET_PATHS.favicon}`);
    if (page.querySelectorAll("title").length !== 1) issues.push(`${route}: needs exactly one <title>`);
    if (page.querySelectorAll("meta[name=description]").length !== 1) issues.push(`${route}: needs exactly one meta description`);
    const names = Array.from(page.querySelectorAll("head meta[name], head meta[property], head link[rel=canonical]"))
      .map((element) => element.getAttribute("name") ?? element.getAttribute("property") ?? "canonical")
      .sort()
      .join(",");
    metaPolicy.set(route, names);
  }
  const policies = new Set(metaPolicy.values());
  if (policies.size > 1) issues.push(`metadata policy differs between pages: ${JSON.stringify(Object.fromEntries(metaPolicy))}`);
  return issues;
}

/** Protected fields keep their baseline digest; entries appear/disappear only where the policy allows create/delete. */
export function protectedChecks(entries: readonly ContentEntryRecord[], baseline: ContentBaseline): string[] {
  const issues: string[] = [];
  const present = new Set<string>();
  for (const entry of entries) {
    const key = baselineKey(entry.modelId, entry.id);
    present.add(key);
    const recorded = baseline.entries[key];
    const operations = PINSEL_EDITABLE_FIELDS[entry.modelId as keyof typeof PINSEL_EDITABLE_FIELDS]?.operations ?? [];
    if (!modelById(entry.modelId)) issues.push(`${key}: unknown model`);
    else if (!recorded) {
      if (!operations.includes("create-entry")) issues.push(`${key}: new entry, but ${entry.modelId} does not allow creation`);
    } else if (protectedDigest(entry) !== recorded.protectedDigest) {
      issues.push(`${key}: a protected field changed (route/href/slug/structure-owned values)`);
    }
  }
  for (const [key, recorded] of Object.entries(baseline.entries)) {
    if (present.has(key)) continue;
    const operations = PINSEL_EDITABLE_FIELDS[recorded.modelId as keyof typeof PINSEL_EDITABLE_FIELDS]?.operations ?? [];
    if (!operations.includes("delete-entry")) issues.push(`${key}: deleted, but ${recorded.modelId} does not allow deletion`);
  }
  return issues;
}

export async function checkPublication(input: PublicationInput): Promise<string[]> {
  const issues: string[] = [];
  const pages = new Map<PinselRoute, DomDocument>();
  for (const route of PINSEL_ROUTES) {
    const page = input.page(route);
    if (page) pages.set(route, page);
    else issues.push(`${route}: output missing (${planPathname(route)})`);
  }
  for (const row of PUBLICATION_MAP) {
    for (const route of row.routes) {
      const page = pages.get(route);
      if (page) issues.push(...checkRow(row, route, page, input.entries));
    }
  }
  issues.push(...(await structureChecks(input, pages)), ...assetChecks(pages), ...protectedChecks(input.entries, input.baseline));
  return issues;
}
