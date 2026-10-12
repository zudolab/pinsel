import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { pinselPack } from "@pinsel/ui";
import { compileSiteProjectPlan } from "zudo-composer/content";

import { renderRouteBody } from "../src/preview/preview";
import { BASELINE, PROJECT_ID } from "../src/site/baseline";
import { createD1ContentDraftStorage, resetD1ContentDraftStorage, seedD1ContentDraftStorage } from "../src/storage/d1-content-draft-storage";

// Gate-1 item 6: inside workerd, snapshot -> portable projection
// (compileSiteProjectPlan) -> renderRouteDocument -> HTML must equal the HTML
// the Node path produces (compileStaticSite -> the same renderer), and the
// body the ZFB build emitted for the same project.

function bodyOf(document: string): string {
  const start = document.indexOf("<body");
  const open = document.indexOf(">", start);
  const end = document.lastIndexOf("</body>");
  if (start === -1 || end === -1) throw new Error("document has no <body>");
  return document.slice(open + 1, end);
}

beforeEach(async () => {
  await resetD1ContentDraftStorage(env.DB);
  await seedD1ContentDraftStorage(env.DB, BASELINE, { projectId: PROJECT_ID });
});

describe("workerd route projection parity", () => {
  it("renders a saved snapshot byte-identically to the Node compileStaticSite path", async () => {
    const adapter = createD1ContentDraftStorage(env.DB, { projectId: PROJECT_ID });
    const draft = await adapter.readDraft();
    if (draft.status !== "ok") throw new Error("draft must read");
    const snapshot = await adapter.snapshot({ expectedDraftRevision: draft.value.draftRevision });
    if (snapshot.status !== "ok") throw new Error(`snapshot failed: ${JSON.stringify(snapshot)}`);
    const compiled = await compileSiteProjectPlan(snapshot.value.project, pinselPack.manifest);
    expect(compiled.status).toBe("ready");
    if (compiled.status !== "ready") return;
    const route = compiled.plan.routes.find((candidate) => candidate.pathname === "/");
    expect(route).toBeDefined();
    const workerHtml = renderRouteBody(route!);
    expect(workerHtml).toContain("¥50,000");
    expect(env.NODE_HOME_HTML.length).toBeGreaterThan(1000);
    expect(workerHtml).toBe(env.NODE_HOME_HTML);
  });

  it("equals the body the ZFB static build emitted (modulo the layout wrapper)", async () => {
    // `pnpm build:site` must have run; an absent build is a failure of the proof, not a skip.
    expect(env.ZFB_HOME_HTML.length, "apps/site/dist/index.html missing: run pnpm build:site before this test").toBeGreaterThan(0);
    const adapter = createD1ContentDraftStorage(env.DB, { projectId: PROJECT_ID });
    const draft = await adapter.readDraft();
    if (draft.status !== "ok") throw new Error("draft must read");
    const snapshot = await adapter.snapshot({ expectedDraftRevision: draft.value.draftRevision });
    if (snapshot.status !== "ok") throw new Error("snapshot failed");
    const compiled = await compileSiteProjectPlan(snapshot.value.project, pinselPack.manifest);
    if (compiled.status !== "ready") throw new Error("projection blocked");
    const workerHtml = renderRouteBody(compiled.plan.routes.find((candidate) => candidate.pathname === "/")!);
    expect(workerHtml).toBe(bodyOf(env.ZFB_HOME_HTML));
    // The public layout's only scripts are the three visitor client entries, in <head>; the body has none.
    expect(env.ZFB_HOME_HTML.match(/<script\b[^>]*>/g)).toEqual(["art-clock", "motion", "site"].map((name) => expect.stringMatching(new RegExp(`^<script type="module" src="/assets/client/${name}-[0-9a-f]{8}\\.js">$`))));
    expect(bodyOf(env.ZFB_HOME_HTML)).not.toContain("<script");
  });
});
