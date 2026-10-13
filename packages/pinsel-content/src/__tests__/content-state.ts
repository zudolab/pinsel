import { hasPublishedSnapshot } from "../site/content-state";

/** True while the committed content is the approved migration (no content/snapshot.json): the migration-only gates run. */
export const MIGRATION_BASELINE = !hasPublishedSnapshot();
