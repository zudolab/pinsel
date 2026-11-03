// One foreground process tree, local-only persistent D1. No reset on startup.
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."), worker = path.join(root, "apps/authoring-worker");
if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Use Node.js 24.x for dogfooding");
const state = path.resolve(process.env.PINSEL_DOGFOOD_STATE ?? path.join(worker, ".wrangler/dogfood"));
const port = process.env.PINSEL_DOGFOOD_PORT ?? "8787";
await mkdir(state, { recursive: true });
/** @type {import("node:child_process").ChildProcess | undefined} */
let active;
let stopping = false;
/** @param {NodeJS.Signals} signal */
function stop(signal) {
 stopping = true;
 if (!active) { process.exitCode = 0; return; }
 try { process.kill(-Number(active.pid), signal); } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error; }
}
for(const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) process.on(signal, () => stop(signal));
/** @param {string[]} args @param {string} cwd @returns {Promise<void>} */
function run(args, cwd = root) { if (stopping) process.exit(0); return new Promise((resolve, reject) => {
 const child = spawn("pnpm", args, { cwd, detached: true, stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } }); active = child;
 child.on("error", reject); child.on("exit", (code, signal) => { active = undefined; if(stopping || signal) process.exit(0); code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} exited ${code}`)); });
}); }
for (const command of ["assets:sync", "content:assemble", "build:editor", "assets:assemble-worker"]) await run([command]);
await run(["exec", "wrangler", "d1", "migrations", "apply", "pinsel-authoring", "--local", "--env", "local", "--persist-to", state], worker);
console.log(`Pinsel dogfood: http://127.0.0.1:${port}/editor/\nPersistent state: ${state}\nPublication disabled. Stop with Ctrl+C; subsequent starts retain the same D1.`);
await run(["exec", "wrangler", "dev", "--local", "--env", "local", "--ip", "127.0.0.1", "--port", port, "--persist-to", state], worker);
