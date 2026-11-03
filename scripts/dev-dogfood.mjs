// Foreground Node24 provider + workerd/D1. Runtime secrets live in a private,
// per-launch temporary config and never in browser assets or process arguments.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."), worker = path.join(root, "apps/authoring-worker");
if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Use Node.js 24.x for dogfooding");
const state = path.resolve(process.env.PINSEL_DOGFOOD_STATE ?? path.join(worker, ".wrangler/dogfood"));
const port = process.env.PINSEL_DOGFOOD_PORT ?? "8787";
const provider = process.env.PINSEL_AI_PROVIDER ?? "fake";
if (!["fake","claude-cli","codex-cli"].includes(provider)) throw new Error("PINSEL_AI_PROVIDER must be fake, claude-cli or codex-cli");
await mkdir(state, { recursive: true });
const runtime = await mkdtemp(path.join(tmpdir(), "pinsel-dogfood-"));
/** @type {Set<import("node:child_process").ChildProcess>} */
const children = new Set();
let stopping = false;
/** @param {NodeJS.Signals} signal */
function stop(signal) {
 stopping = true;
 for (const child of children) try { process.kill(-Number(child.pid), signal); } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error; }
}
for(const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) process.on(signal, () => stop(signal));
/** @param {string} command @param {string[]} args @param {string} cwd @param {NodeJS.ProcessEnv} extra @param {boolean} ipc */
function start(command,args,cwd,extra={},ipc=false) {
 if (stopping) throw new Error("Startup stopped");
 const child=spawn(command,args,{cwd,detached:true,stdio:ipc?["inherit","inherit","inherit","ipc"]:"inherit",env:{...process.env,WRANGLER_SEND_METRICS:"false",...extra}});
 children.add(child);child.once("exit",()=>children.delete(child));return child;
}
/** @param {string[]} args @param {string} cwd @returns {Promise<void>} */
async function run(args,cwd=root) { const child=start("pnpm",args,cwd); await new Promise((resolve,reject)=>{child.once("error",reject);child.once("exit",(code,signal)=>code===0&&!signal?resolve(undefined):reject(new Error(`pnpm exited ${code??signal}`)));}); }
try {
 for (const command of ["assets:sync","content:assemble","build:editor","assets:assemble-worker"]) await run([command]);
 const token = randomBytes(32).toString("hex");
 const ai = start(process.execPath,[path.join(worker,"scripts/ai-host.mjs")],worker,{PINSEL_AI_TOKEN:token,PINSEL_AI_PROVIDER:provider},true);
 const origin = await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error("Local AI host startup timed out")),30000);
  ai.once("error",error=>{clearTimeout(timeout);reject(error);});ai.once("exit",()=>{clearTimeout(timeout);reject(new Error("Local AI host exited during startup"));});
  ai.on("message",message=>{if(message&&typeof message==="object"&&"type" in message&&message.type==="ready"&&"origin" in message&&typeof message.origin==="string"){clearTimeout(timeout);resolve(message.origin);}});
 });
 ai.on("exit",()=>{if(!stopping){console.error("Local AI host stopped; stopping dogfood processes.");stop("SIGTERM");}});
 const original=JSON.parse((await readFile(path.join(worker,"wrangler.jsonc"),"utf8")).replace(/^\s*\/\/.*$/gm,""));
 const config={...original,main:path.join(worker,original.env.local.main),assets:{...original.assets,directory:path.join(worker,original.assets.directory)},vars:{...original.env.local.vars,PINSEL_AI_ORIGIN:origin,PINSEL_AI_PROVIDER:provider},d1_databases:original.env.local.d1_databases.map((/** @type {any} */ db)=>({...db,migrations_dir:path.join(worker,db.migrations_dir),remote:false}))};delete config.env;
 const configPath=path.join(runtime,"wrangler.json");
 await writeFile(configPath,JSON.stringify(config),{mode:0o600});await writeFile(path.join(runtime,".dev.vars"),`PINSEL_AI_TOKEN=${token}\n`,{mode:0o600});
 await run(["exec","wrangler","d1","migrations","apply","pinsel-authoring","--local","--config",configPath,"--persist-to",state],worker);
 console.log(`Pinsel dogfood: http://127.0.0.1:${port}/editor/\nPersistent state: ${state}\nAI provider: ${provider} (availability shown in editor; fake is not real CLI verification)\nPublication disabled. Ctrl+C stops Worker and Node provider.`);
 await run(["exec","wrangler","dev","--local","--config",configPath,"--ip","127.0.0.1","--port",port,"--persist-to",state],worker);
} catch(error) { if(!stopping) { console.error(error); process.exitCode=1; } }
finally {
 const remaining=[...children];stop("SIGTERM");
 await Promise.all(remaining.map(child=>new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null){resolve(undefined);return;}const timer=setTimeout(()=>{try{process.kill(-Number(child.pid),"SIGKILL");}catch{}resolve(undefined);},5000);child.once("exit",()=>{clearTimeout(timer);resolve(undefined);});})));
 await rm(runtime,{recursive:true,force:true});
}
