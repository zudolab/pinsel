import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// Serves the built public site (apps/site/dist) on a fake origin through
// page.route, with the static-asset Worker's directory-index lookup.
export const dist = path.resolve(import.meta.dirname, "../../apps/site/dist");
export const ORIGIN = "http://pinsel.test";

/** The 14 outputs and their files, in page-manifest order. */
export const OUTPUT_ROUTES = [
  "/",
  "/lessons/",
  "/about/",
  "/results/",
  "/voices/",
  "/faq/",
  "/notes/",
  "/notes/exam-schedule/",
  "/notes/free-tuition/",
  "/notes/german-language/",
  "/notes/online-exam/",
  "/notes/what-is-mappe/",
  "/contact/",
  "/404.html",
] as const;

export function outputFile(route: string): string {
  return path.join(dist, route.endsWith("/") ? `${route}index.html` : route);
}

const TYPES: Record<string, string> = { ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".wasm": "application/wasm", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg" };

export async function serve(page: Page): Promise<void> {
  await serveRoot(page, ORIGIN, dist);
}

/** Serves any built static directory on `origin` with the same directory-index lookup. */
export async function serveRoot(page: Page, origin: string, root: string): Promise<void> {
  await page.route(`${origin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!file.startsWith(root + path.sep) || !statSync(file, { throwIfNoEntry: false })?.isFile()) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: readFileSync(file) });
  });
}
