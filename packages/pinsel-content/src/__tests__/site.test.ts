import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { pinselPack, pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import { canonicalStringifyJson, compileSiteProjectPlan, stripSiteBuildModules, validateSiteProject } from "zudo-composer/content";
import { compileStaticSite } from "zudo-composer/site-build";
import type { JsonValue } from "@zudo-composer/component-contract";

import { readContentEntries } from "../site/entries";
import { GATE1_ROUTE, buildGate1Project } from "../site/proof";
import { PINSEL_CONTENT_POLICY } from "../policy";

const canonical = (value: unknown) => canonicalStringifyJson(value as JsonValue);
const entries = await readContentEntries();
const { project } = buildGate1Project(entries);
const temporary = await mkdtemp(join(tmpdir(), "pinsel-gate1-"));
afterAll(() => rm(temporary, { recursive: true, force: true }));

describe("Gate-1 site project", () => {
  it("reads the three course entries from content/entries", () => {
    expect(entries.map((entry) => entry.id)).toEqual(["consultation", "four-month", "two-month"]);
    expect(entries.every((entry) => entry.modelId === "course")).toBe(true);
    const policy = PINSEL_CONTENT_POLICY.models.course!;
    expect(policy.fields).toContain("course-price");
    expect(policy.fields).not.toContain("course-order");
  });

  it("validates against the Pinsel component pack", () => {
    const result = validateSiteProject(project, { componentPack: pinselPack.manifest });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("projects one home route with the frame template and the three materialised courses", async () => {
    const compiled = await compileSiteProjectPlan(project, pinselPack.manifest);
    expect(compiled.status).toBe("ready");
    if (compiled.status !== "ready") return;
    const [route] = compiled.plan.routes;
    expect(compiled.plan.routes.map((candidate) => candidate.pathname)).toEqual([GATE1_ROUTE]);
    expect(route!.composition.linkedSource?.ref.recordId).toBe("frame");
    expect(route!.materializationSources?.flatMap((source) => source.entries.map((entry) => entry.recordId))).toEqual(["consultation", "two-month", "four-month"]);
    expect(route!.materializationSources?.every((source) => source.attachmentId === "home-courses")).toBe(true);
    expect(JSON.stringify(route)).not.toContain('"code"');
    const html = renderToString(renderRouteDocument(route!, pinselRegistry));
    expect(html).toContain("¥10,000");
    expect(html).toContain("¥50,000");
    expect(html).toContain("¥92,000");
    expect(html).toContain('href="/contact/?course=3"');
    expect(html).toContain('<span class="pricing-card__popular">POPULAR</span>');
    expect(html.indexOf('class="site-header"')).toBeLessThan(html.indexOf('id="pricing"'));
    expect(html.indexOf('id="pricing"')).toBeLessThan(html.indexOf('class="site-footer"'));
  });

  it("portable projection equals the Node release compiler's plan (modules stripped)", async () => {
    const projectPath = join(temporary, "site-project.json");
    await writeFile(projectPath, JSON.stringify(project));
    const node = await compileStaticSite({ projectPath, pack: pinselPack, assetsStoreRoot: join(temporary, "assets") });
    const portable = await compileSiteProjectPlan(project, pinselPack.manifest);
    expect(portable.status).toBe("ready");
    if (portable.status !== "ready") return;
    expect(canonical(portable.plan)).toBe(canonical(stripSiteBuildModules(node.build)));
    expect(node.build.modules.length).toBeGreaterThan(0);
  });
});
