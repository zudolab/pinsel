// Node-only inference host: no content database, shell routes, paths or browser credentials.
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createContentAiProvider } from "zudo-composer/hosted-content/node";
if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Content-AI host requires Node24");
const token = process.env.PINSEL_AI_TOKEN;
if (!token || token.length < 32) throw new Error("Per-launch AI host authentication is required");
const kind = process.env.PINSEL_AI_PROVIDER ?? "fake";
if (!["fake", "claude-cli", "codex-cli"].includes(kind)) throw new Error("PINSEL_AI_PROVIDER must be fake, claude-cli or codex-cli");
const { PINSEL_AI_TOKEN: withheld, ...providerEnv } = process.env;
void withheld;
const provider = await createContentAiProvider({ provider: /** @type {"fake"|"claude-cli"|"codex-cli"} */ (kind) }, { env: providerEnv });
let busy = false;
const server = createServer(async (request, response) => {
 const send = (/** @type {number} */ code, /** @type {unknown} */ body) => { response.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(body)); };
 const supplied = Buffer.from(request.headers.authorization ?? ""), wanted = Buffer.from(`Bearer ${token}`);
 if (request.headers.origin || supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) { send(403, { error: "Authenticated server request required" }); return; }
 try {
  if (request.method === "GET" && request.url === "/status") { send(200, { configured: true, provider: provider.label, canApply: true, inference: await provider.inference() }); return; }
  if (request.method !== "POST" || request.url !== "/propose") { send(404, { error: "Unknown route" }); return; }
  if (busy) { send(429, { error: "Provider is busy" }); return; }
  let body = "";
  for await (const chunk of request) { body += chunk.toString(); if (Buffer.byteLength(body) > 256000) { send(413, { error: "Request too large" }); return; } }
  const input = JSON.parse(body);
  if (!input || Object.keys(input).sort().join() !== "fields,instruction" || typeof input.instruction !== "string" || !input.instruction.trim() || input.instruction.length > 2000 || !Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > 2) throw new Error("Invalid proposal input");
  const keys = new Set();
  for (const field of input.fields) {
   if (!field || Object.keys(field).sort().join() !== "key,kind,label,value" || !["title","body"].includes(field.key) || keys.has(field.key) || !["text","long-text","markdown"].includes(field.kind) || typeof field.label !== "string" || field.label.length > 200 || typeof field.value !== "string" || field.value.length > 50000) throw new Error("Invalid scoped fields");
   keys.add(field.key);
  }
  if (busy) { send(429, { error: "Provider is busy" }); return; }
  busy = true;
  const controller = new AbortController();
  response.on("close", () => controller.abort());
  try { send(200, await provider.proposer.propose({ ...input, signal: controller.signal })); } finally { busy = false; }
 } catch { send(400, { error: "The bounded proposal request could not complete" }); }
});
server.listen(0, "127.0.0.1", () => {
 const address = server.address();
 if (!address || typeof address === "string") throw new Error("Missing AI loopback address");
 process.send?.({ type: "ready", origin: `http://127.0.0.1:${address.port}`, provider: provider.label });
});
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal, () => { server.closeAllConnections(); server.close(() => process.exit(0)); });
