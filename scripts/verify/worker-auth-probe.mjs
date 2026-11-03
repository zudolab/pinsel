// Probes the PRODUCTION authoring entry (src/index.ts, not --env local) under
// `wrangler dev` with `curl`: Cloudflare Access JWT verification against a
// local JWKS fixture, the email allowlist, CSRF on mutations, and fail-closed
// 503 when a launch input is missing.
//
// The fixture is an RSA key generated per run and served over HTTPS on
// 127.0.0.1 from a self-signed certificate. workerd trusts it through
// NODE_EXTRA_CA_CERTS (miniflare adds those PEMs to its trusted set), so the
// Worker's real `createRemoteJWKSet(TEAM_DOMAIN/cdn-cgi/access/certs)` path is
// exercised end to end; nothing leaves the machine.
//
// Prerequisites: pnpm content:assemble && pnpm build:editor && pnpm assets:assemble-worker.
// Usage: pnpm verify:auth [--report <file>] [--fail-startup | --fail-request]
// Ports default to OS-assigned loopback ports; --port / --jwks-port are optional.
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHarness, freePort, migrate, prerequisites, sanitize, startWorker, workerConfig } from "./local-harness.mjs";
import { readCommittedEntries } from "../lib/committed-entries.mjs";
import { committedAmounts, editPrices } from "../lib/edit-prices.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const worker = path.join(repoRoot, "apps/authoring-worker");
const argv = process.argv.slice(2);
/** @param {string} name @param {string} fallback */
const option = (name, fallback) => (argv.includes(name) ? (argv[argv.indexOf(name) + 1] ?? fallback) : fallback);
const port = Number(option("--port", "0")) || await freePort();
const jwksPort = Number(option("--jwks-port", "0")) || await freePort();
const reportPath = path.resolve(repoRoot, option("--report", ".reports/worker-auth-probe.json"));
const harness = await createHarness("auth", reportPath);
const work = harness.work;
const persist = path.join(work, "state");
const origin = `http://127.0.0.1:${port}`;
const TEAM = `https://127.0.0.1:${jwksPort}`;
const AUD = "pinsel-authoring-aud-fixture";
const EDITOR = "editor@example.test";


const results = harness.report.results;

const b64url = (/** @type {Buffer | string} */ value) => Buffer.from(value).toString("base64url");

/** RS256 compact JWS, the shape Access issues. */
function sign(/** @type {import("node:crypto").KeyObject} */ key, /** @type {string} */ kid, /** @type {Record<string, unknown>} */ payload, alg = "RS256") {
  const head = `${b64url(JSON.stringify({ alg, kid, typ: "JWT" }))}.${b64url(JSON.stringify(payload))}`;
  if (alg === "none") return `${head}.`;
  const signer = createSign("RSA-SHA256");
  signer.update(head);
  return `${head}.${signer.sign(key).toString("base64url")}`;
}

/** curl with the body captured: returns { status, body }. */
async function request(/** @type {string[]} */ args) {
  const { output, code, error } = await harness.start("curl", ["-q", "--noproxy", "*", "--connect-timeout", "2", "--max-time", "10", "-sS", "-w", "\n%{http_code}", ...args], { timeout: 12_000 }).result();
  if (code !== 0 || error) throw new Error(`Loopback request failed (curl exit ${code})`);
  const index = output.lastIndexOf("\n");
  return { status: Number(output.slice(index + 1)), body: output.slice(0, index) };
}

const show = (/** @type {string[]} */ args) => `curl ${args.map((arg) => sanitize(arg)).join(" ")}`;

/**
 * @param {string} probe
 * @param {string[]} args
 * @param {number} status
 * @param {string | null} code expected `code` in a JSON body, or a text the HTML page must contain
 */
async function expectAnswer(probe, args, status, code) {
  const answer = await request(args);
  const codeOk = code === null || answer.body.includes(code);
  const ok = answer.status === status && codeOk;
  const actual = `${answer.status} ${answer.body.replace(/\s+/g, " ").slice(0, 160)}`;
  results.push({ probe, command: show(args), expected: `${status}${code ? ` ${code}` : ""}`, actual, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${probe}: expected ${status}${code ? ` ${code}` : ""}, got ${actual.slice(0, 120)}`);
  return answer;
}

let launch = 0;
/** @param {string[]} vars @param {string} caFile */
async function wranglerDev(vars, caFile) {
  const config = await workerConfig(repoRoot, path.join(work, `config-${++launch}`), { vars: Object.fromEntries(vars.map((value) => { const colon = value.indexOf(":"); return [value.slice(0, colon), value.slice(colon + 1)]; })) });
  return startWorker(harness, repoRoot, config, persist, { port, caFile, failStartup: argv.includes("--fail-startup") });
}

async function main() {
  const NEW_PRICE = editPrices(committedAmounts(readCommittedEntries(repoRoot), "course-price"))(1);
  await prerequisites(repoRoot);
  harness.report.sourceSha = await harness.run("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
  harness.report.baseline = JSON.parse(await readFile(path.join(repoRoot, "packages/pinsel-content/.site-project/baseline.json"), "utf8"));
  if (harness.report.baseline.baselineRevision !== harness.report.sourceSha) throw new Error("Assembled baseline is stale: run pnpm content:assemble at the current HEAD");
  await harness.run("curl", ["-q", "--version"]);
  await harness.run("openssl", ["version"]);
  const keyFile = path.join(work, "tls-key.pem");
  const certFile = path.join(work, "tls-cert.pem");
  await harness.run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"]);

  const kid = `fixture-${randomUUID()}`;
  const access = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const foreign = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwks = { keys: [{ ...access.publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }] };
  let jwksHits = 0;
  const server = createServer({ key: await readFile(keyFile), cert: await readFile(certFile) }, (req, res) => {
    if (req.url === "/cdn-cgi/access/certs") {
      jwksHits += 1;
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(jwks));
    } else res.writeHead(404).end();
  });
  harness.cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error && /** @type {NodeJS.ErrnoException} */ (error).code !== "ERR_SERVER_NOT_RUNNING" ? reject(error) : resolve(undefined)));
    harness.report.cleanup.jwksClosed = true;
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(jwksPort, "127.0.0.1", () => resolve(undefined)); });

  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: TEAM, aud: [AUD], email: EDITOR, sub: "fixture-subject", iat: now, nbf: now - 5, exp: now + 600, type: "app" };
  const tokens = {
    valid: sign(access.privateKey, kid, claims),
    expired: sign(access.privateKey, kid, { ...claims, iat: now - 7200, nbf: now - 7200, exp: now - 3600 }),
    wrongAud: sign(access.privateKey, kid, { ...claims, aud: ["another-application"] }),
    wrongIss: sign(access.privateKey, kid, { ...claims, iss: "https://other-team.cloudflareaccess.com" }),
    foreignKey: sign(foreign.privateKey, kid, claims),
    noExp: sign(access.privateKey, kid, Object.fromEntries(Object.entries(claims).filter(([key]) => key !== "exp"))),
    notYetValid: sign(access.privateKey, kid, { ...claims, nbf: now + 3600 }),
    algNone: sign(access.privateKey, kid, claims, "none"),
    outsider: sign(access.privateKey, kid, { ...claims, email: "outsider@example.test" }),
  };
  const auth = (/** @type {string} */ token) => ["-H", `Cf-Access-Jwt-Assertion: ${token}`];

  const migrationConfig = await workerConfig(repoRoot, path.join(work, "migration"));
  await migrate(harness, repoRoot, migrationConfig, persist);
  const editorAsset = (await readdir(path.join(worker, "dist-assets/editor/static"))).find((file) => file.endsWith(".js"));
  if (!editorAsset) throw new Error("No built editor JavaScript asset found");
  const navigations = ["/", "/editor/", `/editor/static/${editorAsset}`, "/preview/", `/preview/${"0".repeat(64)}/`, "/assets/fonts/fonts.css"];

  // --- configured: TEAM_DOMAIN + POLICY_AUD + EDITOR_ALLOWLIST ---
  let dev = await wranglerDev([`TEAM_DOMAIN:${TEAM}`, `POLICY_AUD:${AUD}`, `EDITOR_ALLOWLIST:${EDITOR}`], certFile);
  try {
    if (argv.includes("--fail-request")) {
      await dev.stop();
      await request([`${origin}/api/hosted/config`]);
      throw new Error("Induced request failure unexpectedly succeeded");
    }
    await expectAnswer("configured: valid allowlisted assertion reads the site (positive control)", [...auth(tokens.valid), `${origin}/api/hosted/config`], 200, '"actorId"');
    for (const route of ["/api/hosted/config", "/api/hosted/state", ...navigations]) await expectAnswer(`configured: no assertion ${route}`, [`${origin}${route}`], 401, "missing-assertion");
    await expectAnswer("configured: an email header alone is not authentication", ["-H", `Cf-Access-Authenticated-User-Email: ${EDITOR}`, `${origin}/api/hosted/state`], 401, "missing-assertion");
    await expectAnswer("configured: another Host header (workers.dev-style) is gated too", ["-H", "Host: pinsel-authoring.example.workers.dev", `${origin}/editor/`], 401, "missing-assertion");
    for (const [name, token] of /** @type {const} */ ([["expired", tokens.expired], ["wrong aud", tokens.wrongAud], ["wrong iss", tokens.wrongIss], ["foreign signing key", tokens.foreignKey], ["no exp", tokens.noExp], ["nbf in the future", tokens.notYetValid], ["alg none", tokens.algNone], ["garbage", "not-a-jwt"]])) {
      await expectAnswer(`configured: ${name} → 403 on the API`, [...auth(token), `${origin}/api/hosted/state`], 403, "invalid-assertion");
      await expectAnswer(`configured: ${name} → 403 on the editor`, [...auth(token), `${origin}/editor/`], 403, "invalid-assertion");
    }
    await expectAnswer("configured: valid signature, email not on the allowlist → 403", [...auth(tokens.outsider), `${origin}/api/hosted/state`], 403, "not-allowed");
    await expectAnswer("configured: valid signature, email not on the allowlist → 403 on preview", [...auth(tokens.outsider), `${origin}/preview/`], 403, "not-allowed");
    await expectAnswer("configured: valid assertion serves the editor", [...auth(tokens.valid), `${origin}/editor/`], 200, "<div id=\"editor\"");
    await expectAnswer("configured: valid assertion serves an editor asset", [...auth(tokens.valid), `${origin}/editor/static/${editorAsset}`], 200, null);

    const draft = JSON.parse((await request([...auth(tokens.valid), `${origin}/api/hosted/state`])).body);
    const entry = { providerId: draft.providers[0].providerId, modelId: "course", recordId: "two-month" };
    const save = (/** @type {string} */ key) => JSON.stringify({ method: "execute", argument: { kind: "set-fields", operationKey: key, expected: { draftRevision: draft.draftRevision, baseline: draft.baseline, definition: draft.definition }, entry, values: { "course-price": NEW_PRICE }, clear: [] } });
    const endpoint = `${origin}/api/hosted/rpc`;
    for (const [label, extra] of /** @type {[string,string[]][]} */ ([["missing", []], ["foreign", ["-H", "Origin: https://evil.example"]], ["fetch-site", ["-H", `Origin: ${origin}`, "-H", "Sec-Fetch-Site: cross-site"]]])) {
      await expectAnswer(`CSRF ${label}`, ["-X", "POST", ...auth(tokens.valid), ...extra, "-H", "Content-Type: application/json", "--data", save(label), endpoint], 403, "forbidden");
    }
    const unchanged = JSON.parse((await request([...auth(tokens.valid), `${origin}/api/hosted/state`])).body);
    results.push({ probe: "CSRF refusals preserve draft", ok: unchanged.draftRevision === draft.draftRevision });
    await expectAnswer("valid same-origin save", ["-X", "POST", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Content-Type: application/json", "--data", save("probe-ok"), endpoint], 200, '"state"');
    const saved = await request(["-X", "POST", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Content-Type: application/json", "--data", JSON.stringify({ method: "readReceipt", argument: "probe-ok" }), endpoint]);
    results.push({ probe: "receipt actor is verified Access email", ok: JSON.parse(saved.body).actorId === EDITOR });

  } finally {
    await dev.stop();
  }

  // --- POLICY_AUD missing: everything fails closed, even with a valid assertion ---
  dev = await wranglerDev([`TEAM_DOMAIN:${TEAM}`, `EDITOR_ALLOWLIST:${EDITOR}`], certFile);
  try {
    for (const route of ["/api/hosted/config", "/api/hosted/state", ...navigations]) {
      await expectAnswer(`POLICY_AUD missing: ${route} → 503`, [`${origin}${route}`], 503, "configuration-required");
      await expectAnswer(`POLICY_AUD missing: ${route} with a valid assertion → 503`, [...auth(tokens.valid), `${origin}${route}`], 503, "configuration-required");
    }
    await expectAnswer("POLICY_AUD missing: mutation → 503", ["-X", "PUT", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Content-Type: application/json", "--data", "{}", `${origin}/api/v1/content/course/two-month`], 503, "configuration-required");
  } finally {
    await dev.stop();
  }
  // --- a plain-http TEAM_DOMAIN is not accepted as configuration ---
  dev = await wranglerDev([`TEAM_DOMAIN:http://127.0.0.1:${jwksPort}`, `POLICY_AUD:${AUD}`, `EDITOR_ALLOWLIST:${EDITOR}`], certFile);
  try {
    await expectAnswer("non-https TEAM_DOMAIN → 503", [...auth(tokens.valid), `${origin}/api/hosted/config`], 503, "configuration-required");
  } finally {
    await dev.stop();
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) throw new Error(`${failed.length}/${results.length} auth assertions failed`);
}

let failure;
try { await main(); } catch (error) { failure = error; console.error(sanitize(String(error))); }
await harness.finish(failure);
