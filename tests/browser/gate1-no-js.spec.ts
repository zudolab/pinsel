import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ORIGIN, OUTPUT_ROUTES, outputFile, serve } from "./serve-dist";

// Every built output with JavaScript disabled still shows its content and
// frame; each document's only scripts are the three visitor client entries.
// (Gate-1 step 4 started this lane with the home pricing record.)
test.use({ javaScriptEnabled: false });

const VISITOR_SCRIPT = (name: string) => new RegExp(`^/assets/client/${name}-[0-9a-f]{8}\\.js$`);

for (const route of OUTPUT_ROUTES) {
  test(`${route} renders without JavaScript`, async ({ page }) => {
    const html = readFileSync(outputFile(route), "utf8");
    const tags = html.match(/<script\b[^>]*>/g) ?? [];
    expect(tags).toHaveLength(3);
    await serve(page);
    await page.goto(`${ORIGIN}${route}`);
    const scripts = page.locator("script");
    await expect(scripts).toHaveCount(3);
    for (const [index, name] of ["art-clock", "motion", "site"].entries()) {
      await expect(scripts.nth(index)).toHaveAttribute("type", "module");
      await expect(scripts.nth(index)).toHaveAttribute("src", VISITOR_SCRIPT(name));
    }
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator("header.site-header__inner nav#site-navigation a.site-nav__item")).toHaveCount(6);
    await expect(page.locator("footer.site-footer .footer-nav li")).toHaveCount(7);
    const main = page.locator("main#main");
    await expect(main.locator("h1")).toBeVisible();
    expect((await main.innerText()).trim().length).toBeGreaterThan(20);
    const current = page.locator('#site-navigation a[aria-current="page"]');
    const section = route === "/" || route === "/404.html" ? null : `/${route.split("/")[1]}/`;
    if (section) await expect(current).toHaveAttribute("href", section);
    else await expect(current).toHaveCount(0);
  });
}

test("home page renders the pricing record without JavaScript", async ({ page }) => {
  await serve(page);
  await page.goto(`${ORIGIN}/`);
  const cards = page.locator("article.pricing-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.locator(".price")).toHaveText([/¥10,000/, /¥50,000/, /¥92,000/]);
  await expect(cards.locator("h3")).toHaveText(["進路相談", "2ヶ月コース", "4ヶ月コース"]);
  await expect(cards.locator(".pricing-card__popular")).toHaveText(["POPULAR"]);
  for (const index of [1, 2, 3]) await expect(page.locator(`a.text-link[href="/contact/?course=${index}"]`)).toHaveCount(1);
  await expect(page.locator("main#main")).toContainText("コースと料金");
});

test("the graduates illustration is a real image beside, then below, the copy", async ({ page }) => {
  await serve(page);
  const image = page.locator('#graduates figure.graduate-illustration img[src="/assets/illustrations/10-form-through-dialogue.png"]');
  const prose = page.locator("#graduates .graduate-content > .prose");
  for (const { width, beside } of [{ width: 1440, beside: true }, { width: 768, beside: true }, { width: 767, beside: false }, { width: 390, beside: false }]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ORIGIN}/lessons/`);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(1254);
    await expect(prose.locator("p")).toHaveCount(4);
    const [text, figure] = [await prose.boundingBox(), await image.boundingBox()];
    expect(text && figure).toBeTruthy();
    if (beside) expect(figure!.x).toBeGreaterThanOrEqual(text!.x + text!.width - 1);
    else expect(figure!.y).toBeGreaterThanOrEqual(text!.y + text!.height - 1);
  }
});
