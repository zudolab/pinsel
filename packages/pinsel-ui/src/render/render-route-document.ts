import type { Child } from "@takazudo/zfb/zudo-react";
import type { ComponentManifest } from "@zudo-composer/component-contract";
import type { SiteProjectPlanRoute } from "zudo-composer/content";
import type { RenderRegistry, RouteContext } from "./types";

// The one bridge from a compiled Composer route to Pinsel HTML. It walks
// `composition.document` (plus `linkedSource` for a global template) and calls
// zudo-react components by manifest id. Generated `modules[].code` is never
// read: the portable plan carries none and this renderer has no evaluator.

export type RouteDocument = SiteProjectPlanRoute;
export type RouteCompositionDocument = RouteDocument["composition"]["document"];
export type RouteCompositionNode = RouteCompositionDocument["root"][number];

interface Outlet {
  parentId: string;
  slotId: string;
  children: readonly RouteCompositionNode[];
}

export class RouteRenderError extends Error {
  readonly name = "RouteRenderError";
}

function definition(registry: RenderRegistry, node: RouteCompositionNode): ComponentManifest {
  const found = registry.manifest.components.find((component) => component.id === node.componentId);
  if (!found) throw new RouteRenderError(`Unknown component "${node.componentId}" (node ${node.id}).`);
  if (found.schemaVersion !== node.componentVersion) {
    throw new RouteRenderError(`Node ${node.id} was authored against ${node.componentId}@${node.componentVersion}; the pack ships ${found.schemaVersion}.`);
  }
  return found;
}

function renderNode(registry: RenderRegistry, node: RouteCompositionNode, route: RouteContext, outlet: Outlet | undefined): Child {
  const manifest = definition(registry, node);
  const component = registry.components[node.componentId];
  if (!component) throw new RouteRenderError(`No renderer registered for "${node.componentId}".`);
  const props: Record<string, unknown> = { ...manifest.defaults, ...node.props, route };
  for (const slot of manifest.slots) {
    const projected = outlet !== undefined && outlet.parentId === node.id && outlet.slotId === slot.id;
    const children = projected ? outlet.children : (node.slots[slot.id] ?? []);
    props[slot.prop] = children.map((child) => renderNode(registry, child, route, projected ? undefined : outlet));
  }
  return component(props);
}

/** Same verification the upstream Preact delivery runtime performs before projecting into a template outlet. */
function linkedView(routeDocument: RouteDocument, registry: RenderRegistry): { document: RouteCompositionDocument; outlet?: Outlet } {
  const { composition } = routeDocument;
  const linked = composition.linkedSource;
  if (!linked) return { document: composition.document };
  const publication = linked.document.publication;
  const binding = composition.document.binding;
  const owners: RouteCompositionNode[] = [];
  const visit = (nodes: readonly RouteCompositionNode[]): void => {
    for (const node of nodes) {
      if (node.id === linked.outlet.target.parentId) owners.push(node);
      Object.values(node.slots).forEach(visit);
    }
  };
  visit(linked.document.root);
  const owner = owners[0];
  if (
    publication?.kind !== "global-template" ||
    publication.outlet.id !== linked.outlet.id ||
    publication.outlet.target.parentId !== linked.outlet.target.parentId ||
    publication.outlet.target.slotId !== linked.outlet.target.slotId ||
    !binding ||
    binding.sourceRecordId !== linked.ref.recordId ||
    binding.outletId !== linked.outlet.id ||
    owners.length !== 1 ||
    !owner ||
    !definition(registry, owner).slots.some((slot) => slot.id === linked.outlet.target.slotId)
  ) {
    throw new RouteRenderError(`Route ${routeDocument.pathname}: the linked template outlet does not verify.`);
  }
  return { document: linked.document, outlet: { ...linked.outlet.target, children: composition.document.root } };
}

export function renderRouteDocument(routeDocument: RouteDocument, registry: RenderRegistry): Child {
  const view = linkedView(routeDocument, registry);
  const route: RouteContext = { pathname: routeDocument.pathname };
  return view.document.root.map((node) => renderNode(registry, node, route, view.outlet));
}
