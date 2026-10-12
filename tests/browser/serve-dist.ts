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

const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg" };

export async function serve(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const file = outputFile(decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(dist) || !statSync(file, { throwIfNoEntry: false })?.isFile()) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: readFileSync(file) });
  });
}
