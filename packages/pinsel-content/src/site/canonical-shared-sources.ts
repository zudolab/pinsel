import { createHash } from "node:crypto";
import { canonicalStringifyJson, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import type { JsonValue } from "@zudo-composer/component-contract";
import { projectNativeModelGuidance } from "./native-model-guidance";
import type { SiteProject } from "zudo-composer/site-project";

export const SHARED_MODELS = ["site-copy", "lessons-copy", "about-copy", "instructor-profile", "contact-copy"] as const;
const known: Readonly<Record<string, readonly string[]>> = {
  "site-copy": ["frame-header", "frame-footer", "instructor-detail-link", "home-hero", "home-hero-meta", "home-for-you", "home-pricing", "home-instructor", "home-results", "home-voices", "home-faq", "results-stats", "notes-head", "not-found-block", "note-detail-label",
    ...["home", "lessons", "about", "results", "voices", "faq"].map(page => `page-${page}-cta`),
    ...["exam-schedule", "free-tuition", "german-language", "online-exam", "what-is-mappe"].flatMap(slug => ["eyebrow", "toc", "related"].map(part => `note-${slug}-${part}`))],
  "lessons-copy": ["lessons-toc", "lessons-for-you", "lessons-course", "lessons-pricing", "lessons-consultation", "lessons-instructor", "lessons-specializations", "lessons-graduates", "lessons-knowledge"],
  "about-copy": ["about-instructor-identity", "about-cv", "about-message", "about-features"],
  "instructor-profile": ["home-instructor-profile", "lessons-instructor-profile", "about-profile", "about-message-body"],
  "contact-copy": ["contact-aside", "contact-form", "contact-legal"],
};
export const sharedSourceHash = (value: unknown) => createHash("sha256").update(canonicalStringifyJson(value as JsonValue)).digest("hex");
const equal = (a: unknown, b: unknown) => sharedSourceHash(a) === sharedSourceHash(b);

/** Explicit native projection only. Custom queries require review; never guess an owner. */
export function canonicalSharedSources(input: SiteProject) {
  if (input.id !== "pinsel" || input.schemaVersion !== 2 || input.componentPack.packId !== "pinsel" || input.componentPack.packVersion !== "0.4.0") throw new Error("Unsupported shared-source project identity");
  const project = structuredClone(input);
  const owners = project.providers.content.filter(provider => provider.id === "content-filesystem");
  if (owners.length !== 1) throw new Error("Expected exactly one qualified Content provider");
  const owner = owners[0]!;
  for (const modelId of SHARED_MODELS) {
    const models = owner.models.filter(model => model.id === modelId);
    const entries = owner.entries.filter(entry => entry.id === modelId);
    if (models.length !== 1 || models[0]!.document.id !== modelId || models[0]!.document.kind !== "collection" || entries.length !== 1 || entries[0]!.modelId !== modelId || entries[0]!.lifecycle !== "published") throw new Error(`Missing or ineligible canonical shared owner: content-filesystem/${modelId}/${modelId}`);
  }
  const changes: { providerId: string; recordId: string; before: unknown; after: unknown }[] = [];
  const alreadyPinned: string[] = [];
  for (const provider of project.providers.mappings) for (const record of provider.records) {
    const document = record.document;
    const modelId = document.contentModel.recordId;
    if (!SHARED_MODELS.some(id => id === modelId)) continue;
    const ref = { providerId: "content-filesystem", modelId, recordId: modelId };
    const legacy = { kind: "collection", query: { publication: "published-only", conditions: [], sort: [], pins: [], limit: 1 } };
    const pinned = { ...legacy, query: { ...legacy.query, pins: [ref] } };
    if (provider.id !== "mapping-filesystem" || document.id !== record.id || document.contentModel.providerId !== ref.providerId || !known[modelId]?.includes(record.id)) throw new Error(`Custom shared-source Mapping requires review; retained unchanged: ${provider.id}/${record.id}`);
    if (equal(document.mode, pinned)) { alreadyPinned.push(record.id); continue; }
    if (!equal(document.mode, legacy)) throw new Error(`Custom shared-source query requires review; retained unchanged: ${provider.id}/${record.id}`);
    if (owner.entries.filter(entry => entry.modelId === modelId && entry.lifecycle === "published").length !== 1) throw new Error(`Ambiguous legacy shared source requires explicit owner review: ${modelId}`);
    changes.push({ providerId: provider.id, recordId: record.id, before: structuredClone(document.mode), after: structuredClone(pinned) });
    if (document.mode.kind !== "collection") throw new Error("Expected collection Mapping");
    document.mode.query.pins = [ref];
  }
  return { project, changes, alreadyPinned };
}

export function migrateSharedSources(snapshot: AuthoringWorkspaceSnapshot, expectedDigest: string) {
  const { digest, ...body } = snapshot;
  if (!/^[a-f0-9]{64}$/.test(expectedDigest) || digest !== expectedDigest || sharedSourceHash(body) !== digest || snapshot.schemaVersion !== 1 || snapshot.workspaceId !== "pinsel" || snapshot.renderer.id !== "pinsel-zfb" || snapshot.renderer.version !== "native-v3") throw new Error("Unsupported or changed shared-source capture");
  const guided = projectNativeModelGuidance(snapshot.project);
  const modelDescriptions = guided.providers.content.flatMap((provider, p) => provider.models.flatMap((model, m) => {
    const before = snapshot.project.providers.content[p]!.models[m]!.document.description;
    return before === model.document.description ? [] : [{ providerId: provider.id, modelId: model.id, before, after: model.document.description }];
  }));
  const candidate = canonicalSharedSources(guided);
  return { ...candidate, evidence: { sourceDigest: digest, sourceTokens: snapshot.tokens, projectDigest: sharedSourceHash(candidate.project), contentDigest: sharedSourceHash(candidate.project.providers.content), modelDescriptions, changes: candidate.changes, alreadyPinned: candidate.alreadyPinned } };
}
