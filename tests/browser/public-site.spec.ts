import { createRequire } from "node:module";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ORIGIN, OUTPUT_ROUTES, serve, serveRoot } from "./serve-dist";

// zudolab/pinsel#17: the public-site confirm pass on the built routes — no-JS
// copy parity, keyboard and fragments, motion, contact, robustness and
// accessibility. axe-core is the pinned root devDependency. Optional input:
//   PINSEL_REFERENCE_DIST  the approved prototype's dist ($SEED/prototype/dist);
//                          without it the copy-parity checks skip and the zoom checks
//                          fall back to PROTOTYPE_OVERFLOW, measured from that reference.

const REFERENCE = process.env.PINSEL_REFERENCE_DIST;
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const REF_ORIGIN = "http://reference.test";
const WIDTHS = [1440, 1280, 1130, 1110, 1030, 1020, 770, 768, 767, 760, 390, 360];
const SIX = ["/", "/lessons/", "/results/", "/faq/", "/notes/free-tuition/", "/contact/"];

async function serveReference(page: Page): Promise<void> {
  await serveRoot(page, REF_ORIGIN, path.resolve(REFERENCE!));
}

const mainText = (page: Page) => page.locator("main#main").evaluate((main) => (main as HTMLElement).innerText.replace(/\s+/g, " ").trim());

async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const route of OUTPUT_ROUTES) {
    test(`${route} shows the same visible copy as the approved prototype`, async ({ page }) => {
      test.skip(!REFERENCE, "PINSEL_REFERENCE_DIST is not set");
      await serve(page);
      await serveReference(page);
      await page.goto(`${ORIGIN}${route}`);
      const site = await mainText(page);
      const footer = await page.locator("footer.site-footer").innerText();
      await page.goto(`${REF_ORIGIN}${route}`);
      expect(site).toBe(await mainText(page));
      expect(footer).toBe(await page.locator("footer.site-footer").innerText());
    });
  }
});

test.describe("keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the skip link comes first, is visible on focus and moves focus to main", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/lessons/`);
    await page.keyboard.press("Tab");
    const skip = page.locator("a.skip-link");
    await expect(skip).toBeFocused();
    const box = await skip.boundingBox();
    expect(box && box.y >= 0 && box.width > 0).toBeTruthy();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("tab order walks brand, header nav and motion toggle before main, each with a visible focus ring", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/`);
    const order: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const style = getComputedStyle(element);
        const ring = parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== "none";
        return { label: element.getAttribute("href") ?? element.className, ring, inMain: !!element.closest("main") };
      });
      expect(info.ring, `focus ring on ${info.label}`).toBe(true);
      order.push(info.inMain ? `main:${info.label}` : info.label);
    }
    expect(order.slice(0, 10)).toEqual(["#main", "/", "/lessons/", "/about/", "/results/", "/voices/", "/notes/", "/faq/", "/contact/", "motion-toggle"]);
    expect(order[10]).toMatch(/^main:/);
  });

  test("the brand and the motion toggle are named by their visible text (WCAG 2.5.3)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await serve(page);
    await page.goto(`${ORIGIN}/`);
    await expect(page.locator("a.brand")).toHaveCount(2);
    for (const brand of await page.locator("a.brand").all()) await expect(brand).toHaveAccessibleName("Pinsel ART STUDY IN GERMANY");
    const toggle = page.locator("[data-motion-toggle]");
    await expect(toggle).toHaveAccessibleDescription("装飾の動きと色の変化");
    for (let i = 0; i < 2; i++) {
      const visible = (await toggle.locator("[data-motion-label]").innerText()).trim();
      expect(visible).toMatch(/^動き (ON|OFF)$/);
      await expect(toggle).toHaveAccessibleName(visible);
      await toggle.click();
      await expect(toggle.locator("[data-motion-label]")).not.toHaveText(visible);
    }
  });

  test("the mobile menu opens from the keyboard; Escape closes it and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await serve(page);
    await page.goto(`${ORIGIN}/`);
    const toggle = page.locator(".menu-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(page.locator("#site-navigation a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(page.locator("#site-navigation")).not.toBeInViewport();
  });

  test("FAQ disclosures toggle with Enter and Space", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const details = page.locator("details#category-1-2");
    await expect(details).not.toHaveAttribute("open");
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open");
  });

  for (const target of ["/faq/#faq-3", "/results/#year-2019年度", "/lessons/#graduates", "/notes/free-tuition/#section-4"]) {
    test(`direct ${target} lands below the sticky header; in-page navigation moves focus`, async ({ page }) => {
      await serve(page);
      await page.goto(`${ORIGIN}${encodeURI(target)}`);
      const id = target.split("#")[1]!;
      const placement = () =>
        page.evaluate((key) => {
          const header = document.querySelector(".site-header")!.getBoundingClientRect().bottom;
          return { header, top: document.getElementById(key)!.getBoundingClientRect().top };
        }, id);
      await expect.poll(async () => { const { header, top } = await placement(); return top >= header - 1 && top <= header + 64; }).toBe(true);
      await scrollToY(page, 0);
      await page.evaluate(() => (location.hash = ""));
      await page.evaluate((key) => (location.hash = key), id);
      await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe(id);
      const { header, top } = await placement();
      expect(top).toBeGreaterThanOrEqual(header - 1);
    });
  }

  test("the TOC entry stays current after expanding an FAQ", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const current = page.locator('.page-toc a[aria-current="location"]');
    const top = await page.evaluate(() => document.getElementById("faq-2")!.getBoundingClientRect().top + scrollY);
    await scrollToY(page, top - 100);
    await expect(current).toHaveAttribute("href", "#faq-2");
    // Opening every disclosure in faq-1 above the line pushes faq-2 below it; the TOC must follow the reflow.
    await page.evaluate(() => {
      const y = scrollY;
      for (const details of document.querySelectorAll<HTMLDetailsElement>("#faq-1 details")) details.open = true;
      window.scrollTo({ top: y, behavior: "instant" });
    });
    const expected = await page.evaluate(() => {
      const line = document.querySelector(".site-header")!.getBoundingClientRect().bottom + 26;
      return document.getElementById("faq-2")!.getBoundingClientRect().top <= line ? "#faq-2" : "#faq-1";
    });
    await expect(current).toHaveAttribute("href", expected);
    await expect(current).toHaveCount(1);
  });
});

test.describe("motion", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("toggle OFF removes smooth scrolling; reduced motion does too", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    const behavior = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    await expect.poll(behavior).toBe("smooth");
    await page.locator("[data-motion-toggle]").click();
    await expect.poll(behavior).toBe("auto");
    await page.evaluate(() => localStorage.clear());
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect.poll(behavior).toBe("auto");
    await expect(page.locator("[data-motion-toggle]")).toBeDisabled();
  });

  test("a hidden document suspends the pigment clock and resumes on return", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install({ time: new Date("2026-10-13T00:01:30Z") });
    await serve(page);
    await page.goto(`${ORIGIN}/`);
    const phase = () => page.evaluate(() => document.documentElement.dataset.artPhase);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const hidden = await phase();
    await page.clock.runFor(5000);
    expect(await phase()).toBe(hidden);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.runFor(2000);
    expect(await phase()).not.toBe(hidden);
  });

  test("two tabs share the absolute-time phase", async ({ context }) => {
    await context.clock.install({ time: new Date("2026-10-13T00:01:30Z") });
    const [a, b] = [await context.newPage(), await context.newPage()];
    for (const page of [a, b]) {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await serve(page);
    }
    await a.goto(`${ORIGIN}/`);
    await b.goto(`${ORIGIN}/faq/`);
    await context.clock.runFor(3000);
    const read = (page: Page) => page.evaluate(() => [document.documentElement.dataset.artPhase, document.documentElement.style.getPropertyValue("--art-back")]);
    expect(await read(a)).toEqual(await read(b));
  });
});

test.describe("contact", () => {
  for (const [query, expected] of [["1", "有料進路相談"], ["2", "2ヶ月コース"], ["3", "4ヶ月コース"], ["0", "未定"], ["9", "未定"]] as const) {
    test(`?course=${query} selects ${expected}`, async ({ page }) => {
      await serve(page);
      await page.goto(`${ORIGIN}/contact/?course=${query}`);
      await expect(page.locator("#course")).toHaveValue(expected);
    });
  }

  test("labels, required marks and truthful notices", async ({ page }) => {
    await serve(page);
    await page.goto(`${ORIGIN}/contact/`);
    for (const id of ["name", "email", "course", "message"]) await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    for (const id of ["name", "email", "message"]) await expect(page.locator(`#${id}`)).toHaveAttribute("required", "");
    await expect(page.locator("#contact-form .prototype-message")).toHaveText("デザイン確認用のプレビューです。入力内容は送信されません。");
    await expect(page.locator(".form-success .prototype-message")).toHaveText("プレビューのため、実際のお問い合わせは送信されていません。");
    await expect(page.locator("#contact-form")).not.toHaveAttribute("action");
  });
});

// Overflow the approved prototype measured with PINSEL_REFERENCE_DIST set, used when the reference is not served (CI).
// /contact/ at 390px with 150% text overflows 8px in the prototype too (tracked in #26).
const PROTOTYPE_OVERFLOW: Record<string, number> = { "150% text, narrow /contact/": 8 };

test.describe("robustness", () => {
  for (const width of WIDTHS) {
    test(`no horizontal scroll on any route at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await serve(page);
      for (const route of OUTPUT_ROUTES) {
        await page.goto(`${ORIGIN}${route}`);
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
        expect(scroll, `${route} at ${width}px`).toBeLessThanOrEqual(inner);
      }
    });
  }

  // 200% browser zoom on a 1440px window is a 720px layout viewport; text-only enlargement raises the root font size.
  // An overflow the approved prototype has to the same extent is inherited, logged, and not a regression.
  for (const { name, width, rootFont } of [{ name: "200% zoom", width: 720, rootFont: null }, { name: "150% text", width: 1440, rootFont: "150%" }, { name: "150% text, narrow", width: 390, rootFont: "150%" }]) {
    test(`${name}: no clipped text and no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await serve(page);
      if (REFERENCE) await serveReference(page);
      const inspect = async (url: string) => {
        await page.goto(url);
        if (rootFont) await page.addStyleTag({ content: `html{font-size:${rootFont}}` });
        await page.evaluate(() => document.fonts.ready);
        return page.evaluate(() => {
          const clipped: string[] = [];
          for (const element of document.querySelectorAll<HTMLElement>("body *")) {
            if (element.closest("svg, .art-window, .skip-link, [hidden], .page-toc, aside, .site-nav")) continue;
            const style = getComputedStyle(element);
            const clips = ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY);
            if (!clips || !element.innerText?.trim() || style.display === "none") continue;
            if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) clipped.push(`${element.tagName.toLowerCase()}.${element.className}`);
          }
          return { overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), clipped };
        });
      };
      for (const route of SIX) {
        const site = await inspect(`${ORIGIN}${route}`);
        expect(site.clipped, route).toEqual([]);
        if (site.overflow === 0) continue;
        const reference = REFERENCE ? await inspect(`${REF_ORIGIN}${route}`) : { overflow: PROTOTYPE_OVERFLOW[`${name} ${route}`] ?? 0 };
        console.log(`overflow ${name} ${route}: site ${site.overflow}px, prototype ${reference.overflow}px`);
        expect(site.overflow, `${route} overflows by ${site.overflow}px (prototype ${reference.overflow}px)`).toBeLessThanOrEqual(reference.overflow);
      }
    });
  }

  test("text colours meet WCAG AA against their backgrounds", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await serve(page);
    await page.goto(`${ORIGIN}/faq/`);
    await page.locator('.page-toc a[href="#faq-1"]').waitFor();
    const ratios = await page.evaluate(() => {
      const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => [r, g, b].map((c) => { const s = c! / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
      const ratio = (a: string, b: string) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m); return (x! + 0.05) / (y! + 0.05); };
      const bgOf = (element: Element): string => { for (let node: Element | null = element; node; node = node.parentElement) { const bg = getComputedStyle(node).backgroundColor; if (!/rgba\(.*,\s*0\)|transparent/.test(bg)) return bg; } return "rgb(255,255,255)"; };
      const pair = (selector: string, prop: "color" | "outlineColor" = "color") => { const element = document.querySelector(selector)!; return ratio(getComputedStyle(element)[prop], bgOf(element.parentElement ?? element)); };
      const css = getComputedStyle(document.documentElement);
      const token = (name: string) => { const probe = document.createElement("i"); probe.style.color = css.getPropertyValue(name); document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; };
      const bg = token("--color-bg");
      return {
        body: pair("main p"),
        muted: ratio(token("--color-muted"), bg),
        mutedOnSurface: ratio(token("--color-muted"), token("--color-surface")),
        action: ratio(token("--color-action"), bg),
        tocActive: ratio(getComputedStyle(document.querySelector('.page-toc a[aria-current="location"]')!).color, getComputedStyle(document.querySelector('.page-toc a[aria-current="location"]')!).backgroundColor),
        focusRing: ratio(token("--color-action"), bg),
      };
    });
    for (const [name, value] of Object.entries(ratios)) expect(value, name).toBeGreaterThanOrEqual(name === "focusRing" ? 3 : 4.5);
    console.log(`contrast ${JSON.stringify(Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, Number(v.toFixed(2))])))}`);
  });

  for (const route of SIX) {
    test(`axe-core finds no serious or critical violation on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await serve(page);
      await page.goto(`${ORIGIN}${route}`);
      await page.addScriptTag({ path: AXE });
      expect(await page.evaluate(() => (window as unknown as { axe: { version: string } }).axe.version)).toBe("4.14.0");
      const violations = await page.evaluate(async () => {
        const result = await (window as unknown as { axe: { run: (context: Document) => Promise<{ violations: { id: string; impact: string; nodes: unknown[] }[] }> } }).axe.run(document);
        return result.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length }));
      });
      console.log(`axe ${route} ${JSON.stringify(violations)}`);
      expect(violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
    });
  }
});
