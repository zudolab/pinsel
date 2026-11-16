import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect, test } from "@playwright/test";
import { ORIGIN, OUTPUT_ROUTES, serve } from "./serve-dist";

const widths = [320, 360, 375, 390, 768, 1024, 1120, 1121, 1184, 1280, 1440, 1920];
const caption = "ONLINE PREPARATION FOR GERMAN ART SCHOOLS";

test("all shared routes retain the exact header A and original footer branding", async ({ page }) => {
  await serve(page);
  for (const route of OUTPUT_ROUTES) {
    await page.goto(`${ORIGIN}${route}`);
    const header = page.locator(".site-header");
    await expect(header.locator(".brand")).toHaveAccessibleName(`Pinsel ${caption}`);
    await expect(header.locator(".brand__caption")).toHaveAttribute("lang", "en");
    await expect(header.locator(".brand__caption > span")).toHaveText(["ONLINE PREPARATION", "FOR GERMAN ART SCHOOLS"]);
    await expect(header.locator("[data-motion-toggle], .motion-toggle, .brand__sub")).toHaveCount(0);
    await expect(header.locator(".site-nav__item")).toHaveText(["オンラインクラス", "講師紹介", "合格実績", "生徒の声", "Notes", "よくある質問"]);
    await expect(header.locator(".site-nav__contact")).toHaveAttribute("href", "/contact/");
    await expect(header.locator(".site-nav__contact .ui-icon")).toHaveCount(1);
    await expect(page.locator("footer .brand")).toHaveAccessibleName("Pinsel ART STUDY IN GERMANY");
  }
});

for (const width of widths) test(`header A fits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await serve(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/lessons/", "/about/"]) {
    await page.goto(`${ORIGIN}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.locator(".site-header").evaluate(header => {
      const word = header.querySelector(".brand__word")!.getBoundingClientRect();
      const sub = header.querySelector(".brand__caption")!.getBoundingClientRect();
      const brand = header.querySelector(".brand")!.getBoundingClientRect();
      const control = header.querySelector(".menu-toggle")!.getBoundingClientRect();
      const inner = header.querySelector(".site-header__inner")!.getBoundingClientRect();
      const styles = getComputedStyle(header.querySelector(".brand")!);
      const lines = [...header.querySelectorAll(".brand__caption > span")].map(line => { const rect = line.getBoundingClientRect(); return { height: rect.height, lineHeight: parseFloat(getComputedStyle(line).lineHeight) }; });
      return { wordRight: word.right, subLeft: sub.left, subRight: sub.right, brandTop: brand.top, brandBottom: brand.bottom, controlTop: control.top, controlLeft: control.left, innerRight: inner.right, lines, overflow: header.scrollWidth > header.clientWidth, border: styles.borderInlineStartWidth, before: getComputedStyle(header.querySelector(".brand__caption")!, "::before").content };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.subLeft).toBeGreaterThan(geometry.wordRight);
    expect(geometry.subRight).toBeLessThanOrEqual(geometry.innerRight + 1);
    expect(geometry.border).toBe("0px");
    for (const line of geometry.lines) expect(Math.abs(line.height - line.lineHeight)).toBeLessThan(1);
    expect(["none", "normal"]).toContain(geometry.before);
    const menu = page.locator(".menu-toggle");
    if (width <= 1120) {
      await expect(menu).toBeVisible();
      expect(geometry.subRight).toBeLessThanOrEqual(geometry.controlLeft);
      await expect(menu).toHaveAccessibleName("メニュー");
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(".site-nav__contact")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    } else {
      await expect(menu).toBeHidden();
      await expect(page.locator(".site-nav__contact")).toBeVisible();
      const nav = await page.locator(".site-nav").boundingBox();
      expect(nav!.x).toBeGreaterThanOrEqual(geometry.subRight);
      expect(nav!.y).toBeLessThan(geometry.brandBottom);
      expect(nav!.y + nav!.height).toBeGreaterThan(geometry.brandTop);
      expect(nav!.x + nav!.width).toBeLessThanOrEqual(geometry.innerRight + 1);
    }
  }
  expect(errors).toEqual([]);
});

test("real Chromium tab zoom at 200% keeps header and menu readable", async ({}, testInfo) => {
  const extension = testInfo.outputPath("zoom-extension");
  mkdirSync(extension, { recursive: true });
  writeFileSync(`${extension}/manifest.json`, JSON.stringify({ manifest_version: 3, name: "Local zoom verification", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  writeFileSync(`${extension}/background.js`, "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(testInfo.outputPath("zoom-profile"), {
    channel: "chromium", headless: true, viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const page = await context.newPage();
    await serve(page);
    await page.goto(`${ORIGIN}/lessons/`);
    const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, font: getComputedStyle(document.documentElement).fontSize }));
    const zoom = await worker.evaluate(async () => {
      const api = (globalThis as unknown as { chrome: { tabs: { query: (query: { url: string }) => Promise<{ id: number }[]>; setZoom: (id: number, zoom: number) => Promise<void>; getZoom: (id: number) => Promise<number> } } }).chrome;
      const [tab] = await api.tabs.query({ url: "http://pinsel.test/*" });
      await api.tabs.setZoom(tab!.id, 2);
      return api.tabs.getZoom(tab!.id);
    });
    expect(zoom).toBe(2);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(before.width / 2);
    expect(await page.evaluate(() => devicePixelRatio)).toBe(before.dpr * 2);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(before.font);
    await expect(page.locator(".brand__caption")).toHaveText(caption);
    await page.locator(".menu-toggle").click();
    await expect(page.locator(".site-nav__contact")).toBeVisible();
    expect(await page.locator(".site-header").evaluate(header => header.scrollWidth <= header.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("real-zoom-200.png") });
  } finally { await context.close(); }
});

test("capture production header A for visual review", async ({ page }, testInfo) => {
  await serve(page);
  for (const [name, width, route, open] of [
    ["desktop-1440", 1440, "/", false], ["mobile-390", 390, "/", false],
    ["mobile-390-open", 390, "/", true], ["narrow-320", 320, "/", false],
    ["lessons-1440", 1440, "/lessons/", false], ["about-390", 390, "/about/", false],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ORIGIN}${route}`);
    await page.evaluate(() => document.fonts.ready);
    if (open) await page.locator(".menu-toggle").click();
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  }
});

for (const width of [320, 390, 1440]) test(`200% root text enlargement at ${width}px keeps header readable`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await serve(page);
  await page.goto(`${ORIGIN}/lessons/`);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".brand__caption")).toHaveText(caption);
  expect(await page.locator(".site-header").evaluate(header => header.scrollWidth <= header.clientWidth)).toBe(true);
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".site-nav__contact")).toBeVisible();
  expect(await page.locator(".site-header").evaluate(header => header.scrollWidth <= header.clientWidth)).toBe(true);
});

test("zero motion controls supports runtime reduced motion and denied storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Denied", "SecurityError"); } });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await serve(page);
  await page.goto(`${ORIGIN}/`);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await expect(page.locator("html")).toHaveAttribute("data-art-mode", "live");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.locator("html")).toHaveAttribute("data-art-mode", "paused");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await expect(page.locator("html")).toHaveAttribute("data-art-mode", "live");
  expect(errors).toEqual([]);
});
