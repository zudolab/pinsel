import type { ContentEntryRecord } from "zudo-composer/site-project";

import { NOTE_ROUTES, PINSEL_ROUTES, type PinselRoute } from "../invariants";
import { fieldId } from "../models";

export interface PageMeta {
  title: string;
  /** Empty for /404.html (the prototype emits an empty description). */
  description: string;
}

const value = (entry: ContentEntryRecord | undefined, modelId: string, key: string): string => {
  const found = entry?.values[fieldId(modelId, key)];
  return typeof found === "string" ? found : "";
};

/**
 * `<title>` / meta description of an output route from Content: `page-copy`
 * by route, and for notes `{note.title} - Pinsel Notes` / `note.description`
 * (prototype `build.py note()`). Pure, so the site build and the Worker
 * preview read the same values from their own entries.
 */
export function resolvePageMeta(route: PinselRoute, entries: readonly ContentEntryRecord[]): PageMeta {
  if ((NOTE_ROUTES as readonly string[]).includes(route)) {
    const slug = route.split("/")[2];
    const note = entries.find((entry) => entry.modelId === "note" && entry.values[fieldId("note", "slug")] === slug);
    if (!note) throw new Error(`No note entry for ${route}`);
    return { title: `${value(note, "note", "title")} - Pinsel Notes`, description: value(note, "note", "description") };
  }
  const page = entries.find((entry) => entry.modelId === "page-copy" && entry.values[fieldId("page-copy", "route")] === route);
  if (!page) throw new Error(`No page-copy entry for ${route}`);
  return { title: value(page, "page-copy", "metaTitle"), description: value(page, "page-copy", "metaDescription") };
}

export function resolveAllPageMeta(entries: readonly ContentEntryRecord[]): Record<PinselRoute, PageMeta> {
  return Object.fromEntries(PINSEL_ROUTES.map((route) => [route, resolvePageMeta(route, entries)])) as Record<PinselRoute, PageMeta>;
}
