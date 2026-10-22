import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { serveRoot } from "./serve-dist";
import { repoRoot } from "./local-worker";

const origin = "http://styleguide.test";
const dist = path.join(repoRoot, "apps/styleguide/dist");
const hostRequire = createRequire(path.join(repoRoot, "apps/styleguide/package.json"));

for (const width of [1440, 390]) {
  test(`styleguide document navigation and doc 7 loading CSS at ${width}px`, async ({ page }) => {
    const { buildPageLoadingOverlayBootstrap } = await import(pathToFileURL(hostRequire.resolve("@takazudo/zudo-doc/page-loading")).href);
    await page.setViewportSize({ width, height: 900 });
    await serveRoot(page, origin, dist);
    await page.route(`${origin}/components`, (route) => route.fulfill({ contentType: "text/html", body: readFileSync(path.join(dist, "components/index.html")) }));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/docs/getting-started/`);
    const header = page.locator("body > header");
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("view-transition-name", "zfb-header");
    await expect(page.locator("#page-loading-overlay")).toHaveCount(0);

    // This host intentionally omits the router and overlay. Exercise the public
    // bootstrap against its shipped CSS in a test-only fixture, preserving that choice.
    await page.evaluate(() => {
      const overlay = document.createElement("div");
      overlay.id = "loading-contract-fixture";
      overlay.className = "page-loading-overlay";
      overlay.setAttribute("aria-hidden", "true");
      document.body.append(overlay);
    });
    await page.addScriptTag({ content: buildPageLoadingOverlayBootstrap("loading-contract-fixture") });
    const overlay = page.locator("#loading-contract-fixture");
    for (const completion of ["zfb:after-swap", "zfb:navigation-aborted"]) {
      await page.evaluate(() => document.dispatchEvent(new Event("zfb:before-preparation")));
      await expect(overlay).toHaveAttribute("aria-hidden", "false");
      await expect(overlay).toHaveCSS("opacity", "1");
      const loadingBox = await overlay.boundingBox();
      const headerBox = await header.boundingBox();
      expect(loadingBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      const contentBox = await page.locator(".zd-sidebar-content-wrapper").boundingBox();
      expect(loadingBox!.x).toBeGreaterThanOrEqual(contentBox!.x - 1);
      await page.evaluate((event) => document.dispatchEvent(new Event(event)), completion);
      await expect(overlay).toHaveAttribute("aria-hidden", "true");
      await expect(overlay).toHaveCSS("opacity", "0");
    }
    await overlay.evaluate((element) => element.remove());
    if (width === 1440) {
      await page.locator('a[href="/components"]:visible').first().click();
    } else {
      await page.goto(`${origin}/components`);
    }
    await expect(page).toHaveURL(`${origin}/components`);
    await expect(header).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("#page-loading-overlay")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(`${origin}/docs/getting-started/`);
    await expect(page.getByRole("heading", { name: "Getting started", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
