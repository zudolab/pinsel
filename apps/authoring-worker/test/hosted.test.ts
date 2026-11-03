import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { HostedHead, HostedIdentities, HostedReceipt, HostedRevision, HostedSnapshot, HostedState } from "zudo-composer/hosted-content";
import { createApp } from "../src/app";
import { createFixtureIdentity } from "../src/auth/identity";
import { ensureHostedSeeded, PROJECT, PROJECT_ID, serviceFor } from "../src/site/baseline";
import { PinselHostedStorage } from "../src/storage/hosted-storage";
import { renderPreviewDocument } from "../src/preview/preview";
const actor = { id: "editor@test.example" };
const expected = (state: HostedState): HostedIdentities => ({ draftRevision: state.draftRevision, baseline: state.baseline, definition: state.definition });
const ref = (state: HostedState, modelId: string) => { const provider = state.providers.find(provider => provider.entries.some(entry => entry.modelId === modelId))!; return { providerId: provider.providerId, modelId, recordId: provider.entries.find(entry => entry.modelId === modelId)!.id }; };
beforeEach(async () => {
 for (const table of ["pinsel_hosted_receipt","pinsel_hosted_snapshot","pinsel_hosted_revision","pinsel_hosted_publication","pinsel_hosted_head","pinsel_hosted_migration","pinsel_hosted_guard","draft_entries","draft_state","baseline"]) await env.DB.prepare(`DELETE FROM ${table}`).run();
});
describe("Pinsel real D1 hosted content", () => {
 it("edits Note/FAQ/pricing, renders the immutable snapshot and keeps subsequent draft B", async () => {
  let service = await serviceFor(env.DB), state = await service.readState(actor);
  const edits = [["note","note-title","DOGFOOD NOTE"],["faq-item","faq-item-answer","DOGFOOD FAQ"],["course","course-price","¥123,456"]];
  for (const [modelId, fieldId, value] of edits) {
   const result = await service.execute(actor, { kind: "set-fields", operationKey: crypto.randomUUID(), expected: expected(state), entry: ref(state, modelId!), values: { [fieldId!]: value }, clear: [] }); state = result.state;
  }
  const snapshot = (await service.execute(actor, { kind: "capture-snapshot", operationKey: crypto.randomUUID(), expected: expected(state) })).snapshot!;
  expect(snapshot.id).not.toBe(snapshot.digest); expect(typeof snapshot.draftRevision).toBe("string");
  expect(renderPreviewDocument(snapshot, `/notes/${ref(state,"note").recordId}/`)).toContain("DOGFOOD NOTE");
  expect(renderPreviewDocument(snapshot, "/faq/")).toContain("DOGFOOD FAQ");
  expect(renderPreviewDocument(snapshot, "/lessons/")).toContain("¥123,456");
  const changed = await service.execute(actor, { kind:"set-fields",operationKey:crypto.randomUUID(),expected:expected(state),entry:ref(state,"note"),values:{"note-title":"DRAFT B"},clear:[] });
  service = await serviceFor(env.DB); // new service instance sees the same real DB
  expect((await service.readState(actor)).draftRevision).toBe(changed.state.draftRevision);
  expect(renderPreviewDocument(await service.readSnapshot(actor,snapshot.id), `/notes/${ref(state,"note").recordId}/`)).toContain("DOGFOOD NOTE");
  expect(JSON.stringify(await service.readState(actor))).toContain("DRAFT B");
 });
 it("recovers a committed lost response by receipt, guards two-tab conflict and restores history", async () => {
  const service = await serviceFor(env.DB), original = await service.readState(actor), entry = ref(original,"note");
  const command = { kind:"set-fields",operationKey:crypto.randomUUID(),expected:expected(original),entry,values:{"note-title":"FIRST"},clear:[] };
  const first = await service.execute(actor, command);
  expect(await service.execute(actor, command)).toEqual(first);
  expect((await service.readReceipt(actor,command.operationKey))?.result).toEqual(first);
  await expect(service.execute(actor,{...command,operationKey:crypto.randomUUID(),values:{"note-title":"STALE"}})).rejects.toMatchObject({code:"revision-conflict"});
  await expect(service.execute(actor,{...command,values:{"note-title":"REUSED"}})).rejects.toMatchObject({code:"operation-key-reuse"});
  const history = await service.listRevisions(actor,{entry,limit:50});
  expect(history.revisions.length).toBeGreaterThanOrEqual(2);
  const initial = history.revisions.at(-1)!;
  expect(await service.readRevision(actor,initial.id)).toEqual(initial);
  const restored = await service.execute(actor,{kind:"restore-revision",operationKey:crypto.randomUUID(),expected:expected(first.state),entry,revisionId:initial.id});
  expect((await service.readEntry(actor,{entry,perspective:"working"})).values).toEqual(initial.values);
  expect(restored.state.draftRevision).not.toBe(first.state.draftRevision);
  expect((await service.listRevisions(actor,{entry,limit:50})).revisions[0]?.restoredFrom).toBe(initial.id);
 });
 it("rejects protected fields, invalid typed values, malformed commands and publication", async () => {
  const service = await serviceFor(env.DB), state=await service.readState(actor), entry=ref(state,"note");
  const command = {kind:"set-fields",operationKey:crypto.randomUUID(),expected:expected(state),entry,values:{"note-slug":"changed"},clear:[]};
  await expect(service.execute(actor,command)).rejects.toMatchObject({code:"forbidden"});
  await expect(service.execute(actor,{...command,values:{"note-title":42}})).rejects.toMatchObject({code:"invalid-value"});
  await expect(service.execute(actor,{})).rejects.toMatchObject({code:"invalid-request"});
  const snapshot=(await service.execute(actor,{kind:"capture-snapshot",operationKey:crypto.randomUUID(),expected:expected(state)})).snapshot!;
  await expect(service.execute(actor,{kind:"begin-publication",operationKey:crypto.randomUUID(),expected:expected(state),snapshotId:snapshot.id})).rejects.toMatchObject({code:"configuration-required"});
 });
 it("atomically rejects stale/same/missing head, duplicate receipts, snapshots and revision keys", async () => {
  await ensureHostedSeeded(env.DB); const store=new PinselHostedStorage(env.DB), head=await store.readHead();
  const next=():HostedHead=>({...head,version:crypto.randomUUID()});
  expect(await store.commit({expectedVersion:"stale",head:next()})).toBe(false);
  expect(await store.commit({expectedVersion:head.version,head})).toBe(false);
  const receipt:HostedReceipt={actorId:actor.id,operationKey:"key",fingerprint:"digest",result:{state:head.state}};
  const snapshot:HostedSnapshot={...expected(head.state),id:"snapshot",digest:"digest",providers:head.state.providers,assets:[],diagnostics:[],renderData:null};
  const revision:HostedRevision={id:"revision",entry:ref(head.state,"note"),sequence:1,parentId:null,values:{},definition:head.state.definition,createdAt:new Date().toISOString(),actor,source:"test",operation:{kind:"set-fields",key:"key"}};
  let current=next(); expect(await store.commit({expectedVersion:head.version,head:current,receipt,snapshot,revisions:[revision]})).toBe(true);
  for(const extra of [{receipt},{snapshot},{revisions:[revision]},{revisions:[{...revision,id:"another"}]},{revisions:[{...revision,id:"twice",sequence:2},{...revision,id:"twice",sequence:3}]},{revisions:[{...revision,id:"two",sequence:2},{...revision,id:"three",sequence:2}]}]) {
   const proposal={...current,version:crypto.randomUUID()}; expect(await store.commit({expectedVersion:current.version,head:proposal,...extra})).toBe(false); expect(await store.readHead()).toEqual(current);
  }
  expect(await env.DB.prepare("SELECT count(*) AS n FROM pinsel_hosted_guard").first("n")).toBe(0);
  await env.DB.prepare("DELETE FROM pinsel_hosted_head").run(); expect(await store.commit({expectedVersion:current.version,head:next()})).toBe(false);
 });
 it("preserves legacy draft and archive without recycling old receipts", async () => {
  const entries=structuredClone(PROJECT.providers.content[0]!.entries); entries.find(entry=>entry.modelId==="note")!.values["note-title"]="LEGACY USER DRAFT";
  await env.DB.prepare("INSERT INTO draft_state VALUES (?, 9, ?, ?)").bind(PROJECT_ID,"legacy-git",new Date().toISOString()).run();
  await env.DB.batch(entries.map((entry,index)=>env.DB.prepare("INSERT INTO draft_entries VALUES (?, ?, ?, ?, ?)").bind(PROJECT_ID,entry.id,entry.modelId,index,JSON.stringify(entry))));
  await ensureHostedSeeded(env.DB);
  expect(JSON.stringify((await new PinselHostedStorage(env.DB).readHead()).state)).toContain("LEGACY USER DRAFT");
  expect(await env.DB.prepare("SELECT count(*) AS n FROM draft_entries").first("n")).toBe(entries.length);
  expect(await env.DB.prepare("SELECT count(*) AS n FROM pinsel_hosted_receipt").first("n")).toBe(0);
  expect(await env.DB.prepare("SELECT archive FROM pinsel_hosted_migration").first("archive")).toContain("LEGACY USER DRAFT");
 });
 it("requires same-origin JSON for every RPC, including restore",async()=>{
  const app=createApp({identity:createFixtureIdentity(actor.id)});
  const request=(headers:Record<string,string>)=>new Request("http://localhost/api/hosted/rpc",{method:"POST",headers,body:JSON.stringify({method:"readState"})});
  expect((await app.fetch(request({"content-type":"application/json"}),env)).status).toBe(403);
  expect((await app.fetch(request({origin:"http://other","content-type":"application/json"}),env)).status).toBe(403);
  expect((await app.fetch(request({origin:"http://localhost","content-type":"application/json"}),env)).status).toBe(200);
 });
});
