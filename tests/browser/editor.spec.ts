import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { repoRoot, startLocalWorker, type LocalWorker } from "./local-worker";

// #12 editor against `wrangler dev --env local` (tests/browser/local-worker.ts).
// Prerequisites: `pnpm content:assemble && pnpm build:editor &&
// pnpm assets:assemble-worker`. Run through heavy-guard: `pnpm test:browser`.
// PINSEL_EDITOR_SCREENSHOTS=1 also writes the docs/editing.md screenshots.

const port = Number(process.env.PINSEL_EDITOR_E2E_PORT ?? 8791);
const origin = `http://127.0.0.1:${port}`;
const screenshots = process.env.PINSEL_EDITOR_SCREENSHOTS === "1" ? path.join(repoRoot, "docs/images") : null;
const PRICE = "#content-entry-course-price";

let worker: LocalWorker | null = null;

async function shot(page: Page, name: string): Promise<void> {
  if (screenshots) await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: false });
}

async function openEditor(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.goto("/editor/");
  await expect(page.getByTestId("save-status")).toHaveText(/保存済み/, { timeout: 30_000 });
  return page;
}

async function openTwoMonthCourse(page: Page): Promise<void> {
  await page.getByRole("button", { name: "コースと料金" }).click();
  await page.locator(".sg-content-model-card", { hasText: "コース・料金" }).click();
  await page.getByText("2ヶ月コース", { exact: false }).first().click();
  await expect(page.locator(PRICE)).toBeVisible();
}

async function setPrice(page: Page, value: string): Promise<void> {
  await page.locator(PRICE).fill(value);
  await page.locator(PRICE).blur();
  // The editor autosaves; flush() resolves on the durable receipt (or rejects, e.g. on a conflict).
  await page.evaluate(() => (window as unknown as { __pinselEditor: { flush(): Promise<void> } }).__pinselEditor.flush()).catch(() => undefined);
}

test.describe.configure({ mode: "serial", timeout: 90_000 });

test.beforeAll(async () => {
  test.setTimeout(180_000);
  if (screenshots) await mkdir(screenshots, { recursive: true });
  worker = await startLocalWorker({ port, stateDir: "editor-e2e-state", vars: { PUBLISHER_PROVIDER: "fake" } });
});

test.afterAll(async () => {
  await worker?.stop();
});

test("a saved price persists into a new browser context", async ({ browser }) => {
  const page = await openEditor(browser);
  await shot(page, "editor-overview");
  await openTwoMonthCourse(page);
  await setPrice(page, "¥55,000");
  await expect(page.getByTestId("save-status")).toHaveText("保存済み（改訂 2）", { timeout: 30_000 });
  await shot(page, "editor-saved");
  await page.context().close();

  const second = await openEditor(browser);
  await openTwoMonthCourse(second);
  await expect(second.locator(PRICE)).toHaveValue("¥55,000");
  await second.context().close();
});

test("the preview shows the saved revision", async ({ browser }) => {
  const page = await openEditor(browser);
  await openTwoMonthCourse(page);
  await page.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(page.getByTestId("preview-status")).toHaveText("表示中: 改訂 2", { timeout: 30_000 });
  const frame = page.frameLocator(".sg-hosted-content-editor__frame");
  await expect(frame.locator("article.pricing-card .price").nth(1)).toHaveText(/¥55,000/);
  await expect(page.locator(".sg-hosted-content-editor__frame")).toHaveAttribute("sandbox", "allow-same-origin allow-scripts");
  await shot(page, "editor-preview");
  await page.context().close();
});

test("a second context that saved first produces a conflict", async ({ browser }) => {
  const first = await openEditor(browser);
  await openTwoMonthCourse(first);
  const second = await openEditor(browser);
  await openTwoMonthCourse(second);
  await setPrice(second, "¥56,000");
  await expect(second.getByTestId("save-status")).toHaveText("保存済み（改訂 3）", { timeout: 30_000 });

  await setPrice(first, "¥57,000");
  await expect(first.getByTestId("save-status")).toHaveText("競合", { timeout: 30_000 });
  await expect(first.getByTestId("conflict-panel")).toBeVisible();
  await expect(first.getByRole("button", { name: "自分の変更を再適用" })).toBeVisible();
  await shot(first, "editor-conflict");
  await first.context().close();
  await second.context().close();
});

test("a publish request shows 公開申請済み and then the provider's state", async ({ browser }) => {

  const page = await openEditor(browser);
  await openTwoMonthCourse(page);
  await page.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(page.getByTestId("preview-status")).toHaveText(/^表示中: 改訂 \d+$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "公開を申請" }).click();
  const dialog = page.getByRole("dialog", { name: "公開を申請しますか？" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("publish-snapshot")).toHaveText(/^[0-9a-f]{64}$/);
  await shot(page, "editor-publish-confirm");
  await dialog.getByRole("button", { name: "この内容で申請する" }).click();
  const status = page.getByTestId("publication-status");
  await expect(status).toHaveAttribute("data-publication-state", /^(submitted|building|validated|integrated|failed|conflict|configuration-required)$/, { timeout: 30_000 });
  await expect(status).not.toHaveText(/公開中/);
  await status.getByRole("button", { name: "状況を更新" }).click();
  await expect(status).toHaveText(/公開状況: (公開申請済み|ビルド中|検証済み|反映済み|失敗|公開内容の競合|設定が必要)/);
  await shot(page, "editor-publication");
  await page.context().close();
});
