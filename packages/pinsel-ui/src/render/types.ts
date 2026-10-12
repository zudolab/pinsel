import type { Child } from "@takazudo/zfb/zudo-react";
import type { ComponentPackManifest } from "@zudo-composer/component-contract";

/** What the renderer injects into every component call as the `route` prop. */
export interface RouteContext {
  pathname: string;
}

/**
 * What the renderer injects as the `position` prop: the node's 1-based place
 * among its siblings (a slot, or the document root). Materialised collection
 * entries arrive in collection order, so positional ids (`#student-2`,
 * `#faq-3`, `01` numbering) follow the content.
 */
export interface SlotPosition {
  index: number;
  count: number;
}

export type RenderableComponent = (props: Record<string, unknown>) => Child;

export interface RenderRegistry {
  manifest: ComponentPackManifest;
  components: Readonly<Record<string, RenderableComponent>>;
}
