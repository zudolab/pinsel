import { parseMarkdown } from "@pinsel/ui";
import type { SiteProjectPlanRoute } from "zudo-composer/content";

import { CONTACT_HREF, INSTAGRAM_URL } from "../invariants";
import { CONTRACT_COMPONENT_IDS, contractComponent } from "./component-contract";

// Facts read off a compiled route document without rendering it: the
// fragment ids, links and art windows the components will emit, following
// each component's contract (component-contract.ts). Validation, the golden
// check and the publication checker compare these.

type PlanNode = SiteProjectPlanRoute["composition"]["document"]["root"][number];

export interface RouteFacts {
  pathname: string;
  /** Content fragment ids (`for-you`, `year-2025年度`, `student-1`, `section-3`, …) in document order. */
  fragments: string[];
  /** Every href the route links to, in document order (duplicates kept). */
  links: string[];
  /** `slot/size/drift/range` per art window, in document order. */
  art: string[];
  /** Component ids in document order. */
  components: string[];
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

function markdownFacts(markdown: string, facts: RouteFacts): void {
  for (const block of parseMarkdown(markdown)) {
    if (block.kind === "heading") facts.fragments.push(block.id);
    const inlines = block.kind === "paragraph" ? block.children : block.kind === "list" ? block.items.flat() : [];
    for (const inline of inlines) if (inline.kind === "link") facts.links.push(inline.href);
  }
}

function visit(node: PlanNode, slotIndex: number, facts: RouteFacts): void {
  const props = node.props as Record<string, unknown>;
  facts.components.push(node.componentId);
  switch (node.componentId) {
    case "pinsel.section":
      if (str(props.id)) facts.fragments.push(str(props.id));
      break;
    case "pinsel.message":
      facts.fragments.push("message");
      break;
    case "pinsel.year-section":
      facts.fragments.push(`year-${str(props.label)}`);
      break;
    case "pinsel.faq-category":
      facts.fragments.push(str(props.fragmentId));
      break;
    case "pinsel.voice-detail":
      facts.fragments.push(`student-${slotIndex}`);
      break;
    case "pinsel.prose":
      markdownFacts(str(props.markdown), facts);
      break;
    case "pinsel.art-window":
      facts.art.push(`${str(props.slot)}/${str(props.size)}/${str(props.drift)}/${String(props.range)}`);
      break;
    case "pinsel.site-header":
      facts.links.push("/", CONTACT_HREF);
      break;
    case "pinsel.site-footer":
      facts.links.push("/", INSTAGRAM_URL);
      break;
    case "pinsel.nav-item":
    case "pinsel.footer-nav-item":
    case "pinsel.text-link":
    case "pinsel.instructor-bio-link":
      facts.links.push(str(props.href));
      break;
    case "pinsel.breadcrumb":
      facts.links.push("/");
      if (str(props.parentHref)) facts.links.push(str(props.parentHref));
      break;
    case "pinsel.hero":
      facts.links.push(str(props.primaryHref), str(props.pricingHref));
      break;
    case "pinsel.pricing-cards":
      facts.links.push(str(props.moreHref));
      break;
    case "pinsel.pricing-card":
      facts.links.push(`/contact/?course=${String(props.courseIndex)}`);
      break;
    case "pinsel.toc-item":
      facts.links.push(str(props.href) || `#${str(props.fragmentPrefix)}${slotIndex}`);
      break;
    case "pinsel.note-toc-items":
      for (const block of parseMarkdown(str(props.markdown))) if (block.kind === "heading") facts.links.push(`#${block.id}`);
      break;
    case "pinsel.note-card":
      facts.links.push(str(props.slug) ? `/notes/${str(props.slug)}/` : str(props.href));
      break;
    case "pinsel.note-link":
      facts.links.push(`/notes/${str(props.slug)}/`);
      break;
    case "pinsel.student-link":
      facts.links.push(`#student-${slotIndex}`);
      break;
    case "pinsel.result-row":
      if (str(props.url)) facts.links.push(str(props.url));
      break;
    case "pinsel.cta":
      facts.links.push(CONTACT_HREF);
      break;
    case "pinsel.not-found":
      facts.links.push("/");
      break;
    default:
      break;
  }
  // Slots in contract order, which is each component's document order; the
  // renderer's `slotIndex` is the 1-based position inside the immediate slot.
  const slotIds = CONTRACT_COMPONENT_IDS.has(node.componentId) ? contractComponent(node.componentId).slots.map((slot) => slot.id) : Object.keys(node.slots).sort();
  for (const slotId of slotIds) (node.slots[slotId] ?? []).forEach((child, index) => visit(child, index + 1, facts));
}

export function routeFacts(route: SiteProjectPlanRoute): RouteFacts {
  const facts: RouteFacts = { pathname: route.pathname, fragments: [], links: [], art: [], components: [] };
  route.composition.document.root.forEach((root, index) => visit(root, index + 1, facts));
  return facts;
}
