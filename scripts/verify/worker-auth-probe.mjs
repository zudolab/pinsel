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
// Usage: node scripts/verify/worker-auth-probe.mjs [--port 8854] [--jwks-port 9454] [--report .reports/worker-auth-probe.json]
import { execFile, spawn } from "node:child_process";
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const worker = path.join(repoRoot, "apps/authoring-worker");
const argv = process.argv.slice(2);
/** @param {string} name @param {string} fallback */
const option = (name, fallback) => (argv.includes(name) ? (argv[argv.indexOf(name) + 1] ?? fallback) : fallback);
const port = Number(option("--port", "8854"));
const jwksPort = Number(option("--jwks-port", "9454"));
const reportPath = path.resolve(repoRoot, option("--report", ".reports/worker-auth-probe.json"));
const work = path.join(worker, ".wrangler/auth-probe");
const persist = path.join(work, "state");
const origin = `http://127.0.0.1:${port}`;
const TEAM = `https://127.0.0.1:${jwksPort}`;
const AUD = "pinsel-authoring-aud-fixture";
const EDITOR = "editor@example.test";

/** @type {{ probe: string, command: string, expected: string, actual: string, ok: boolean }[]} */
const results = [];

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
  const { stdout } = await run("curl", ["-sS", "-w", "\n%{http_code}", ...args], { maxBuffer: 1 << 24 });
  const index = stdout.lastIndexOf("\n");
  return { status: Number(stdout.slice(index + 1)), body: stdout.slice(0, index) };
}

const show = (/** @type {string[]} */ args) => `curl ${args.map((arg) => (/[\s"'{}]/.test(arg) ? `'${arg.length > 80 ? `${arg.slice(0, 40)}…${arg.slice(-12)}` : arg}'` : arg.length > 120 ? `${arg.slice(0, 60)}…` : arg)).join(" ")}`;

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

async function wranglerDev(/** @type {string[]} */ vars, /** @type {string} */ caFile) {
  const args = ["pnpm", "exec", "wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist, "--log-level", "warn", ...vars.flatMap((entry) => ["--var", entry])];
  const child = spawn("corepack", args, { cwd: worker, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false", NODE_EXTRA_CA_CERTS: caFile } });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    if (child.exitCode !== null) throw new Error(`wrangler dev exited early:\n${output}`);
    try {
      await fetch(`${origin}/api/v1/site`, { signal: AbortSignal.timeout(2000) });
      return {
        output: () => output,
        stop: () =>
          new Promise((resolve) => {
            child.once("exit", resolve);
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 10_000);
          }),
      };
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill("SIGKILL");
  throw new Error(`wrangler dev did not start within 90s:\n${output}`);
}

async function main() {
  await rm(work, { recursive: true, force: true });
  await mkdir(persist, { recursive: true });
  const keyFile = path.join(work, "tls-key.pem");
  const certFile = path.join(work, "tls-cert.pem");
  await run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"]);

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
  await new Promise((resolve) => server.listen(jwksPort, "127.0.0.1", () => resolve(undefined)));

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

  await run("corepack", ["pnpm", "exec", "wrangler", "d1", "migrations", "apply", "pinsel-authoring", "--local", "--persist-to", persist], { cwd: worker, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  const editorAsset = (await readdir(path.join(worker, "dist-assets/editor/static"))).find((file) => file.endsWith(".js"));
  const navigations = ["/", "/editor/", `/editor/static/${editorAsset}`, "/preview/", `/preview/${"0".repeat(64)}/`, "/assets/fonts/fonts.css"];

  // --- configured: TEAM_DOMAIN + POLICY_AUD + EDITOR_ALLOWLIST ---
  let dev = await wranglerDev([`TEAM_DOMAIN:${TEAM}`, `POLICY_AUD:${AUD}`, `EDITOR_ALLOWLIST:${EDITOR}`], certFile);
  try {
    await expectAnswer("configured: valid allowlisted assertion reads the site (positive control)", [...auth(tokens.valid), `${origin}/api/v1/site`], 200, '"status":"ok"');
    for (const route of ["/api/v1/site", "/api/v1/draft", ...navigations]) await expectAnswer(`configured: no assertion ${route}`, [`${origin}${route}`], 401, "missing-assertion");
    await expectAnswer("configured: an email header alone is not authentication", ["-H", `Cf-Access-Authenticated-User-Email: ${EDITOR}`, `${origin}/api/v1/draft`], 401, "missing-assertion");
    await expectAnswer("configured: another Host header (workers.dev-style) is gated too", ["-H", "Host: pinsel-authoring.example.workers.dev", `${origin}/editor/`], 401, "missing-assertion");
    for (const [name, token] of /** @type {const} */ ([["expired", tokens.expired], ["wrong aud", tokens.wrongAud], ["wrong iss", tokens.wrongIss], ["foreign signing key", tokens.foreignKey], ["no exp", tokens.noExp], ["nbf in the future", tokens.notYetValid], ["alg none", tokens.algNone], ["garbage", "not-a-jwt"]])) {
      await expectAnswer(`configured: ${name} → 403 on the API`, [...auth(token), `${origin}/api/v1/draft`], 403, "invalid-assertion");
      await expectAnswer(`configured: ${name} → 403 on the editor`, [...auth(token), `${origin}/editor/`], 403, "invalid-assertion");
    }
    await expectAnswer("configured: valid signature, email not on the allowlist → 403", [...auth(tokens.outsider), `${origin}/api/v1/draft`], 403, "not-allowed");
    await expectAnswer("configured: valid signature, email not on the allowlist → 403 on preview", [...auth(tokens.outsider), `${origin}/preview/`], 403, "not-allowed");
    await expectAnswer("configured: valid assertion serves the editor", [...auth(tokens.valid), `${origin}/editor/`], 200, "<div id=\"editor\"");
    await expectAnswer("configured: valid assertion serves an editor asset", [...auth(tokens.valid), `${origin}/editor/static/${editorAsset}`], 200, null);

    const draft = JSON.parse((await request([...auth(tokens.valid), `${origin}/api/v1/draft`])).body);
    const save = (/** @type {string} */ price) => JSON.stringify({ expectedRevision: draft.value.draftRevision, expectedBaselineRevision: draft.value.baselineRevision, values: { "course-price": price } });
    const put = `${origin}/api/v1/content/course/two-month`;
    await expectAnswer("CSRF: mutation without Origin → 403", ["-X", "PUT", ...auth(tokens.valid), "-H", "Idempotency-Key: probe-no-origin", "-H", "Content-Type: application/json", "--data", save("¥51,000"), put], 403, "csrf-origin");
    await expectAnswer("CSRF: mutation from another Origin → 403", ["-X", "PUT", ...auth(tokens.valid), "-H", "Origin: https://evil.example", "-H", "Idempotency-Key: probe-evil-origin", "-H", "Content-Type: application/json", "--data", save("¥51,000"), put], 403, "csrf-origin");
    await expectAnswer("CSRF: same Origin but Sec-Fetch-Site cross-site → 403", ["-X", "PUT", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Sec-Fetch-Site: cross-site", "-H", "Idempotency-Key: probe-cross-site", "-H", "Content-Type: application/json", "--data", save("¥51,000"), put], 403, "csrf-fetch-site");
    await expectAnswer("CSRF: same Origin, text/plain body → 415", ["-X", "PUT", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Idempotency-Key: probe-text", "-H", "Content-Type: text/plain", "--data", save("¥51,000"), put], 415, "unsupported-media-type");
    await expectAnswer("CSRF: mutation without an assertion is refused before CSRF (401)", ["-X", "PUT", "-H", `Origin: ${origin}`, "-H", "Content-Type: application/json", "--data", save("¥51,000"), put], 401, "missing-assertion");
    const unchanged = JSON.parse((await request([...auth(tokens.valid), `${origin}/api/v1/draft`])).body);
    const priceOf = (/** @type {any} */ value) => value.value.snapshot.entries.find((/** @type {any} */ entry) => entry.modelId === "course" && entry.id === "two-month").values["course-price"];
    const kept = unchanged.value.draftRevision === draft.value.draftRevision && priceOf(unchanged) === priceOf(draft);
    results.push({ probe: "CSRF: every refused mutation wrote nothing", command: "GET /api/v1/draft", expected: `revision ${draft.value.draftRevision}, price ${priceOf(draft)}`, actual: `revision ${unchanged.value.draftRevision}, price ${priceOf(unchanged)}`, ok: kept });
    console.log(`${kept ? "PASS" : "FAIL"} CSRF: every refused mutation wrote nothing`);
    await expectAnswer("same-origin JSON mutation with a valid assertion saves (positive control)", ["-X", "PUT", ...auth(tokens.valid), "-H", `Origin: ${origin}`, "-H", "Sec-Fetch-Site: same-origin", "-H", "Idempotency-Key: probe-ok", "-H", "Content-Type: application/json", "--data", save("¥51,000"), put], 200, '"status":"ok"');
    const saved = JSON.parse((await request([...auth(tokens.valid), `${origin}/api/v1/operations/probe-ok`])).body);
    results.push({ probe: "the receipt records the verified Access email as the actor", command: "GET /api/v1/operations/probe-ok", expected: EDITOR, actual: JSON.stringify(saved).includes(EDITOR) ? EDITOR : JSON.stringify(saved).slice(0, 160), ok: JSON.stringify(saved).includes(EDITOR) });
    results.push({ probe: "the Worker fetched the JWKS from TEAM_DOMAIN/cdn-cgi/access/certs", command: "(fixture server counter)", expected: ">= 1", actual: String(jwksHits), ok: jwksHits >= 1 });
  } finally {
    await dev.stop();
  }

  // --- POLICY_AUD missing: everything fails closed, even with a valid assertion ---
  dev = await wranglerDev([`TEAM_DOMAIN:${TEAM}`, `EDITOR_ALLOWLIST:${EDITOR}`], certFile);
  try {
    for (const route of ["/api/v1/site", "/api/v1/draft", ...navigations]) {
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
    await expectAnswer("non-https TEAM_DOMAIN → 503", [...auth(tokens.valid), `${origin}/api/v1/site`], 503, "configuration-required");
  } finally {
    await dev.stop();
    server.close();
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ origin, team: TEAM, audience: AUD, results }, null, 2)}\n`);
  const failed = results.filter((result) => !result.ok);
  console.log(`worker-auth-probe: ${results.length - failed.length}/${results.length} passed; report ${path.relative(repoRoot, reportPath)}`);
  if (failed.length > 0) process.exit(1);
}

await main();
