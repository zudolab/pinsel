import path from "node:path";
import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ORIGIN, repoRoot, serve, serveRoot } from "./serve-dist";

// The responsive token overrides, observed through the real cascade on both
// render surfaces: the public site (apps/site/dist) and the styleguide
// component preview (apps/styleguide/dist). Each surface used to lose the
// overrides when tokens.css / colors.css were imported unlayered. Expected
// body values are the approved prototype's ($SEED/prototype/src/styles.css, seed
// 2026-10-12): the @layer tokens defaults, overridden in @layer responsive at
// max-width 70rem, 47.99rem and 23rem. With PINSEL_REFERENCE_DIST set, the
// prototype dist is measured too. Header A additionally follows its container width.
// Prerequisites: pnpm build:site && pnpm build:sg.

const REFERENCE = process.env.PINSEL_REFERENCE_DIST;
const REF_ORIGIN = "http://reference.test";
const SG_ORIGIN = "http://styleguide.test";
const sgDist = path.join(repoRoot, "apps/styleguide/dist");
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
  headerInline: number;
  container: number;
  parent: number;
}

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(value, min), max);

function approved(width: number, headerInline = width, legacy = false): Measured {
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
    // Header A collapses by container width; root/body tokens still follow the viewport.
    headerMinBlock: !legacy && !mobile && headerInline <= 70 * REM ? 5 * REM : headerHeight,
    // .section { padding-block: var(--space-section) }
    sectionPadding: spaceSection,
  };
}

// A one-row header is its inner min-block-size plus the .site-header 1px border-block-end.
const approvedHeaderBox = (width: number, headerInline: number, legacy: boolean) => approved(width, headerInline, legacy).headerMinBlock + 1;
// .container { inline-size: min(var(--page-width), calc(100% - var(--gutter) * 2)) }, --page-width 76rem.
const approvedContainer = (width: number, parent: number) => Math.min(76 * REM, parent - approved(width).gutter * 2);
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
      headerInline: document.querySelector(".site-header")!.getBoundingClientRect().width,
      container: section.getBoundingClientRect().width,
      parent: parent.getBoundingClientRect().width - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd) - parseFloat(style.borderInlineStartWidth) - parseFloat(style.borderInlineEndWidth),
    };
  });
  return { tokens: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Math.round(value * 100) / 100])) as unknown as Measured, layout };
}

function expectApproved({ tokens, layout }: { tokens: Measured; layout: Layout }, width: number, surface: string): void {
  const legacy = surface === "prototype";
  const expected = approved(width, layout.headerInline, legacy);
  for (const key of Object.keys(expected) as (keyof Measured)[]) expect(tokens[key], `${surface} ${key} at ${width}px`).toBeCloseTo(expected[key], 1);
  expect(layout.headerBox, `${surface} header box at ${width}px`).toBeCloseTo(approvedHeaderBox(width, layout.headerInline, legacy), 1);
  expect(layout.container, `${surface} .container width at ${width}px in a ${layout.parent}px block`).toBeCloseTo(approvedContainer(width, layout.parent), 1);
}

test.beforeAll(() => {
  if (!existsSync(path.join(sgDist, "components/preview/index.html"))) throw new Error("apps/styleguide/dist is missing: run pnpm build:sg");
});

for (const width of WIDTHS) {
  test(`at ${width}px the site and the styleguide preview resolve the approved responsive tokens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await serve(page);
    await serveRoot(page, SG_ORIGIN, sgDist);
    const surfaces = {
      site: await measure(page, `${ORIGIN}/`),
      styleguide: await measure(page, `${SG_ORIGIN}${SG_HOME}`),
    };
    console.log(`token-layers ${width}px ${JSON.stringify(surfaces)}`);
    for (const [surface, values] of Object.entries(surfaces)) expectApproved(values, width, surface);
    const { headerMinBlock: styleguideHeader, ...styleguideBodyTokens } = surfaces.styleguide.tokens;
    const { headerMinBlock: siteHeader, ...siteBodyTokens } = surfaces.site.tokens;
    expect(styleguideBodyTokens, "styleguide body tokens equal the site").toEqual(siteBodyTokens);
    if (surfaces.styleguide.layout.headerInline > 70 * REM) expect(styleguideHeader).toBe(siteHeader);
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
