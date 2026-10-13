// Screenshot pairs of the built public site (apps/site/dist under `wrangler
// dev`) and the approved prototype (`$SEED/prototype/dist` under
// `python3 -m http.server`) at the confirm-pass widths, with a per-pair
// pixel diff. Writes PNGs and summary.json under --out. Needs `pnpm build:site`.
// Usage: node scripts/site/visual-compare.mjs --reference <prototype/dist> [--site-port 8788] [--ref-port 8000] [--out .reports/visual] [--widths 1440,390] [--pages /,/faq/]
/// <reference lib="dom" />
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
/** @param {string} name @param {string} [fallback] */
const option = (name, fallback) => (argv.includes(name) ? (argv[argv.indexOf(name) + 1] ?? fallback) : fallback);
const reference = option("--reference");
if (!reference) throw new Error("--reference <prototype/dist> is required");
const sitePort = Number(option("--site-port", "8788"));
const refPort = Number(option("--ref-port", "8000"));
const out = path.resolve(repoRoot, option("--out", ".reports/visual") ?? "");

const PAGES = (option("--pages") ?? "/,/lessons/,/results/,/faq/,/notes/free-tuition/,/contact/").split(",");
// 76rem container, 70rem header collapse (1120px), 64rem rail collapse (1024px), 47.99rem mobile (767.84px), narrow phones.
const WIDTHS = (option("--widths") ?? "1440,1280,1130,1110,1100,1030,1020,1000,770,768,767,760,390,360").split(",").map(Number);
// A channel delta above this counts as a differing pixel (absorbs anti-aliasing).
const CHANNEL_TOLERANCE = 32;
// One fixed instant for both sides so the pigment clock paints the same colours.
const FIXED_TIME = new Date("2026-10-13T00:01:30Z");

/** @param {string} command @param {string[]} args @param {string} cwd */
function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  return { child, log: () => log };
}

/** @param {string} origin @param {{ child: import("node:child_process").ChildProcess, log: () => string }} server */
async function waitFor(origin, server) {
  const started = Date.now();
  for (;;) {
    if (server.child.exitCode !== null) throw new Error(`${origin} exited early:\n${server.log()}`);
    if (Date.now() - started > 90_000) throw new Error(`${origin} did not start within 90s:\n${server.log()}`);
    if (await fetch(`${origin}/`, { signal: AbortSignal.timeout(5_000) }).then(() => true, () => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** @param {import("@playwright/test").Page} page @param {string} url */
async function capture(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Walk the page so loading=lazy images fetch, then settle back at the top.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => {
    const images = Array.from(document.images);
    for (const img of images) img.loading = "eager";
    const settled = images.map((img) => (img.complete ? null : new Promise((resolve) => (img.onload = img.onerror = resolve))));
    return Promise.race([Promise.all(settled), new Promise((resolve) => setTimeout(resolve, 10_000))]);
  });
  await page.waitForTimeout(200);
  return page.screenshot({ fullPage: true, animations: "disabled" });
}

/** @param {import("@playwright/test").Page} page @param {Buffer} a @param {Buffer} b */
function diff(page, a, b) {
  return page.evaluate(
    async (/** @type {[string, string, number]} */ [left, right, tolerance]) => {
      const load = async (/** @type {string} */ data) => createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const [x, y] = [await load(left), await load(right)];
      const width = Math.max(x.width, y.width);
      const height = Math.max(x.height, y.height);
      const read = (/** @type {ImageBitmap} */ image) => {
        const canvas = new OffscreenCanvas(width, height);
        const context = /** @type {OffscreenCanvasRenderingContext2D} */ (canvas.getContext("2d"));
        context.fillStyle = "#ff00ff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height).data;
      };
      const [p, q] = [read(x), read(y)];
      const canvas = new OffscreenCanvas(width, height);
      const context = /** @type {OffscreenCanvasRenderingContext2D} */ (canvas.getContext("2d"));
      const output = context.createImageData(width, height);
      let differing = 0;
      for (let i = 0; i < p.length; i += 4) {
        const [r, g, b, s, t, u] = /** @type {[number, number, number, number, number, number]} */ ([p[i], p[i + 1], p[i + 2], q[i], q[i + 1], q[i + 2]]);
        const delta = Math.max(Math.abs(r - s), Math.abs(g - t), Math.abs(b - u));
        const grey = (r + g + b) / 3;
        if (delta > tolerance) {
          differing += 1;
          output.data.set([230, 30, 40, 255], i);
        } else output.data.set([grey, grey, grey, 70], i);
      }
      context.putImageData(output, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { siteHeight: x.height, refHeight: y.height, ratio: differing / (width * height), png: btoa(binary) };
    },
    /** @type {[string, string, number]} */ ([a.toString("base64"), b.toString("base64"), CHANNEL_TOLERANCE]),
  );
}

const site = start("corepack", ["pnpm", "exec", "wrangler", "dev", "--config", "../site/wrangler.jsonc", "--port", String(sitePort), "--ip", "127.0.0.1", "--log-level", "warn"], path.join(repoRoot, "apps/authoring-worker"));
const ref = start("python3", ["-m", "http.server", String(refPort), "--bind", "127.0.0.1", "--directory", path.resolve(reference)], repoRoot);
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const refOrigin = `http://127.0.0.1:${refPort}`;
const browser = await chromium.launch();
/** @type {{ page: string, width: number, siteHeight: number, refHeight: number, ratio: number, files: string[] }[]} */
const results = [];
try {
  await Promise.all([waitFor(siteOrigin, site), waitFor(refOrigin, ref)]);
  const tool = await browser.newPage();
  for (const route of PAGES) {
    const slug = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");
    await mkdir(path.join(out, slug), { recursive: true });
    for (const width of WIDTHS) {
      /** @type {Buffer[]} */
      const shots = [];
      for (const origin of [siteOrigin, refOrigin]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.clock.setFixedTime(FIXED_TIME);
        shots.push(await capture(page, `${origin}${route}`));
        await context.close();
      }
      const [siteShot, refShot] = /** @type {[Buffer, Buffer]} */ (shots);
      const result = await diff(tool, siteShot, refShot);
      const [siteFile, refFile, diffFile] = /** @type {[string, string, string]} */ (["site", "ref", "diff"].map((kind) => path.join(out, slug, `${width}-${kind}.png`)));
      await writeFile(siteFile, siteShot);
      await writeFile(refFile, refShot);
      await writeFile(diffFile, Buffer.from(result.png, "base64"));
      const row = { page: route, width, siteHeight: result.siteHeight, refHeight: result.refHeight, ratio: Number(result.ratio.toFixed(5)), files: [siteFile, refFile, diffFile].map((file) => path.relative(repoRoot, file)) };
      results.push(row);
      console.log(`${route.padEnd(22)} ${String(width).padStart(4)}px  diff ${(row.ratio * 100).toFixed(3).padStart(7)}%  height site ${row.siteHeight} / ref ${row.refHeight}`);
    }
  }
} finally {
  await browser.close();
  for (const server of [site, ref]) server.child.kill("SIGTERM");
  await Promise.all([site, ref].map((server) => (server.child.exitCode !== null ? null : new Promise((resolve) => server.child.once("exit", resolve)))));
}
await writeFile(path.join(out, "summary.json"), `${JSON.stringify({ channelTolerance: CHANNEL_TOLERANCE, fixedTime: FIXED_TIME.toISOString(), results }, null, 2)}\n`);
console.log(`visual-compare: ${results.length} pairs; summary ${path.relative(repoRoot, path.join(out, "summary.json"))}`);
