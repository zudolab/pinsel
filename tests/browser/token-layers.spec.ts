import path from "node:path";
import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { repoRoot, startLocalWorker, type LocalWorker } from "./local-worker";
import { ORIGIN, serve, serveRoot } from "./serve-dist";

// The responsive token overrides, observed through the real cascade on all
// three render surfaces: the public site (apps/site/dist), the Worker preview
// of a saved snapshot (`wrangler dev --env local`) and the styleguide
// component preview (apps/styleguide/dist). Each surface used to lose the
// overrides when tokens.css / colors.css were imported unlayered. Expected
// values are the approved prototype's ($SEED/prototype/src/styles.css, seed
// 2026-10-12): the @layer tokens defaults, overridden in @layer responsive at
// max-width 70rem, 47.99rem and 23rem. With PINSEL_REFERENCE_DIST set, the
// prototype dist is measured too and must give the same values.
// Prerequisites: pnpm build:site && pnpm build:sg && pnpm build:editor && pnpm assets:assemble-worker.

const REFERENCE = process.env.PINSEL_REFERENCE_DIST;
const REF_ORIGIN = "http://reference.test";
const SG_ORIGIN = "http://styleguide.test";
const sgDist = path.join(repoRoot, "apps/styleguide/dist");
const port = Number(process.env.PINSEL_TOKEN_LAYERS_PORT ?? 8866);
// Either side of 70rem (1120px) and 47.99rem (767.84px), plus desktop and phone.
const WIDTHS = [1440, 1121, 1119, 769, 767, 390];
const SG_HOME = "/components/preview/?slug=pages&variant=HomeHeroAndPricing";
const REM = 16;

interface Measured {
  headerHeight: number;
  gutter: number;
  spaceSection: number;
  space8: number;
  headerMinBlock: number;
  sectionPadding: number;
}

/** Rendered boxes: the header, and the #pricing `.container` with the width of its containing block. */
interface Layout {
  headerBox: number;
  container: number;
  parent: number;
}

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(value, min), max);

function approved(width: number): Measured {
  const collapsed = width <= 70 * REM;
  const mobile = width <= 47.99 * REM;
  const narrow = width <= 23 * REM;
  const headerHeight = mobile ? 4.75 * REM : collapsed ? 5 * REM : 5.75 * REM;
  const spaceSection = mobile ? 3.75 * REM : clamp(3.5 * REM, 2.8 * REM + 0.03 * width, 6 * REM);
  const gutter = narrow ? 1.125 * REM : mobile ? 1.5 * REM : clamp(1.25 * REM, 0.5 * REM + 0.032 * width, 3.5 * REM);
  return {
    headerHeight,
    gutter,
    spaceSection,
    space8: mobile ? 3 * REM : 4.5 * REM,
    // .site-header__inner { min-block-size: var(--header-height) }
    headerMinBlock: headerHeight,
    // .section { padding-block: var(--space-section) }
    sectionPadding: spaceSection,
  };
}

// A one-row header is its inner min-block-size plus the .site-header 1px border-block-end.
const approvedHeaderBox = (width: number) => approved(width).headerMinBlock + 1;
// .container { inline-size: min(var(--page-width), calc(100% - var(--gutter) * 2)) }, --page-width 76rem.
const approvedContainer = (width: number, parent: number) => Math.min(76 * REM, parent - approved(width).gutter * 2);
// The zudo-sg preview canvas pads the story 16px per side, so at 390px the header gets 358px and its motion toggle
// wraps to a second row; the cascade value (headerMinBlock) is still asserted there.
const SG_HEADER_WRAPS = new Set([390]);

async function measure(page: Page, url: string): Promise<{ tokens: Measured; layout: Layout }> {
  await page.goto(url);
  await page.locator(".site-header").waitFor();
  await page.locator("section.section#pricing").waitFor();
  const values = await page.evaluate(() => {
    const resolve = (name: string) => {
      const probe = document.createElement("div");
      probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${name})`;
      document.body.append(probe);
      const size = probe.getBoundingClientRect().width;
      probe.remove();
      return size;
    };
    return {
      headerHeight: resolve("--header-height"),
      gutter: resolve("--gutter"),
      spaceSection: resolve("--space-section"),
      space8: resolve("--space-8"),
      headerMinBlock: parseFloat(getComputedStyle(document.querySelector(".site-header__inner")!).minBlockSize),
      sectionPadding: parseFloat(getComputedStyle(document.querySelector("section.section#pricing")!).paddingBlockStart),
    };
  });
  const layout = await page.locator("section.section#pricing").evaluate((section) => {
    const parent = section.parentElement!;
    const style = getComputedStyle(parent);
    return {
      headerBox: document.querySelector(".site-header")!.getBoundingClientRect().height,
      container: section.getBoundingClientRect().width,
      parent: parent.getBoundingClientRect().width - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd) - parseFloat(style.borderInlineStartWidth) - parseFloat(style.borderInlineEndWidth),
    };
  });
  return { tokens: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Math.round(value * 100) / 100])) as unknown as Measured, layout };
}

function expectApproved({ tokens, layout }: { tokens: Measured; layout: Layout }, width: number, surface: string): void {
  const expected = approved(width);
  for (const key of Object.keys(expected) as (keyof Measured)[]) expect(tokens[key], `${surface} ${key} at ${width}px`).toBeCloseTo(expected[key], 1);
  if (!(surface === "styleguide" && SG_HEADER_WRAPS.has(width))) expect(layout.headerBox, `${surface} header box at ${width}px`).toBeCloseTo(approvedHeaderBox(width), 1);
  expect(layout.container, `${surface} .container width at ${width}px in a ${layout.parent}px block`).toBeCloseTo(approvedContainer(width, layout.parent), 1);
}

let worker: LocalWorker;
let previewUrl = "";

test.beforeAll(async () => {
  test.setTimeout(180_000);
  if (!existsSync(path.join(sgDist, "components/preview/index.html"))) throw new Error("apps/styleguide/dist is missing: run pnpm build:sg");
  worker = await startLocalWorker({ port, stateDir: "token-layers" });
  const draft = (await (await fetch(`${worker.origin}/api/v1/draft`, { headers: { accept: "application/json" } })).json()) as { value: { draftRevision: number } };
  const response = await fetch(`${worker.origin}/api/v1/snapshots`, { method: "POST", headers: { accept: "application/json", "content-type": "application/json", origin: worker.origin }, body: JSON.stringify({ expectedDraftRevision: draft.value.draftRevision }) });
  const snapshot = (await response.json()) as { status: string; value: { snapshotId: string; draftRevision: number } };
  expect(snapshot.status, JSON.stringify(snapshot)).toBe("ok");
  previewUrl = `${worker.origin}/preview/${snapshot.value.snapshotId}/?revision=${snapshot.value.draftRevision}`;
});

test.afterAll(async () => {
  await worker?.stop();
});

for (const width of WIDTHS) {
  test(`at ${width}px the site, the Worker preview and the styleguide preview resolve the approved responsive tokens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await serve(page);
    await serveRoot(page, SG_ORIGIN, sgDist);
    const surfaces = {
      site: await measure(page, `${ORIGIN}/`),
      preview: await measure(page, previewUrl),
      styleguide: await measure(page, `${SG_ORIGIN}${SG_HOME}`),
    };
    console.log(`token-layers ${width}px ${JSON.stringify(surfaces)}`);
    for (const [surface, values] of Object.entries(surfaces)) expectApproved(values, width, surface);
    expect(surfaces.preview, "Worker preview equals the site").toEqual(surfaces.site);
    expect(surfaces.styleguide.tokens, "styleguide preview equals the site").toEqual(surfaces.site.tokens);
  });
}

test("the approved prototype gives the same values (reference only)", async ({ page }) => {
  test.skip(!REFERENCE, "PINSEL_REFERENCE_DIST is not set; the expectations above are the prototype's CSS values");
  await serveRoot(page, REF_ORIGIN, path.resolve(REFERENCE!));
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    expectApproved(await measure(page, `${REF_ORIGIN}/`), width, "prototype");
  }
});
