import { PINSEL_CONTENT_POLICY, PINSEL_CONTENT_PROVIDER_ID, PINSEL_EDITOR_POLICY, PINSEL_MODELS, PINSEL_PROJECT_ID, PINSEL_ROUTES, refusePinselRequest } from "@pinsel/content";
import { PINSEL_PACK_ID, PINSEL_PACK_VERSION, pinselPack } from "@pinsel/ui";
import type { ContentMutationRefusal, HostContentPolicy } from "zudo-composer/content";
import type { ContentExportPackageIdentity } from "zudo-composer/export";
import type { ContentBaseline } from "zudo-composer/host-storage";
import type { SiteProject } from "zudo-composer/site-project";
// Derived by `pnpm content:assemble` (gitignored); the Worker bundle embeds the
// integrated project and the baseline identity the editor was built for.
import assembledBaseline from "../../../../packages/pinsel-content/.site-project/baseline.json";
import siteProject from "../../../../packages/pinsel-content/.site-project/site-project.json";

export const PROJECT_ID = PINSEL_PROJECT_ID;

/** The canonical project this Worker was assembled from; D1 is seeded from it once and later reconciled against it. */
export const BASELINE: ContentBaseline = {
  project: siteProject as unknown as SiteProject,
  baselineRevision: assembledBaseline.baselineRevision,
};

/** Everything site-specific the Worker decides with. Tests inject another site (e.g. the upstream conformance project). */
export interface AuthoringSite {
  projectId: string;
  providerId: string;
  /** The bundled canonical baseline (Git at assemble time). */
  canonical: ContentBaseline;
  /** Server policy, enforced through `applyHostContentRequest` on every mutation. */
  policy: HostContentPolicy;
  /** Presentation copy for the editor mount. */
  editorPolicy: HostContentPolicy;
  /** Host field rules that refuse before Composer's policy runs. */
  refuse(request: unknown): ContentMutationRefusal | null;
  packageIdentity: ContentExportPackageIdentity;
  /** Every route the preview may ever render; a snapshot renders the subset its structure declares. */
  approvedRoutes: readonly string[];
}

export const PINSEL_SITE: AuthoringSite = {
  projectId: PROJECT_ID,
  providerId: PINSEL_CONTENT_PROVIDER_ID,
  canonical: BASELINE,
  policy: PINSEL_CONTENT_POLICY,
  editorPolicy: PINSEL_EDITOR_POLICY,
  refuse: (request) => refusePinselRequest(request, PINSEL_MODELS),
  packageIdentity: { packId: PINSEL_PACK_ID, packVersion: PINSEL_PACK_VERSION, contractVersion: pinselPack.manifest.contractVersion },
  approvedRoutes: PINSEL_ROUTES,
};
