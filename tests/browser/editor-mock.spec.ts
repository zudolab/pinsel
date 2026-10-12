import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

// The #12 publish request flow against the editor's dev mock
// (apps/editor/dev/mock-api.ts: Composer memory storage + a fake publisher
// that advances one state per status read). The same flow runs against
// `wrangler dev` in editor.spec.ts once the Worker serves /api/v1/publications.
// Prerequisite: `pnpm content:assemble`.

const repoRoot = path.resolve(import.meta.dirname, "../..");
const editor = path.join(repoRoot, "apps/editor");
const port = Number(process.env.PINSEL_EDITOR_MOCK_PORT ?? 5198);
const origin = `http://127.0.0.1:${port}`;
const screenshots = process.env.PINSEL_EDITOR_SCREENSHOTS === "1" ? path.join(repoRoot, "docs/images") : null;

let vite: ChildProcess | null = null;

test.describe.configure({ mode: "serial", timeout: 90_000 });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  if (screenshots) await mkdir(screenshots, { recursive: true });
  vite = spawn("corepack", ["pnpm", "exec", "vite", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: editor, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, CI: "1" } });
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    if (vite.exitCode !== null) throw new Error("vite exited early");
    try {
      if ((await fetch(`${origin}/api/v1/site`, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("vite did not start within 60s");
});

test.afterAll(() => {
  vite?.kill("SIGTERM");
});

test("publish request: confirmation, 公開申請済み, then the fake provider's states, never 公開中", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${origin}/editor/`);
  await expect(page.getByTestId("save-status")).toHaveText(/保存済み/, { timeout: 30_000 });
  await page.getByRole("button", { name: "コースと料金" }).click();
  await page.getByRole("button", { name: "保存済みの下書きをプレビュー" }).click();
  await expect(page.getByTestId("preview-status")).toHaveText(/^表示中: 改訂 \d+$/, { timeout: 30_000 });

  await page.getByRole("button", { name: "公開を申請" }).click();
  const dialog = page.getByRole("dialog", { name: "公開を申請しますか？" });
  await expect(dialog.getByTestId("publish-snapshot")).toHaveText(/^[0-9a-f]{64}$/);
  await expect(dialog.getByTestId("publish-revision")).toHaveText(/^改訂 \d+$/);
  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(page.getByText("公開申請を取り消しました（何も送信していません）。")).toBeVisible();
  await expect(page.getByTestId("publication-status")).toHaveAttribute("data-publication-state", "none");

  await page.getByRole("button", { name: "公開を申請" }).click();
  if (screenshots) await page.screenshot({ path: path.join(screenshots, "editor-publish-confirm.png") });
  await page.getByRole("button", { name: "この内容で申請する" }).click();
  const status = page.getByTestId("publication-status");
  await expect(status).toHaveAttribute("data-publication-state", "submitted");
  await expect(status).toContainText("公開状況: 公開申請済み");
  // The host also polls every 5 s, so a step may be observed by the poll instead of the click.
  const order = ["submitted", "building", "validated", "integrated"];
  const labels: Record<string, string> = { submitted: "公開申請済み", building: "ビルド中", validated: "検証済み", integrated: "反映済み" };
  const seen = ["submitted"];
  while (seen.at(-1) !== "integrated") {
    await status.getByRole("button", { name: "状況を更新" }).click();
    await expect.poll(async () => order.indexOf((await status.getAttribute("data-publication-state")) ?? "")).toBeGreaterThan(order.indexOf(seen.at(-1)!));
    const state = (await status.getAttribute("data-publication-state"))!;
    await expect(status).toContainText(`公開状況: ${labels[state]}`);
    seen.push(state);
  }
  expect(seen[0]).toBe("submitted");
  await expect(status).not.toContainText("公開中");
  if (screenshots) await page.screenshot({ path: path.join(screenshots, "editor-publication.png") });
});

test("structural URLs show 利用できません", async ({ page }) => {
  await page.goto(`${origin}/editor/#/composer`);
  await expect(page.getByRole("alert")).toHaveText(/利用できません/);
  expect((await fetch(`${origin}/composer`)).status).toBe(403);
});
