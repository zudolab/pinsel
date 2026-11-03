import { canonicalSerialize, EditorialError, runContentAiOperation, type ContentAiProposer, type ContentAiProposerOutput, type ContentAiStatus, type HostedActor } from "zudo-composer/hosted-content";
import { noteAiService } from "./service";
import { PACK, RENDERER } from "../site/baseline";
import { renderPreviewDocument } from "../preview/preview";
// Local-only entry imports this file. Production has neither a proxy nor an AI identity.
interface LocalAiEnv { PINSEL_AI_ORIGIN?: string; PINSEL_AI_TOKEN?: string; PINSEL_AI_PROVIDER?: string }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function localAiHandler(request: Request, env: Env, actor: HostedActor): Promise<Response | null> {
 const url = new URL(request.url);
 if (url.pathname !== "/api/hosted/ai" && url.pathname !== "/preview/ai-document") return null;
 const settings = env as Env & LocalAiEnv;
 const configured = !!settings.PINSEL_AI_TOKEN && /^http:\/\/127\.0\.0\.1:\d+$/.test(settings.PINSEL_AI_ORIGIN ?? "");
 async function node<T>(path: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  if (!configured) throw new EditorialError("unavailable", "Start pnpm dev:dogfood to enable the local AI host.");
  const response = await fetch(`${settings.PINSEL_AI_ORIGIN}${path}`, { method: payload === undefined ? "GET" : "POST", headers: { authorization: `Bearer ${settings.PINSEL_AI_TOKEN}`, "content-type": "application/json" }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: signal ?? AbortSignal.timeout(5000) });
  if (!response.ok) throw new EditorialError("unavailable", "The selected local provider is unavailable. Saved proposals and receipts remain recoverable.");
  return response.json() as Promise<T>;
 }
 const status = async (): Promise<ContentAiStatus> => {
  if (!configured) return { configured: false };
  try { return await node<ContentAiStatus>("/status"); }
  catch { return { configured: true, provider: "Local Node host", canApply: true, inference: { state: "unavailable", code: "host-unreachable", message: "The selected local AI host is not reachable. Apply/Undo recovery does not require inference." } }; }
 };
 const proposer: ContentAiProposer | null = configured ? { label: settings.PINSEL_AI_PROVIDER === "fake" ? "Fake provider (offline, deterministic)" : settings.PINSEL_AI_PROVIDER ?? "Local provider", propose: input => node<ContentAiProposerOutput>("/propose", { instruction: input.instruction, fields: input.fields }, input.signal) } : null;
 try {
  const local = await noteAiService(env.DB, actor, proposer);
  if (url.pathname === "/preview/ai-document" && request.method === "GET") {
   const preview = await local.preview(url.searchParams.get("proposal") ?? "");
   if (url.searchParams.get("digest") !== preview.snapshot.digest || url.searchParams.get("route") !== preview.route) throw new EditorialError("invalid-request", "Candidate preview identity mismatch");
   return new Response(renderPreviewDocument(preview.snapshot, preview.route), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  if (request.method !== "POST" || url.pathname !== "/api/hosted/ai") return json({ error: { code: "invalid-request", message: "Unsupported AI route" } }, 400);
  const input = await request.json() as { operation: string; payload: unknown };
  if (!input || typeof input.operation !== "string") throw new EditorialError("invalid-request", "Malformed Content-AI request");
  if (input.operation === "content-ai-prepare") {
   const readiness=await status();
   if(!readiness?.configured || readiness.inference?.state!=="ready") throw new EditorialError("unavailable", "Provider is not ready. Check startup/authentication and recheck status. Saved proposals and Undo remain available.");
  }
  if (input.operation === "pinsel-ai-preview") {
   const payload = input.payload as { proposalId?: unknown };
   if (!payload || typeof payload.proposalId !== "string" || Object.keys(payload).length !== 1) throw new EditorialError("invalid-request", "Malformed preview request");
   return json({ ok: true, value: await local.preview(payload.proposalId) });
  }
  if (input.operation === "pinsel-ai-list") {
   const payload = input.payload as { entry?: { providerId: string; modelId: string; recordId: string } };
   if (!payload?.entry || Object.keys(payload).length !== 1) throw new EditorialError("invalid-request", "Malformed proposal list");
   await local.ai.scope(payload.entry);
   const rows = await env.DB.prepare("SELECT record FROM pinsel_ai_proposal WHERE json_extract(record, '$.actorId') = ? AND json_extract(record, '$.owner') = 'pinsel:note-ai:v1' AND json_extract(record, '$.proposal.entry.providerId') = ? AND json_extract(record, '$.proposal.entry.modelId') = 'note' AND json_extract(record, '$.proposal.entry.recordId') = ? ORDER BY rowid DESC LIMIT 30").bind(actor.id, payload.entry.providerId, payload.entry.recordId).all<{ record: string }>();
   return json({ ok: true, value: rows.results.map(row => { const record = JSON.parse(row.record); return { id: record.proposal.id, createdAt: record.proposal.createdAt, summary: record.proposal.summary, provider: record.proposal.provider }; }) });
  }
  if (input.operation === "content-ai-apply") {
   const payload = input.payload as { proposalId?: unknown; renderedIdentity?: unknown };
   if (!payload || typeof payload.proposalId !== "string" || Object.keys(payload).some(key => key !== "proposalId" && key !== "renderedIdentity")) throw new EditorialError("invalid-request", "Malformed Apply request");
   const operation = await local.ai.read({ proposalId: payload.proposalId });
   if (operation.applied) return json(await runContentAiOperation({ status, service: async () => local.ai }, "content-ai-apply", { proposalId: payload.proposalId }));
   const preview = await local.preview(payload.proposalId), snapshot = preview.snapshot;
   const expectedIdentity = { proposalId: payload.proposalId, candidateDigest: preview.candidateDigest, snapshotId: snapshot.id, snapshotDigest: snapshot.digest, draftRevision: snapshot.draftRevision, baseline: snapshot.baseline, definition: snapshot.definition, routeId: preview.route, ...PACK, ...RENDERER };
   if (!payload.renderedIdentity || canonicalSerialize(payload.renderedIdentity) !== canonicalSerialize(expectedIdentity)) throw new EditorialError("invalid-request", "Apply requires the exact Note candidate, route, renderer and definition preview acknowledgement.");
   return json(await runContentAiOperation({ status, service: async () => local.ai }, "content-ai-apply", { proposalId: payload.proposalId, renderedCandidate: preview.candidateDigest }));
  }
  return json(await runContentAiOperation({ status, service: async () => local.ai }, input.operation, input.payload));
 } catch(error) {
  if (error instanceof EditorialError) return json({ ok: false, error: { code: error.code, message: error.message, diagnostics: error.diagnostics } }, 400);
  throw error;
 }
}
