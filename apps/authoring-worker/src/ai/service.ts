import { canonicalSerialize, createContentAiService, createHostedContentEditorial, createHostedSiteProjector, EditorialError, type ContentAiProposalRecord, type ContentAiProposalStore, type ContentAiProposer, type ContentAiService, type HostedActor, type HostedIdentities, type HostedSnapshot } from "zudo-composer/hosted-content";
import { pinselPack } from "@pinsel/ui";
import { digest, PROJECT, serviceFor } from "../site/baseline";
const owner = "pinsel:note-ai:v1";
export async function noteAiService(db: D1Database, actor: HostedActor, proposer: ContentAiProposer | null) {
 const service = await serviceFor(db, "content-ai");
 const store: ContentAiProposalStore = {
  async create(record) {
   const state = await service.readState(actor), { proposal } = record;
   const expected: HostedIdentities = { draftRevision: state.draftRevision, baseline: state.baseline, definition: state.definition };
   if (canonicalSerialize(expected) !== proposal.expected) throw new EditorialError("revision-conflict", "Content changed while preparing the proposal. Prepare it again.");
   const providers = structuredClone(state.providers);
   const target = providers.find(provider => provider.providerId === proposal.entry.providerId)?.entries.find(entry => entry.modelId === "note" && entry.id === proposal.entry.recordId);
   if (!target) throw new EditorialError("forbidden", "Only existing Note title/body are supported.");
   target.values = structuredClone(proposal.candidate) as typeof target.values;
   for (const provider of providers) for (const entry of provider.entries) entry.lifecycle = "published";
   const assets: HostedSnapshot["assets"] = [];
   const renderData = await createHostedSiteProjector({ project: PROJECT, componentPack: pinselPack.manifest })(providers, assets);
   if (!renderData || typeof renderData !== "object" || Array.isArray(renderData) || !("status" in renderData) || renderData.status !== "ready") throw new EditorialError("invalid-value", "Candidate cannot be rendered by this site.");
   const snapshot: HostedSnapshot = { ...expected, id: `ai-${proposal.id}`, digest: await digest(canonicalSerialize({ providers, assets, renderData })), providers, assets, diagnostics: [], renderData };
   await db.prepare("INSERT INTO pinsel_ai_proposal VALUES (?, ?, ?)").bind(proposal.id, JSON.stringify(record), JSON.stringify(snapshot)).run();
  },
  async read(id) { const row = await db.prepare("SELECT record FROM pinsel_ai_proposal WHERE id = ?").bind(id).first<{ record: string }>(); return row ? JSON.parse(row.record) as ContentAiProposalRecord : null; },
 };
 const ai = createContentAiService({ actor, owner, proposer, store, createId: () => crypto.randomUUID(), boundary: provenance => createHostedContentEditorial({ provenance, service: () => service }) });
 const checkNote = (modelId: string) => { if (modelId !== "note") throw new EditorialError("forbidden", "Only Note title/body are supported by Content-AI."); };
 const bounded: ContentAiService = { ...ai,
  async scope(entry) { checkNote(entry.modelId); return ai.scope(entry); },
  async prepare(request) { checkNote(request.entry.modelId); return ai.prepare(request); },
 };
 return { ai: bounded, async preview(id: string) {
  const operation = await ai.read({ proposalId: id }); // authenticates owner/actor first
  const row = await db.prepare("SELECT preview FROM pinsel_ai_proposal WHERE id = ?").bind(id).first<{ preview: string }>();
  if (!row) throw new EditorialError("not-found", "Candidate preview is unavailable");
  return { snapshot: JSON.parse(row.preview) as HostedSnapshot, candidateDigest: operation.proposal.candidateDigest, route: `/notes/${operation.proposal.entry.recordId}/` };
 } };
}
