import type { Child } from "@takazudo/zfb/zudo-react";
import type { ComponentPackManifest } from "@zudo-composer/component-contract";

/** What the renderer injects into every component call as the `route` prop. */
export interface RouteContext {
  pathname: string;
}

export type RenderableComponent = (props: Record<string, unknown>) => Child;

export interface RenderRegistry {
  manifest: ComponentPackManifest;
  components: Readonly<Record<string, RenderableComponent>>;
}
