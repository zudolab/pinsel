import type { AdminHandler } from "../app";
import { json } from "../api/handlers";
import { seedD1ContentDraftStorage } from "../storage/d1-content-draft-storage";

// `POST /admin/seed`, compiled only into the local entry (src/local-dev.ts;
// scripts/check-worker-bundle.mjs greps the production bundle for the marker).
// Seeds the bundled baseline into an empty store. Seeding only ever inserts
// into an empty project, so rows written after the seed — newer drafts,
// receipts, snapshots, advanced baselines — are never overwritten.
export const LOCAL_SEED_MARKER = "pinsel-local-admin-seed";

export const localSeedHandler: AdminHandler = async (request, url, context) => {
  if (url.pathname !== "/admin/seed") return null;
  if (request.method !== "POST") return json({ status: "not-found" }, 404);
  const seeded = await seedD1ContentDraftStorage(context.db, context.site.canonical, { projectId: context.site.projectId });
  const [baseline, draft] = await Promise.all([context.adapter.readBaseline(), context.adapter.readDraft()]);
  if (baseline.status !== "ok" || draft.status !== "ok") return json({ status: "unavailable", message: "The store could not be read after seeding." }, 503);
  return json({
    status: "ok",
    value: {
      seeded,
      seedBaselineRevision: context.site.canonical.baselineRevision,
      baselineRevision: baseline.value.baselineRevision,
      draftRevision: draft.value.draftRevision,
      ...(seeded ? {} : { kept: "The store already holds this project; nothing was overwritten." }),
    },
  }, 200, { "x-pinsel-admin": LOCAL_SEED_MARKER });
};
