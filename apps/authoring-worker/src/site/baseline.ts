import { PINSEL_PROJECT_ID } from "@pinsel/content";
import type { ContentBaseline } from "zudo-composer/host-storage";
import type { SiteProject } from "zudo-composer/site-project";
// Derived by `pnpm content:assemble` (gitignored); the Worker bundle embeds the
// integrated project and the baseline identity the editor was built for.
import assembledBaseline from "../../../../packages/pinsel-content/.site-project/baseline.json";
import siteProject from "../../../../packages/pinsel-content/.site-project/site-project.json";

export const PROJECT_ID = PINSEL_PROJECT_ID;

export const BASELINE: ContentBaseline = {
  project: siteProject as unknown as SiteProject,
  baselineRevision: assembledBaseline.baselineRevision,
};

/** The approved routes the preview may render; the structure manifest grows this list. */
export const PREVIEW_ROUTES: readonly string[] = ["/"];
