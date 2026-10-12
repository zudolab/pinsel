import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Window, type Element, type Node } from "happy-dom";
import { describe, expect, it } from "vitest";
import { h } from "@takazudo/zfb/zudo-react";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { DocumentShell, pinselRegistry, renderRouteDocument } from "@pinsel/ui";

import { PINSEL_ROUTES, outputFileForRoute, planPathname } from "../invariants";
import { readContentEntries } from "../site/entries";
import { structurePack } from "../site/pack";
import { resolvePageMeta } from "../site/page-meta";
import { validateContent } from "../site/validate";

// The 14 outputs rendered the way the site renders them (content entries →
// structure → portable plan → renderRouteDocument → DocumentShell) and compared
// with the approved prototype's built HTML as normalised DOM trees: attribute
// order, class order and inter-element whitespace are ignored and the SVG id
// suffix schemes (`-r5-<n>` / `-art-<slot>-<size>`) are masked. The seed
// `dist/` is not vendored (fixtures are immutable; 14 pages of inline SVG), so
// this runs only when PINSEL_PROTOTYPE_DIST points at `<seed>/prototype/dist`.
// Deliberate differences: no prototype stylesheet/script tags in <head> (zfb
// links the CSS, the layout adds the visitor scripts), the clean
// `page-not-found` body class, the message `data-*` attributes the contact
// form adds for the visitor script, and the hero pricing link: the structure
// uses HERO_PRICING_HREF `/#pricing` (expected-content.json, same-document on
// `/`) where the prototype wrote `#pricing`.

const dist = process.env.PINSEL_PROTOTYPE_DIST;
const FORM_MESSAGE_ATTRIBUTES = ["data-submitting-label", "data-value-missing-message", "data-email-format-message"];
const ID_SUFFIX = /-(?:r5-\d+|art-[a-z]+-[a-z]+)\b/g;

function canonical(node: Node, inSvg = false): string {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    return text.trim() === "" ? "" : JSON.stringify(text);
  }
  if (node.nodeType !== 1) return "";
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const svg = inSvg || tag === "svg";
  const attributes = [...element.attributes]
    .map((attribute) => {
      let value = attribute.value ?? "";
      if (attribute.name === "class") value = [...new Set(value.split(/\s+/).filter(Boolean))].sort().join(" ");
      if (svg) value = value.replace(ID_SUFFIX, "-ID");
      return `${attribute.name}=${JSON.stringify(value)}`;
    })
    .sort();
  const children = [...element.childNodes].map((child) => canonical(child, svg)).filter(Boolean);
  return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}>${children.join("")}</${tag}>`;
}

function normalise(html: string): { tree: string; duplicateIds: string[] } {
  const window = new Window();
  const document = window.document;
  document.write(html);
  for (const element of [...document.querySelectorAll('head script, head link[href="/styles.css"]')]) element.remove();
  if (document.body.className.trim() === "page-404.html") document.body.className = "page-not-found";
  const pricing = document.querySelector('.hero__actions a.text-link[href="/#pricing"]');
  if (pricing) pricing.setAttribute("href", "#pricing");
  for (const name of FORM_MESSAGE_ATTRIBUTES) document.querySelector("#contact-form")?.removeAttribute(name);
  const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
  const duplicateIds = [...new Set(ids.filter((id, at) => ids.indexOf(id) !== at))];
  const tree = canonical(document.documentElement);
  window.close();
  return { tree, duplicateIds };
}

function firstDifference(expected: string, actual: string): string {
  let at = 0;
  while (at < expected.length && expected[at] === actual[at]) at += 1;
  return `at ${at}:\n  prototype: …${expected.slice(Math.max(0, at - 200), at + 200)}\n  rendered:  …${actual.slice(Math.max(0, at - 200), at + 200)}`;
}

describe.skipIf(!dist || !existsSync(dist))("rendered routes match the approved prototype (PINSEL_PROTOTYPE_DIST)", async () => {
  const entries = await readContentEntries();
  const report = await validateContent(entries, structurePack());

  it("compiles all fourteen routes", () => {
    expect(report.issues).toEqual([]);
    expect(report.routes).toHaveLength(PINSEL_ROUTES.length);
  });

  for (const route of PINSEL_ROUTES) {
    it(`${outputFileForRoute(route)} is DOM-equal to the prototype and has unique ids`, () => {
      const plan = report.routes.find((candidate) => candidate.pathname === planPathname(route));
      expect(plan, route).toBeDefined();
      const meta = resolvePageMeta(route, entries);
      const html = `<!doctype html>${renderToString(
        h(DocumentShell, { pathname: route, title: meta.title, description: meta.description, robots: "noindex,nofollow" }, renderRouteDocument(plan!, pinselRegistry)),
      )}`;
      const actual = normalise(html);
      expect(actual.duplicateIds).toEqual([]);
      const expected = normalise(readFileSync(path.join(dist!, outputFileForRoute(route)), "utf8"));
      if (expected.tree !== actual.tree) throw new Error(firstDifference(expected.tree, actual.tree));
    });
  }
});
