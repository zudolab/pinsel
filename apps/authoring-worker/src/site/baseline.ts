import { pinselHostedDefinitionDocument, PINSEL_HOSTED_RENDERER, createPinselHostedPolicy, PINSEL_PROJECT_ID, PINSEL_ROUTES, checkNoteMarkdown, checkFieldValue } from "@pinsel/content";
import { pinselPack } from "@pinsel/ui";
import { canonicalSerialize, projectHostedSite, createHostedContentService, createHostedSiteProjector, HostedContentError, type HostedHead, type HostedProvider, type HostedCommand, type HostedActor } from "zudo-composer/hosted-content";
import type { SiteProject, ContentEntryRecord } from "zudo-composer/site-project";
import assembledBaseline from "../../../../packages/pinsel-content/.site-project/baseline.json";
import siteProject from "../../../../packages/pinsel-content/.site-project/site-project.json";
import { PinselHostedStorage } from "../storage/hosted-storage";

export const PROJECT_ID = PINSEL_PROJECT_ID;
export const PROJECT = siteProject as unknown as SiteProject;
export const PROVIDERS: HostedProvider[] = PROJECT.providers.content.map(provider => ({ providerId: provider.id, models: provider.models, entries: provider.entries }));
export const POLICY = createPinselHostedPolicy(PROVIDERS);
export const ROUTES = PINSEL_ROUTES;
export const PACK = { packId: pinselPack.manifest.packId, packVersion: pinselPack.manifest.packVersion };
export const RENDERER = PINSEL_HOSTED_RENDERER;
export async function digest(value: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2,"0")).join(""); }
export async function definition(): Promise<string> { return digest(canonicalSerialize(pinselHostedDefinitionDocument(PROJECT, pinselPack.manifest))); }

/** Fresh database or a one-time legacy migration, never a reset on normal start.
 * Copy the entire old baseline/draft into an archive in the same transaction.
 * Unknown/removed entries refuse initialization rather than silently losing data.
 */
export async function ensureHostedSeeded(db: D1Database): Promise<void> {
 if (await db.prepare("SELECT id FROM pinsel_hosted_head WHERE id = 1").first()) return;
 const old = await db.prepare("SELECT * FROM draft_state WHERE project_id = ?").bind(PROJECT_ID).first();
 const baseline = await db.prepare("SELECT * FROM baseline WHERE project_id = ?").bind(PROJECT_ID).first();
 const rows = await db.prepare("SELECT record_json FROM draft_entries WHERE project_id = ? ORDER BY position").bind(PROJECT_ID).all<{ record_json: string }>();
 const providers = structuredClone(PROVIDERS);
 if (old) {
   const entries = rows.results.map(row => JSON.parse(row.record_json) as ContentEntryRecord);
   const provider = providers[0]!;
   const known = new Set(provider.entries.map(entry => `${entry.modelId}/${entry.id}`));
   if (entries.some(entry => !known.has(`${entry.modelId}/${entry.id}`)) || entries.length !== known.size || new Set(entries.map(entry => `${entry.modelId}/${entry.id}`)).size !== known.size) throw new HostedContentError("definition-conflict", "Legacy draft differs structurally. It is retained unchanged; export it and explicitly migrate its entries before starting.");
   provider.entries = entries;
   const validation = await projectHostedSite({ project: PROJECT, componentPack: pinselPack.manifest }, providers.map(item => ({ ...item, entries: item.entries.map(entry => ({ ...entry, lifecycle: "published" as const })) })));
   if (validation.status !== "ready") throw new HostedContentError("definition-conflict", `Legacy values require explicit migration: ${validation.diagnostics.map(item => item.message).join("; ")}. Original tables remain intact.`);
 }
 const currentDefinition = await definition();
 const head: HostedHead = { version: crypto.randomUUID(), activePublicationId: null, baselineProviders: structuredClone(PROVIDERS), state: {
   draftRevision: crypto.randomUUID(), baseline: { gitSha: assembledBaseline.baselineRevision, contentDigest: assembledBaseline.projectDigest }, definition: currentDefinition, providers, integrationFence: 0,
 } };
 const statements = [
  db.prepare("INSERT OR IGNORE INTO pinsel_hosted_head VALUES (1, ?, ?)").bind(head.version, JSON.stringify(head)),
  db.prepare("INSERT INTO pinsel_hosted_migration SELECT 1, ?, ? WHERE changes() = 1").bind(new Date().toISOString(), JSON.stringify({ source: old ? "legacy-draft" : "canonical", draftState: old, baseline, entries: rows.results, note: "Legacy tables and receipts retained; new operation namespace." })),
 ];
 await db.batch(statements);
}
export async function serviceFor(db: D1Database) {
 await ensureHostedSeeded(db);
 const service = createHostedContentService({ siteId: PROJECT_ID, definition: await definition(), policy: POLICY, storage: new PinselHostedStorage(db),
  authorize(actor) { if (!actor.id) throw new HostedContentError("forbidden", "Authenticated editor required"); },
  digest, createId: () => crypto.randomUUID(), now: () => new Date().toISOString(), source: "pinsel-editor",
  project: createHostedSiteProjector({ project: PROJECT, componentPack: pinselPack.manifest }),
  validateMarkdown(value) { const issue = checkNoteMarkdown(value)[0]; if(issue) throw new HostedContentError("invalid-value", issue.message); },
  validateSubmission() { throw new HostedContentError("configuration-required", "Publication is disabled. Capture a snapshot for local build instead."); },
 });
 return { ...service, async execute(actor: HostedActor, request: unknown) {
   const command = request as Partial<HostedCommand> | null;
   if (command && typeof command.operationKey === "string" && await service.readReceipt(actor, command.operationKey)) return service.execute(actor, request);
   if (command && (command.kind === "set-fields" || command.kind === "restore-revision")) {
    const model = PROVIDERS.find(provider => provider.providerId === command.entry?.providerId)?.models.find(model => model.id === command.entry?.modelId);
    const values = command.kind === "restore-revision" && typeof command.revisionId === "string" ? (await service.readRevision(actor, command.revisionId)).values : command.kind === "set-fields" ? command.values : undefined;
    if (model && values && typeof values === "object") for (const [id, value] of Object.entries(values)) {
     const field = model.document.fields.find(field => field.id === id);
     if (field && value !== undefined) { const issue = checkFieldValue(model, field, value); if (issue) throw new HostedContentError("invalid-value", issue.message); }
    }
   }
   return service.execute(actor, request);
 } };
}
