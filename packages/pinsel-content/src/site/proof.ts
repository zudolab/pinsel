import { pinselPack } from "@pinsel/ui";
import { defineSite, node } from "zudo-composer/authoring";
import type { ContentEntryRecord, Model, SiteProject } from "zudo-composer/site-project";

import { modelInput } from "../models/dsl";
import { courseModel } from "../models/collections";
import { PINSEL_CONTENT_PROVIDER_ID } from "../models/define";
import { PINSEL_PROJECT_ID } from "../policy";

// Gate-1 structure: the global frame template, the home page with its pricing
// section, and the `course` collection materialised into the pricing grid.
// The content-migration sub-issue replaces this file with the full
// `defineSite` structure for all 14 outputs under src/site/.

export const GATE1_ROUTE = "/";

/** Literals the prototype hard-codes around the pricing grid; `site-copy` fields in the full structure. */
export const GATE1_LITERALS = {
  pricingEyebrow: "COURSE & PRICING",
  pricingTitle: "コースと料金",
  pricingNote: "※ お問い合わせ後にコースをお選びいただけます",
  pricingMoreLabel: "クラスの詳細はこちら",
} as const;

export interface Gate1Site {
  project: SiteProject;
  models: ReadonlyMap<string, Model>;
}

/** The validated-shape project with `entries` as the Content provider's entries. */
export function buildGate1Project(entries: readonly ContentEntryRecord[]): Gate1Site {
  const site = defineSite({ id: PINSEL_PROJECT_ID, name: "Pinsel", componentPack: pinselPack });
  const models = new Map<string, Model>();
  const course = site.model(modelInput(courseModel, models));
  models.set(courseModel.id, course);

  const frame = site.template({
    id: "frame",
    name: "Site frame",
    root: [node("pinsel.site-frame", {}, { main: [] }, "frame-root")],
    outlet: { id: "main", label: "Main", target: { parentId: "frame-root", slotId: "main" } },
  });

  const card = site.page({ id: "pricing-card", name: "Pricing card", root: [node("pinsel.pricing-card", {}, {}, "card")] });
  const courses = site.mapping({
    id: "courses",
    name: "Courses",
    model: course,
    composition: card,
    mode: { kind: "collection", sort: [{ field: "order", direction: "asc" }] },
    bindings: [
      { field: "name", nodeId: "card", prop: "name" },
      { field: "price", nodeId: "card", prop: "price" },
      { field: "unit", nodeId: "card", prop: "unit" },
      { field: "homeDescription", nodeId: "card", prop: "description" },
      { field: "featured", nodeId: "card", prop: "featured" },
      { field: "order", nodeId: "card", prop: "courseIndex" },
    ],
  });

  const home = site.page({
    id: "home",
    name: "Home",
    template: frame,
    root: [
      node("pinsel.section", { id: "pricing", eyebrow: GATE1_LITERALS.pricingEyebrow, title: GATE1_LITERALS.pricingTitle }, {
        content: [node("pinsel.pricing-cards", { note: GATE1_LITERALS.pricingNote, moreLabel: GATE1_LITERALS.pricingMoreLabel, moreHref: "/lessons/" }, {}, "home-pricing")],
      }, "home-pricing-section"),
    ],
  });
  site.attach(courses, { nodeId: "home-pricing", slotId: "items" }, "home-courses");
  site.sitemap({ id: "main", name: "Main", root: { id: "home", title: "Pinsel", page: home } });

  const project = site.toSiteProject();
  const provider = project.providers.content.find((candidate) => candidate.id === PINSEL_CONTENT_PROVIDER_ID);
  if (!provider) throw new Error(`defineSite produced no "${PINSEL_CONTENT_PROVIDER_ID}" provider.`);
  provider.entries = [...entries];
  return { project, models };
}
