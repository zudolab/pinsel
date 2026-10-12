import type { ContentExportEvidence, ContentExportState, ContentExportSubmission } from "zudo-composer/export";
import type { ContentSnapshotRecord } from "zudo-composer/host-storage";

// The publication provider port. A provider turns one immutable snapshot into
// a content-only change in the canonical Git source and reports what it can
// prove about it. The shapes follow the upstream export contract
// (zudo-composer/export: `ContentExportSubmission`, `ContentExportState`,
// `ContentExportEvidence`); the port adds `lookupExisting` so a lost
// acknowledgement is recovered by lookup instead of a second submission, and
// hands the provider the snapshot record it must write.
//
// Implementations: src/publish/fake-provider.ts (tests, local dev) and the
// GitHub provider (src/publish/github-provider.ts, publication sub-issue).

/** API job states. `draft-saved` and `configuration-required` are never stored on a job. */
export const PUBLICATION_STATES = ["draft-saved", "submitted", "building", "validated", "integrated", "live", "failed", "conflict", "configuration-required"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];
export type StoredPublicationState = Exclude<PublicationState, "draft-saved" | "configuration-required">;

/** States no provider observation can leave. */
export const TERMINAL_PUBLICATION_STATES: readonly StoredPublicationState[] = ["live", "failed", "conflict"];

/** A provider writes nothing outside `@pinsel/content`'s authoritative allowlist. */
export { PINSEL_PUBLISH_ALLOWLIST, isPublishablePath } from "@pinsel/content";

/** Opaque provider handle; `operationId` is the provider's id for the submission. Providers may add fields (branch, PR number). */
export interface ProviderRef {
  readonly providerId: string;
  readonly operationId: string;
  readonly [key: string]: string | number | boolean;
}

export interface DeploymentEvidence {
  readonly deploymentId: string;
  /** The commit the deployment serves; must equal `evidence.commit` for `live`. */
  readonly commit: string;
  readonly observedAt: string;
}

export interface PublicationEvidence extends ContentExportEvidence {
  /** Only a provider that observed the deployment may set this. */
  readonly deployment?: DeploymentEvidence;
}

export interface ProviderObservation {
  readonly state: ContentExportState;
  readonly snapshotId: string;
  readonly baselineRevision: string;
  readonly evidence?: PublicationEvidence;
  readonly message?: string;
  readonly observedAt: string;
}

export interface ProviderSubmitInput {
  readonly submission: ContentExportSubmission;
  readonly snapshot: ContentSnapshotRecord;
}

export type ProviderSubmitResult =
  | { status: "ok"; ref: ProviderRef; replayed: boolean }
  | { status: "rejected"; message: string; path?: string }
  /** The same idempotency key already names a different submission. */
  | { status: "conflict"; message: string }
  /** No answer: the submission may or may not exist. Recover with `lookupExisting`. */
  | { status: "timeout"; message: string }
  | { status: "unavailable"; message: string };

export type ProviderStatusResult = { status: "ok"; value: ProviderObservation } | { status: "not-found" } | { status: "timeout"; message: string } | { status: "unavailable"; message: string };

export type ProviderLookupResult = { status: "ok"; ref: ProviderRef } | { status: "not-found" } | { status: "timeout"; message: string } | { status: "unavailable"; message: string };

export interface PublicationProviderPort {
  readonly providerId: string;
  /** Submit one snapshot against its exact base and package identity. Idempotent per `submission.idempotencyKey`. */
  submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult>;
  /** What the provider can currently prove about a submission. */
  status(ref: ProviderRef): Promise<ProviderStatusResult>;
  /** Find a submission for this snapshot that already exists (after a lost acknowledgement or a restart). */
  lookupExisting(snapshotId: string): Promise<ProviderLookupResult>;
}

/**
 * Upstream export state + evidence → the API's truthful state. Claims the
 * evidence cannot back are downgraded: `verified` needs a commit and every
 * reported check passed; `integrated` needs the merge commit; `deployed`
 * becomes `live` only with deployment evidence for that same commit.
 */
export function publicationStateFor(observation: ProviderObservation): StoredPublicationState {
  const evidence = observation.evidence;
  switch (observation.state) {
    case "submitted":
    case "building":
      return observation.state;
    case "verified": {
      const checks = evidence?.checks ?? [];
      return evidence?.commit && checks.length > 0 && checks.every((check) => check.status === "passed") ? "validated" : "building";
    }
    case "integrated":
      return evidence?.commit ? "integrated" : "building";
    case "deployed":
      if (!evidence?.commit) return "building";
      return evidence.deployment && evidence.deployment.commit === evidence.commit ? "live" : "integrated";
    case "failed":
      return "failed";
    case "conflict":
      return "conflict";
  }
}

export type PromotionPolicy = "manual" | "auto";

export interface PublisherEnv {
  PUBLISHER_PROVIDER?: string;
  PROMOTION_POLICY?: string;
}

export interface PublisherConfig {
  promotionPolicy: PromotionPolicy;
}

/** Builds a provider for one named `PUBLISHER_PROVIDER`; returns null when its own launch inputs are missing. */
export type PublisherFactory = (env: PublisherEnv & Record<string, unknown>, config: PublisherConfig) => PublicationProviderPort | null;

export type PublisherSelection = { ok: true; port: PublicationProviderPort; config: PublisherConfig } | { ok: false; code: "configuration-required"; message: string };

/**
 * `PUBLISHER_PROVIDER` picks a registered factory. Unset, `disabled`, an
 * unregistered name, an invalid `PROMOTION_POLICY` or a factory without its
 * inputs all fail closed with `configuration-required`.
 */
export function selectPublisher(env: PublisherEnv & Record<string, unknown>, factories: Readonly<Record<string, PublisherFactory>>): PublisherSelection {
  const name = (env.PUBLISHER_PROVIDER ?? "disabled").trim();
  if (name === "" || name === "disabled") return { ok: false, code: "configuration-required", message: "Publication is disabled (PUBLISHER_PROVIDER=disabled)." };
  const policy = (env.PROMOTION_POLICY ?? "manual").trim() || "manual";
  if (policy !== "manual" && policy !== "auto") return { ok: false, code: "configuration-required", message: `PROMOTION_POLICY must be manual or auto, not "${policy}".` };
  const factory = Object.hasOwn(factories, name) ? factories[name] : undefined;
  if (!factory) return { ok: false, code: "configuration-required", message: `PUBLISHER_PROVIDER "${name}" is not available in this build.` };
  const config: PublisherConfig = { promotionPolicy: policy };
  const port = factory(env, config);
  return port ? { ok: true, port, config } : { ok: false, code: "configuration-required", message: `PUBLISHER_PROVIDER "${name}" is missing its launch inputs.` };
}
