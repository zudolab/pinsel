import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { readCommittedEntries } from "../../scripts/lib/committed-entries.mjs";
import { committedAmounts, editPrices } from "../../scripts/lib/edit-prices.mjs";

// `wrangler dev --env local` (workerd + local D1 with the committed
// migrations) for the browser lanes, started the way
// scripts/gate1/wrangler-dev-proof.mjs does. The persisted state survives
// `restart()`, which is how a Worker restart is proven.

export const repoRoot = path.resolve(import.meta.dirname, "../..");
export const workerDir = path.join(repoRoot, "apps/authoring-worker");
/** The n-th price an edit lane writes; never a committed price or other committed ¥ amount (scripts/lib/edit-prices.mjs). */
export const editPrice = editPrices(committedAmounts(readCommittedEntries(repoRoot), "course-price"));

const WRANGLER_ENV = { CI: "1", WRANGLER_SEND_METRICS: "false" };

export function runWrangler(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("corepack", ["pnpm", "exec", "wrangler", ...args], { cwd: workerDir, stdio: "inherit", env: { ...process.env, ...WRANGLER_ENV } });
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`wrangler ${args.join(" ")} exited with ${code}`))));
  });
}

export interface LocalWorker {
  readonly origin: string;
  /** Stop and start on the same persisted state; `vars` replaces the `--var` set for the new process. */
  restart(vars?: Readonly<Record<string, string>>): Promise<void>;
  stop(): Promise<void>;
}

export interface LocalWorkerOptions {
  port: number;
  /** Directory name under apps/authoring-worker/.wrangler/; wiped before the first start. */
  stateDir: string;
  vars?: Readonly<Record<string, string>>;
}

/** Fresh state, migrations applied, then `wrangler dev --env local` on 127.0.0.1:<port>. */
export async function startLocalWorker(options: LocalWorkerOptions): Promise<LocalWorker> {
  if (!existsSync(path.join(workerDir, "dist-assets/editor/index.html"))) throw new Error("apps/authoring-worker/dist-assets/editor is missing: run pnpm build:editor && pnpm assets:assemble-worker");
  const persist = path.join(workerDir, ".wrangler", options.stateDir);
  const origin = `http://127.0.0.1:${options.port}`;
  await rm(persist, { recursive: true, force: true });
  await mkdir(persist, { recursive: true });
  await runWrangler(["d1", "migrations", "apply", "pinsel-authoring", "--local", "--env", "local", "--persist-to", persist]);
  let vars = options.vars ?? {};
  let child: ChildProcess | null = null;

  const start = async () => {
    const process_ = spawn("corepack", ["pnpm", "exec", "wrangler", "dev", "--env", "local", ...Object.entries(vars).flatMap(([key, value]) => ["--var", `${key}:${value}`]), "--port", String(options.port), "--ip", "127.0.0.1", "--persist-to", persist, "--log-level", "warn"], { cwd: workerDir, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, ...WRANGLER_ENV } });
    child = process_;
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      if (process_.exitCode !== null) throw new Error("wrangler dev exited early");
      try {
        if ((await fetch(`${origin}/api/v1/site`, { signal: AbortSignal.timeout(2000) })).status < 600) return;
      } catch {
        // not up yet
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await stop();
    throw new Error("wrangler dev did not start within 90s");
  };
  async function stop(): Promise<void> {
    const running = child;
    child = null;
    if (!running || running.exitCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        running.kill("SIGKILL");
        resolve(undefined);
      }, 10_000);
      running.once("exit", () => {
        clearTimeout(timer);
        resolve(undefined);
      });
      running.kill("SIGTERM");
    });
  }

  await start();
  return {
    origin,
    async restart(next) {
      await stop();
      if (next) vars = next;
      await start();
    },
    stop,
  };
}
