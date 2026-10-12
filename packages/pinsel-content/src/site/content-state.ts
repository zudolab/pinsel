// Which state the committed content is in. Until the first publication the
// tree equals the approved migration (no content/snapshot.json), and the
// migration gates (golden plan, seed reproduction, exact migrated wording) hold
// byte for byte. Once a publication has been integrated, content/snapshot.json
// exists and CMS edits are legitimate: those gates give way to the
// snapshot-based publication checks (docs/publication.md), never the reverse.
import { existsSync } from "node:fs";
import { join } from "node:path";

import { CONTENT_SNAPSHOT_PATH } from "../import-rules";
import { REPO_ROOT } from "./entries";

export function hasPublishedSnapshot(root = REPO_ROOT): boolean {
  return existsSync(join(root, CONTENT_SNAPSHOT_PATH));
}
