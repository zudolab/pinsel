import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { JsonValue } from "@zudo-composer/component-contract";
import { canonicalStringifyJson, compileSiteProjectPlan, serializeSiteProject } from "zudo-composer/content";

import { PINSEL_ROUTES, ROUTE_FRAGMENTS, planPathname } from "../invariants";
import { assembleProjectText } from "../site/assemble";
import { GOLDEN_PATH, goldenText } from "../site/check";
import { PINSEL_COMPONENT_CONTRACT } from "../site/component-contract";
import { checkPackAgainstContract, contractPack } from "../site/contract-pack";
import { readContentEntries } from "../site/entries";
import { routeFacts } from "../site/plan-facts";
import { projectSite } from "../site/project";
import { buildPinselSite } from "../site/structure";
import { checkLinks, validateContent } from "../site/validate";

const pack = contractPack();
const entries = await readContentEntries();
const temporary = await mkdtemp(join(tmpdir(), "pinsel-structure-"));
afterAll(() => rm(temporary, { recursive: true, force: true }));
const canonical = (value: unknown) => canonicalStringifyJson(value as JsonValue);

describe("site structure (against the component contract)", () => {
  it("validates with zero diagnostics and passes every content invariant", async () => {
    const report = await validateContent(entries, pack);
    expect(report.issues).toEqual([]);
    expect(report.routes.map((route) => route.pathname).sort()).toEqual(PINSEL_ROUTES.map(planPathname).sort());
  });

  it("projects deterministically: two assemblies are byte-identical and the Node compiler equals the portable plan", async () => {
    const text = assembleProjectText(entries, pack);
    expect(assembleProjectText(entries, pack)).toBe(text);
    const projectPath = join(temporary, "site-project.json");
    await writeFile(projectPath, text);
    const node = await projectSite(projectPath, pack);
    const again = await projectSite(projectPath, pack);
    expect(canonical(again.plan)).toBe(canonical(node.plan));
    const portable = await compileSiteProjectPlan(JSON.parse(text), pack.manifest);
    expect(portable.status).toBe("ready");
    if (portable.status !== "ready") return;
    expect(canonical(portable.plan.routes)).toBe(canonical(node.plan.routes));
    expect(goldenText(node.plan)).toBe(await readFile(GOLDEN_PATH, "utf8"));
  });

  it("carries the prototype's fragments, links and art windows", async () => {
    const compiled = await compileSiteProjectPlan(JSON.parse(serializeSiteProject(buildPinselSite(entries, pack).project)), pack.manifest);
    if (compiled.status !== "ready") throw new Error(compiled.status);
    const facts = new Map(compiled.plan.routes.map((route) => [route.pathname, routeFacts(route)]));
    expect(facts.get("/")!.fragments).toEqual(ROUTE_FRAGMENTS["/"]);
    expect(facts.get("/lessons")!.fragments).toEqual(ROUTE_FRAGMENTS["/lessons/"]);
    expect(facts.get("/results")!.fragments).toEqual(ROUTE_FRAGMENTS["/results/"]);
    expect(facts.get("/notes/german-language")!.fragments).toEqual(ROUTE_FRAGMENTS["/notes/german-language/"]);
    expect(facts.get("/")!.links.filter((href) => href.startsWith("/contact/?course="))).toEqual(["/contact/?course=1", "/contact/?course=2", "/contact/?course=3"]);
    // Prototype build.py art() per page: size/drift/range.
    expect(facts.get("/")!.art).toEqual(["hero/hero/1/52", "middle/large/1/52", "closing/closing/1/52"]);
    expect(facts.get("/lessons")!.art).toEqual(["hero/medium/1/8", "middle/large/-1/52", "closing/closing/1/52"]);
    expect(facts.get("/voices")!.art).toEqual(["hero/medium/1/8", "middle/medium/-1/52", "closing/small/1/52"]);
    expect(facts.get("/contact")!.art).toEqual(["hero/ribbon/1/8", "closing/medium/1/52"]);
    expect(facts.get("/404.html")!.art).toEqual(["closing/medium/1/52"]);
    expect(checkLinks([...facts.values()])).toEqual([]);
    expect(checkLinks([{ ...facts.get("/")!, links: ["/contact/?course=9", "/lessons/#nope", "https://example.com/"] }])).toHaveLength(3);
  });

  it("reflects a content edit in the projection without touching the structure", async () => {
    const edited = entries.map((entry) => (entry.id === "two-month" ? { ...entry, values: { ...entry.values, "course-price": "¥55,000" } } : entry));
    const compiled = await compileSiteProjectPlan(JSON.parse(assembleProjectText(edited, pack)), pack.manifest);
    if (compiled.status !== "ready") throw new Error(compiled.status);
    const home = compiled.plan.routes.find((route) => route.pathname === "/")!;
    expect(JSON.stringify(home)).toContain("¥55,000");
    expect(routeFacts(home).fragments).toEqual(ROUTE_FRAGMENTS["/"]);
  });

  it("the contract pack is self-consistent; the real pack is checked by content:validate", () => {
    expect(checkPackAgainstContract(pack.manifest)).toEqual([]);
    expect(new Set(PINSEL_COMPONENT_CONTRACT.map((entry) => entry.id)).size).toBe(PINSEL_COMPONENT_CONTRACT.length);
  });
});
