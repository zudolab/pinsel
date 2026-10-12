import type { Child } from "@takazudo/zfb/zudo-react";
import type { ComponentManifest } from "@zudo-composer/component-contract";
import type { SiteProjectPlanRoute } from "zudo-composer/content";
import type { RenderRegistry, RouteContext, SlotPosition } from "./types";

// The one bridge from a compiled Composer route to Pinsel HTML. It walks
// `composition.document` (plus `linkedSource` for a global template) and calls
// zudo-react components by manifest id. Generated `modules[].code` is never
// read: the portable plan carries none and this renderer has no evaluator.
// Every node is checked against its manifest before it renders: unknown
// components, props, slots and children a slot does not accept are refused.

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

const INJECTED_PROPS = new Set(["route", "position"]);

function checkNode(manifest: ComponentManifest, node: RouteCompositionNode): void {
  const declared = new Set([...Object.keys(manifest.defaults), ...manifest.fields.map((field) => field.prop)]);
  for (const prop of Object.keys(node.props)) {
    if (INJECTED_PROPS.has(prop) || !declared.has(prop)) {
      throw new RouteRenderError(`Node ${node.id} sets "${prop}", which ${node.componentId} does not declare.`);
    }
  }
  for (const slotId of Object.keys(node.slots)) {
    if (!manifest.slots.some((slot) => slot.id === slotId)) {
      throw new RouteRenderError(`Node ${node.id} fills slot "${slotId}", which ${node.componentId} does not declare.`);
    }
  }
}

function renderChildren(registry: RenderRegistry, nodes: readonly RouteCompositionNode[], route: RouteContext, outlet: Outlet | undefined, accepts?: readonly string[]): Child[] {
  return nodes.map((child, index) => {
    if (accepts && !accepts.includes(child.componentId)) {
      throw new RouteRenderError(`Node ${child.id} (${child.componentId}) is not accepted here; the slot takes ${accepts.join(", ")}.`);
    }
    return renderNode(registry, child, route, { index: index + 1, count: nodes.length }, outlet);
  });
}

function renderNode(registry: RenderRegistry, node: RouteCompositionNode, route: RouteContext, position: SlotPosition, outlet: Outlet | undefined): Child {
  const manifest = definition(registry, node);
  const component = registry.components[node.componentId];
  if (!component) throw new RouteRenderError(`No renderer registered for "${node.componentId}".`);
  checkNode(manifest, node);
  const props: Record<string, unknown> = { ...manifest.defaults, ...node.props, route, position };
  for (const slot of manifest.slots) {
    const projected = outlet !== undefined && outlet.parentId === node.id && outlet.slotId === slot.id;
    const children = projected ? outlet.children : (node.slots[slot.id] ?? []);
    props[slot.prop] = renderChildren(registry, children, route, projected ? undefined : outlet, projected ? undefined : slot.accepts);
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
  return renderChildren(registry, view.document.root, route, view.outlet);
}
