import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

/** @param {unknown} text */
export function sanitize(text) {
  return String(text).replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, "[private key omitted]")
    .replace(/[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]*/g, "[JWT omitted]")
    .replace(/Cf-Access-Jwt-Assertion:\s*[^\s'"\\]+/gi, "Cf-Access-Jwt-Assertion: [omitted]");
}

export async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve(undefined)); });
  const port = /** @type {import("node:net").AddressInfo} */ (server.address()).port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

// Only toolchain paths/caches are inherited. No provider credentials, Git hooks,
// baseline overrides, NODE_OPTIONS or caller .dev.vars enter these probes.
/** @param {NodeJS.ProcessEnv} extra */
export function localEnv(extra = {}) {
  const names = ["PATH", "HOME", "TMPDIR", "SystemRoot", "COREPACK_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "npm_config_cache", "PNPM_HOME"];
  return { ...Object.fromEntries(names.filter((key) => process.env[key]).map((key) => [key, process.env[key]])), CI: "1", WRANGLER_SEND_METRICS: "false", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", CLOUDFLARE_INCLUDE_PROCESS_ENV: "false", ...extra };
}

/**
 * @typedef {{cwd?: string, env?: NodeJS.ProcessEnv, timeout?: number, rejects?: RegExp}} RunOptions
 * @typedef {Awaited<ReturnType<typeof createHarness>>} Harness
 * @param {string} name
 * @param {string} reportPath
 */
export async function createHarness(name, reportPath) {
  if (process.platform === "win32") throw new Error("Local verification requires a POSIX process-group runtime (Linux/macOS/WSL).");
  const work = await mkdtemp(path.join(tmpdir(), `pinsel-${name}-`));
  const controller = new AbortController();
  /** @type {Set<() => Promise<void>>} */
  const children = new Set();
  /** @type {Array<() => Promise<void>>} */
  const cleanups = [];
  /** @type {{scope: string, commands: Array<{command: string, exit: number | null, expectedFailure?: boolean}>, results: Array<{probe: string, ok: boolean, command?: string, expected?: string, actual?: string}>, cleanup: Record<string, boolean | string>, [key: string]: any}} */
  const report = { scope: "loopback/local bindings only; no deployment, live publication or inquiry", commands: [], results: [], cleanup: {} };
  const interrupted = () => controller.abort(new Error("Verification interrupted"));
  process.on("SIGINT", interrupted);
  process.on("SIGTERM", interrupted);
  function checkSignal() { controller.signal.throwIfAborted(); }

  /** @param {string} command @param {string[]} args @param {RunOptions} options */
  function start(command, args, { cwd, env = {}, timeout = 120_000 } = {}) {
    checkSignal();
    const child = spawn(command, args, { cwd, env: localEnv(env), detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    /** @type {Error | undefined} */
    let error;
    let finished = false;
    /** @type {Promise<number | null>} */
    const completed = new Promise((resolve) => {
      child.once("error", (reason) => { error = reason; finished = true; resolve(null); });
      child.once("exit", (code) => { finished = true; resolve(code); });
    });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output = (output + sanitize(chunk)).slice(-(16 << 20)); });
    const kill = (/** @type {NodeJS.Signals} */ signal) => {
      if (!child.pid) return;
      try { process.kill(-child.pid, signal); } catch (reason) { if (/** @type {NodeJS.ErrnoException} */ (reason).code !== "ESRCH") throw reason; }
    };
    /** @type {Promise<void> | undefined} */
    let stopping;
    const stop = () => stopping ??= (async () => {
      kill("SIGTERM");
      await Promise.race([completed, delay(2000)]);
      // The launcher can exit before its workerd/esbuild descendants.
      kill("SIGKILL");
      await Promise.race([completed, delay(2000)]);
      clearTimeout(timer);
      children.delete(stop);
    })();
    children.add(stop);
    const timer = setTimeout(() => { error = new Error(`Command timeout (${timeout}ms)`); void stop(); }, timeout);
    const onAbort = () => { error = controller.signal.reason; void stop(); };
    controller.signal.addEventListener("abort", onAbort, { once: true });
    const result = async () => {
      const code = await completed;
      await stop();
      controller.signal.removeEventListener("abort", onAbort);
      return { code, output, error };
    };
    return { child, stop, result, get finished() { return finished; }, get output() { return output; } };
  }

  /** @param {string} command @param {string[]} args @param {RunOptions} options */
  async function run(command, args, options = {}) {
    const label = sanitize([command, ...args].join(" ")).replaceAll(work, "<run>");
    const result = await start(command, args, options).result();
    report.commands.push({ command: label, exit: result.code, expectedFailure: Boolean(options.rejects) });
    checkSignal();
    if (result.error || (options.rejects ? result.code === 0 || !options.rejects.test(result.output) : result.code !== 0)) {
      throw new Error(`${label}: ${result.error?.message ?? `exit ${result.code}`}\n${result.output.slice(-8000)}`);
    }
    console.log(`${options.rejects ? "EXPECTED REFUSAL" : "PASS"} ${label}`);
    return result.output.trim();
  }

  /** @param {string} url @param {RequestInit} options @param {number} timeout */
  async function request(url, options = {}, timeout = 10_000) {
    const parsed = new URL(url);
    if (parsed.hostname !== "127.0.0.1") throw new Error("Probes must use loopback endpoints");
    checkSignal();
    const response = await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]) });
    return { status: response.status, body: await response.text() };
  }

  /** @param {unknown} error */
  async function finish(error) {
    if (error) report.error = sanitize(String(error)).replaceAll(work, "<run>");
    for (const stop of [...children]) await stop();
    report.cleanup.processGroupsStopped = children.size === 0;
    for (const cleanup of cleanups.reverse()) {
      try { await cleanup(); } catch (reason) { report.cleanup.error = sanitize(String(reason)); }
    }
    await rm(work, { recursive: true, force: true });
    report.cleanup.runDirectoryRemoved = true;
    process.removeListener("SIGINT", interrupted);
    process.removeListener("SIGTERM", interrupted);
    report.ok = !error && !report.cleanup.error && report.results.every((entry) => entry.ok);
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`${name}: ${report.ok ? "PASS" : "FAIL"}; sanitized report ${reportPath}`);
    if (!report.ok) process.exitCode = 1;
  }
  return { work, report, run, start, request, finish, cleanups, checkSignal, signal: controller.signal };
}

/** @param {string} root */
export async function prerequisites(root) {
  for (const file of ["node_modules/.bin/tsx", "apps/authoring-worker/node_modules/.bin/wrangler", "apps/authoring-worker/dist-assets/editor/index.html", "packages/pinsel-content/.site-project/baseline.json"]) {
    await access(path.join(root, file)).catch(() => { throw new Error(`Missing ${file}. Run pnpm install --frozen-lockfile, pnpm content:assemble, pnpm build:editor and pnpm assets:assemble-worker first.`); });
  }
}

/** @param {string} root @param {string} directory @param {{fixture?: boolean, vars?: Record<string, string>}} options */
export async function workerConfig(root, directory, { fixture = false, vars = {} } = {}) {
  const worker = path.join(root, "apps/authoring-worker");
  const text = await readFile(path.join(worker, "wrangler.jsonc"), "utf8");
  const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
  if (/"remote"\s*:\s*true/.test(text)) throw new Error("Remote bindings are forbidden in local verification");
  if (config.main !== "./src/index.ts" || config.env.local.main !== "./src/local-dev.ts") throw new Error("Unexpected Worker entry configuration");
  if (config.d1_databases.length !== 1 || config.d1_databases[0].binding !== "DB") throw new Error("Unexpected D1 binding configuration");
  const selected = fixture ? config.env.local : config;
  const file = path.join(directory, "wrangler.json");
  await mkdir(directory, { recursive: true });
  await writeFile(file, JSON.stringify({
    name: "pinsel-local-verification", main: path.join(worker, selected.main), compatibility_date: config.compatibility_date,
    compatibility_flags: config.compatibility_flags ?? [], workers_dev: false, preview_urls: false,
    assets: { ...config.assets, directory: path.join(worker, config.assets.directory) },
    d1_databases: [{ binding: "DB", database_name: "pinsel-authoring", database_id: "00000000-0000-4000-8000-000000000000", migrations_dir: path.join(worker, "migrations"), remote: false }],
    vars: { TEAM_DOMAIN: "", POLICY_AUD: "", EDITOR_ALLOWLIST: "", ...(fixture ? { LOCAL_DEV_SUBJECT: "local-dev@example.test" } : {}), ...vars, PUBLISHER_PROVIDER: "disabled", PROMOTION_POLICY: "manual" },
  }));
  return file;
}

/** @param {Harness} harness @param {string} root @param {string} config @param {string} persist @param {{port?: number, caFile?: string, failStartup?: boolean}} options */
export async function startWorker(harness, root, config, persist, { port, caFile, failStartup = false } = {}) {
  const worker = path.join(root, "apps/authoring-worker");
  const wrangler = path.join(worker, "node_modules/wrangler/bin/wrangler.js");
  const origin = `http://127.0.0.1:${port ?? await freePort()}`;
  const inspector = await freePort();
  const args = [wrangler, "dev", "--config", config, "--local", "--ip", "127.0.0.1", "--port", new URL(origin).port, "--inspector-port", String(inspector), "--persist-to", persist, "--log-level", "warn"];
  if (failStartup) args.push("--pinsel-induced-invalid-option");
  const server = harness.start(process.execPath, args, { cwd: path.dirname(config), env: caFile ? { NODE_EXTRA_CA_CERTS: caFile } : {}, timeout: 300_000 });
  const deadline = Date.now() + (failStartup ? 5000 : 90_000);
  try {
    while (Date.now() < deadline) {
      harness.checkSignal();
      if (server.finished) throw new Error(`Worker startup exited early\n${server.output}`);
      try {
        await harness.request(`${origin}/api/v1/site`, {}, 1000);
        if (server.finished) throw new Error("Worker exited during readiness");
        return { origin, stop: server.stop };
      } catch { /* bounded readiness retry */ }
      await delay(200, undefined, { signal: harness.signal });
    }
    throw new Error(`Worker startup timeout\n${server.output}`);
  } catch (error) {
    await server.stop();
    throw error;
  }
}

/** @param {Harness} harness @param {string} root @param {string} config @param {string} persist */
export async function migrate(harness, root, config, persist) {
  await harness.run(process.execPath, [path.join(root, "apps/authoring-worker/node_modules/wrangler/bin/wrangler.js"), "d1", "migrations", "apply", "pinsel-authoring", "--local", "--config", config, "--persist-to", persist], { cwd: path.dirname(config) });
}
