import { expect, test, type Page } from "@playwright/test";
import { ORIGIN, serve } from "./serve-dist";

// zudolab/pinsel#10: the three visitor client-script entries, loaded by the
// site layout, on the real built routes: the menu on /, the TOC rail and art
// window on /faq/, the contact form on /contact/.

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
}

async function sectionTop(page: Page, id: string): Promise<number> {
  return page.evaluate((target) => document.getElementById(target)!.getBoundingClientRect().top + window.scrollY, id);
}

test.describe("menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Escape closes the mobile menu and returns focus to the toggle", async ({ page }) => {
    const errors = trackErrors(page);
    await serve(page);
    await page.goto(`${ORIGIN}/`);
    const toggle = page.locator(".menu-toggle");
    const nav = page.locator("#site-navigation");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toHaveAttribute("data-open", "");
    await nav.locator("a").first().focus();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav).not.toHaveAttribute("data-open");
    await expect(toggle).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--header-offset"))).toMatch(/^\d+px$/);
    expect(errors).toEqual([]);
  });
});

test.describe("page TOC", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("aria-current follows the reading line scrolling down and back up", async ({ page }) => {
    const errors = trackErrors(page);
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const current = page.locator('.page-toc a[aria-current="location"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("href", "#faq-1");
    for (const id of ["faq-2", "faq-3", "faq-4"]) {
      await scrollToY(page, (await sectionTop(page, id)) - 100);
      await expect(current).toHaveAttribute("href", `#${id}`);
    }
    for (const id of ["faq-3", "faq-2"]) {
      await scrollToY(page, (await sectionTop(page, id)) - 100);
      await expect(current).toHaveAttribute("href", `#${id}`);
    }
    await scrollToY(page, 0);
    await expect(current).toHaveAttribute("href", "#faq-1");
    await expect(current).toHaveCount(1);

    await page.locator('.page-toc a[href="#faq-3"]').click();
    await expect(page.locator("#faq-3")).toBeFocused();
    await expect(page.locator("#faq-3")).toHaveAttribute("tabindex", "-1");
    await expect(current).toHaveAttribute("href", "#faq-3");
    expect(errors).toEqual([]);
  });
});

test.describe("motion and pigment clock", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("reduced motion paints once, then stops --art-* and parallax", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // 1.5 minutes into the cycle: mid-segment, so a live clock changes visibly every second.
    await page.clock.install({ time: new Date("2026-10-13T00:01:30Z") });
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-reduced-motion", "true");
    await expect(root).toHaveAttribute("data-motion", "off");
    await expect(root).toHaveAttribute("data-art-mode", "paused");
    await expect(page.locator("[data-motion-toggle]")).toBeDisabled();
    const sample = () => page.evaluate(() => [document.documentElement.style.getPropertyValue("--art-back"), document.documentElement.dataset.artPhase]);
    const first = await sample();
    expect(first[0]).toMatch(/^rgb\([\d.]+ [\d.]+ [\d.]+\)$/);
    await page.clock.runFor(5000);
    expect(await sample()).toEqual(first);
    await scrollToY(page, 400);
    await page.clock.runFor(100);
    await expect(page.locator(".art-window [data-depth]").first()).toHaveCSS("transform", "none");
  });

  test("live clock ticks, parallax moves, and the toggle persists `off`", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install({ time: new Date("2026-10-13T00:01:30Z") });
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-motion", "on");
    await expect(root).toHaveAttribute("data-art-mode", "live");
    const phase = () => page.evaluate(() => document.documentElement.dataset.artPhase);
    const before = await phase();
    await page.clock.runFor(3000);
    expect(await phase()).not.toBe(before);

    await scrollToY(page, 300);
    await page.clock.runFor(100);
    await expect.poll(() => page.locator('.art-window [data-depth="0.85"]').first().evaluate((node) => (node as SVGElement).style.transform)).toMatch(/^translate\(/);

    const toggle = page.locator("[data-motion-toggle]");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(root).toHaveAttribute("data-motion", "off");
    await expect(root).toHaveAttribute("data-art-mode", "paused");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle.locator("[data-motion-label]")).toHaveText("動き OFF");
    expect(await page.evaluate(() => localStorage.getItem("pinsel-motion"))).toBe("off");
    await expect(page.locator(".art-window [data-depth]").first()).toHaveCSS("transform", "none");
    const paused = await phase();
    await page.clock.runFor(3000);
    expect(await phase()).toBe(paused);

    await page.reload();
    await expect(root).toHaveAttribute("data-motion", "off");
    await expect(root).toHaveAttribute("data-art-mode", "paused");
  });
});

test.describe("contact form", () => {
  test("?course=N preselects, validates, and simulates the submit without any request", async ({ page }) => {
    const errors = trackErrors(page);
    await serve(page);
    await page.goto(`${ORIGIN}/contact/?course=2`);
    await expect(page.locator("#course")).toHaveValue("2ヶ月コース");
    // Font subsets (unicode-range) may load lazily as new glyphs render; anything else would be a submission.
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET" || !new URL(request.url()).pathname.startsWith("/assets/fonts/")) requests.push(`${request.method()} ${request.url()}`);
    });

    await page.locator("[type=submit]").click();
    const name = page.locator("#name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", "name-error");
    await expect(page.locator("#name-error")).toHaveText("お名前を入力してください。");
    await expect(page.locator("#message-error")).toHaveText("ご相談内容を入力してください。");

    await name.fill("高津戸");
    await expect(name).not.toHaveAttribute("aria-invalid");
    await page.locator("#email").fill("not-an-address");
    await page.locator("#message").fill("相談内容");
    await page.locator("[type=submit]").click();
    await expect(page.locator("#email")).toBeFocused();
    await expect(page.locator("#email-error")).toHaveText("メールアドレスの形式をご確認ください。");

    await page.locator("#email").fill("visitor@example.test");
    await page.locator("[type=submit]").click();
    await expect(page.locator("[data-submit-label]")).toHaveText("送信中...");
    const success = page.locator(".form-success");
    await expect(success).toBeVisible();
    await expect(success).toBeFocused();
    await expect(page.locator("#contact-form")).toBeHidden();
    await page.locator("[data-form-back]").click();
    await expect(page.locator("#contact-form")).toBeVisible();
    await expect(name).toBeFocused();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("ignores the removed ?state= review switch", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/contact/?state=success`);
    await expect(page.locator("#contact-form")).toBeVisible();
    await expect(page.locator(".form-success")).toBeHidden();
    await page.goto(`${ORIGIN}/contact/?state=error`);
    await expect(page.locator("[data-form-error]")).toBeHidden();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the pages stay usable: content, TOC links, form and frame render", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".page-toc a")).toHaveCount(4);
    await expect(page.locator(".page-toc a[aria-current]")).toHaveCount(0);
    await expect(page.locator("#faq-4 h2")).toHaveText("費用・申し込みについて");
    await expect(page.locator("#site-navigation a.site-nav__item")).toHaveCount(6);
    await page.goto(`${ORIGIN}/contact/`);
    await expect(page.locator("#contact-form")).toBeVisible();
    await expect(page.locator(".form-success")).toBeHidden();
  });
});
