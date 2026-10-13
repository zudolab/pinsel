import type { Child } from "@takazudo/zfb/zudo-react";

// Structural copy of `@takazudo/zudo-sg/stories` (`StoryMeta`, `Story`): the
// stories live in this package but the engine is a dependency of
// apps/styleguide only, so the types are declared here and stay assignable to
// the engine's own (apps/styleguide type-checks the generated registry).

export interface StoryMeta {
  title: string;
  category: string;
  description: string;
  usage: string;
  order?: number;
  previewRoute?: string;
}

export interface Story<P = Record<string, unknown>> {
  name: string;
  render: (args?: Partial<P>) => Child;
  source?: string;
}
