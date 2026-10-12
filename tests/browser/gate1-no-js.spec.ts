import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Gate-1 step 4: the built home page with JavaScript disabled still shows the
// three prices, their labels, the contact links and the header/footer, and
// the document carries no <script> at all.
const dist = path.resolve(import.meta.dirname, "../../apps/site/dist/index.html");

test.use({ javaScriptEnabled: false });

test("home page renders the pricing record without JavaScript", async ({ page }) => {
  const html = readFileSync(dist, "utf8");
  expect(html).not.toContain("<script");
  await page.setContent(html, { waitUntil: "load" });
  await expect(page.locator("script")).toHaveCount(0);
  const cards = page.locator("article.pricing-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.locator(".price")).toHaveText([/¥10,000/, /¥50,000/, /¥92,000/]);
  await expect(cards.locator("h3")).toHaveText(["進路相談", "2ヶ月コース", "4ヶ月コース"]);
  await expect(cards.locator(".pricing-card__popular")).toHaveText(["POPULAR"]);
  for (const index of [1, 2, 3]) await expect(page.locator(`a.text-link[href="/contact/?course=${index}"]`)).toHaveCount(1);
  await expect(page.locator("header.site-header__inner nav#site-navigation a.site-nav__item")).toHaveCount(6);
  await expect(page.locator("footer.site-footer .footer-nav li")).toHaveCount(7);
  await expect(page.locator("main#main")).toContainText("コースと料金");
});
