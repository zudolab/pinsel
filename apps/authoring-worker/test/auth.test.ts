import { describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

import { ACCESS_ASSERTION_HEADER, createAccessIdentity } from "../src/auth/identity";

const TEAM = "https://pinsel.cloudflareaccess.com";
const AUD = "aud-tag-1234";

const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const jwks = createLocalJWKSet({ keys: [jwk] });
const { privateKey: strangerKey } = await generateKeyPair("RS256");

async function token(claims: { email?: string; iss?: string; aud?: string; exp?: string; key?: CryptoKey } = {}) {
  return new SignJWT({ email: claims.email ?? "editor@example.test" })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(claims.iss ?? TEAM)
    .setAudience(claims.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "10m")
    .sign(claims.key ?? privateKey);
}

function request(assertion?: string) {
  return new Request("https://authoring.example/api/v1/draft", assertion ? { headers: { [ACCESS_ASSERTION_HEADER]: assertion } } : {});
}

describe("Cloudflare Access identity", () => {
  const identity = createAccessIdentity({ teamDomain: TEAM, audience: AUD, allowlist: "Editor@example.test, second@example.test", jwks });

  it("accepts a valid assertion for an allowlisted editor", async () => {
    const result = await identity(request(await token()));
    expect(result).toEqual({ ok: true, actor: { subject: "editor@example.test" } });
  });

  it("rejects a missing header with 401 and bad assertions with 403", async () => {
    expect(await identity(request())).toMatchObject({ ok: false, status: 401, code: "missing-assertion" });
    expect(await identity(request(await token({ aud: "other" })))).toMatchObject({ ok: false, status: 403, code: "invalid-assertion" });
    expect(await identity(request(await token({ iss: "https://other.cloudflareaccess.com" })))).toMatchObject({ ok: false, status: 403, code: "invalid-assertion" });
    expect(await identity(request(await token({ exp: "-1m" })))).toMatchObject({ ok: false, status: 403, code: "invalid-assertion" });
    expect(await identity(request(await token({ key: strangerKey })))).toMatchObject({ ok: false, status: 403, code: "invalid-assertion" });
    expect(await identity(request("not-a-jwt"))).toMatchObject({ ok: false, status: 403, code: "invalid-assertion" });
    expect(await identity(request(await token({ email: "stranger@example.test" })))).toMatchObject({ ok: false, status: 403, code: "not-allowed" });
  });

  it("fails closed with 503 when any launch input is missing", async () => {
    for (const config of [{ teamDomain: "", audience: AUD, allowlist: "a@b.c" }, { teamDomain: TEAM, audience: "", allowlist: "a@b.c" }, { teamDomain: TEAM, audience: AUD, allowlist: "" }, { teamDomain: "http://insecure", audience: AUD, allowlist: "a@b.c" }]) {
      expect(await createAccessIdentity({ ...config, jwks })(request(await token()))).toMatchObject({ ok: false, status: 503, code: "configuration-required" });
    }
  });
});
