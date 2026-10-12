import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderToString } from "@takazudo/zfb/zudo-react/server";

import { prototypePages } from "./prototype-pages";

// Structural fidelity against the approved prototype's built HTML. The seed
// `dist/` is not vendored (fixtures are immutable and the dist is 14 pages of
// inline SVG), so this runs only when PINSEL_PROTOTYPE_DIST points at
// `<seed>/prototype/dist`. Both documents are compared as normalised DOM
// trees: attribute order, class order and inter-element whitespace are
// ignored; the SVG id suffix scheme (`-r5-<n>` in the prototype) is masked.
// Deliberate differences: no prototype stylesheet/script tags in <head>
// (zfb links the CSS, the visitor-scripts sub-issue adds scripts) and the
// clean `page-not-found` body class on the 404 page, and the message
// `data-*` attributes the contact form adds for the visitor script.

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
      let value = attribute.value;
      if (attribute.name === "class") value = [...new Set(value.split(/\s+/).filter(Boolean))].sort().join(" ");
      if (svg) value = value.replace(ID_SUFFIX, "-ID");
      return `${attribute.name}=${JSON.stringify(value)}`;
    })
    .sort();
  const children = [...element.childNodes].map((child) => canonical(child, svg)).filter(Boolean);
  return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}>${children.join("")}</${tag}>`;
}

function normalise(html: string): string {
  const window = new Window();
  const document = window.document;
  document.write(html);
  for (const element of [...document.querySelectorAll('head script, head link[href="/styles.css"]')]) element.remove();
  if (document.body.className.trim() === "page-404.html") document.body.className = "page-not-found";
  for (const name of FORM_MESSAGE_ATTRIBUTES) document.querySelector("#contact-form")?.removeAttribute(name);
  const out = canonical(document.documentElement as unknown as Node);
  window.close();
  return out;
}

function firstDifference(expected: string, actual: string): string {
  let index = 0;
  while (index < expected.length && expected[index] === actual[index]) index += 1;
  return `at ${index}:\n  prototype: …${expected.slice(Math.max(0, index - 160), index + 200)}\n  pinsel-ui: …${actual.slice(Math.max(0, index - 160), index + 200)}`;
}

describe.skipIf(!dist || !existsSync(dist))("prototype fidelity (PINSEL_PROTOTYPE_DIST)", () => {
  const pages = prototypePages((child) => renderToString(child));

  it("covers the fourteen approved outputs", () => {
    expect(pages.map((page) => page.file)).toHaveLength(14);
  });

  for (const page of pages) {
    it(`${page.file} matches the approved prototype DOM`, () => {
      const expected = normalise(readFileSync(path.join(dist!, page.file), "utf8"));
      const actual = normalise(page.html);
      if (expected !== actual) throw new Error(firstDifference(expected, actual));
    });
  }
});
