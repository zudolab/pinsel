import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { HostContentActor } from "zudo-composer/content";

export type IdentityFailureCode = "configuration-required" | "missing-assertion" | "invalid-assertion" | "not-allowed";

export type IdentityResult = { ok: true; actor: HostContentActor } | { ok: false; status: 401 | 403 | 503; code: IdentityFailureCode; message: string };

/** Resolves the verified actor for a request, or why there is none. Decided before any route logic runs. */
export type IdentityResolver = (request: Request) => Promise<IdentityResult>;

export interface AccessIdentityConfig {
  /** `https://<team>.cloudflareaccess.com` — also the JWT issuer. */
  teamDomain: string;
  /** The Access application's AUD tag. */
  audience: string;
  /** Comma-separated editor emails; empty fails closed. */
  allowlist: string;
  /** Test seam: a local JWKS instead of the team's `/cdn-cgi/access/certs`. */
  jwks?: JWTVerifyGetKey;
}

export const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";

function parseAllowlist(value: string): Set<string> {
  return new Set(value.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0));
}

/**
 * Cloudflare Access JWT verification with jose (`createRemoteJWKSet` +
 * `jwtVerify` on issuer, audience and expiry). A Worker with static assets does
 * not receive `ctx.access`, so the header is the only identity source.
 */
export function createAccessIdentity(config: AccessIdentityConfig): IdentityResolver {
  const allowlist = parseAllowlist(config.allowlist);
  const configured = /^https:\/\/[^/]+$/.test(config.teamDomain) && config.audience.length > 0 && allowlist.size > 0;
  const jwks = configured ? (config.jwks ?? createRemoteJWKSet(new URL(`${config.teamDomain}/cdn-cgi/access/certs`))) : null;
  return async (request) => {
    if (!configured || !jwks) return { ok: false, status: 503, code: "configuration-required", message: "TEAM_DOMAIN, POLICY_AUD and EDITOR_ALLOWLIST must be configured." };
    const token = request.headers.get(ACCESS_ASSERTION_HEADER);
    if (!token) return { ok: false, status: 401, code: "missing-assertion", message: "Cloudflare Access assertion is required." };
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer: config.teamDomain, audience: config.audience });
      const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
      if (!email || !allowlist.has(email)) return { ok: false, status: 403, code: "not-allowed", message: "This identity may not edit Pinsel content." };
      return { ok: true, actor: { subject: email } };
    } catch (error) {
      const detail = error instanceof errors.JOSEError ? error.code : "verification-failed";
      return { ok: false, status: 403, code: "invalid-assertion", message: `Access assertion rejected (${detail}).` };
    }
  };
}

/** Local development only (`src/local-dev.ts`): a fixed subject, no network. Never bundled into the production entry. */
export function createFixtureIdentity(subject: string): IdentityResolver {
  const actor: HostContentActor = { subject };
  return async () => ({ ok: true, actor });
}

export type CsrfFailure = { ok: true } | { ok: false; code: "csrf-origin" | "csrf-fetch-site" | "unsupported-media-type"; message: string };

/**
 * Mutations must come from the Worker's own origin: an `Origin` header exactly
 * equal to it (missing is rejected), `Sec-Fetch-Site: same-origin` when the
 * browser sends it, and a JSON body.
 */
export function checkMutationRequest(request: Request): CsrfFailure {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return { ok: false, code: "csrf-origin", message: "Origin must equal the authoring origin." };
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return { ok: false, code: "csrf-fetch-site", message: "Sec-Fetch-Site must be same-origin." };
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { ok: false, code: "unsupported-media-type", message: "Content-Type must be application/json." };
  return { ok: true };
}
