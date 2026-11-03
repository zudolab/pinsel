import { beforeEach, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { createFakeContentAiProposer, type ContentAiProposal, type HostedState } from "zudo-composer/hosted-content";
import { noteAiService } from "../src/ai/service";
import { localAiHandler } from "../src/ai/handler";
import { serviceFor, PACK, RENDERER } from "../src/site/baseline";
import { createApp } from "../src/app";
import { createFixtureIdentity } from "../src/auth/identity";
const actor={id:"ai-editor@example.test"};
const expected=(state:HostedState)=>({draftRevision:state.draftRevision,baseline:state.baseline,definition:state.definition});
const note=(state:HostedState)=>{const provider=state.providers[0]!;const entry=provider.entries.find(entry=>entry.modelId==="note")!;return{providerId:provider.providerId,modelId:"note",recordId:entry.id};};
beforeEach(async()=>{for(const table of ["pinsel_ai_proposal","pinsel_hosted_revision","pinsel_hosted_receipt","pinsel_hosted_snapshot","pinsel_hosted_head","pinsel_hosted_migration"])await env.DB.prepare(`DELETE FROM ${table}`).run();});
async function prepared(){const local=await noteAiService(env.DB,actor,createFakeContentAiProposer()),service=await serviceFor(env.DB),state=await service.readState(actor),entry=note(state);const result=await local.ai.prepare({entry,instruction:"短く整理"});if(result.status!=="proposed")throw new Error("Expected proposal");return{local,service,state,entry,proposal:result.proposal};}
it("prepares only title/body without draft mutation, renders exact candidate, applies and undoes through the same D1",async()=>{
 const {local,service,state,entry,proposal}=await prepared();expect((await service.readState(actor)).draftRevision).toBe(state.draftRevision);expect(Object.keys(proposal.values).sort()).toEqual(["note-body","note-title"]);
 const preview=await local.preview(proposal.id);expect(JSON.stringify(preview.snapshot.renderData)).toContain("短く整理");expect(preview.snapshot.digest).not.toBe(proposal.candidateDigest);
 const applied=await local.ai.apply({proposalId:proposal.id,renderedCandidate:proposal.candidateDigest});const after=await service.readState(actor);
 for(const provider of state.providers)for(const original of provider.entries){const current=after.providers.find(item=>item.providerId===provider.providerId)!.entries.find(item=>item.modelId===original.modelId&&item.id===original.id)!;
  if(original.modelId==="note"&&original.id===entry.recordId){for(const key of Object.keys(original.values).filter(key=>!["note-title","note-body"].includes(key)))expect(current.values[key]).toEqual(original.values[key]);}else expect(current).toEqual(original);
 }
 expect((await service.readRevision(actor,applied.receipt.revisionId!)).source).toBe("content-ai");
 const restarted=await noteAiService(env.DB,actor,null);expect((await restarted.ai.apply({proposalId:proposal.id})).recovered).toBe(true);
 expect((await restarted.ai.read({proposalId:proposal.id})).applied?.operationKey).toBe(proposal.operationKey);
 const undo=await restarted.ai.undo({proposalId:proposal.id});expect(undo.recovered).toBe(false);expect((await restarted.ai.undo({proposalId:proposal.id})).recovered).toBe(true);
 expect((await service.readEntry(actor,{entry,perspective:"working"})).values).toEqual(state.providers[0]!.entries.find(item=>item.id===entry.recordId)!.values);
});
it("refuses stale Apply and guarded Undo after newer manual edits",async()=>{
 const {local,service,state,entry,proposal}=await prepared();
 const changed=await service.execute(actor,{kind:"set-fields",operationKey:crypto.randomUUID(),expected:expected(state),entry,values:{"note-title":"manual"},clear:[]});
 await expect(local.ai.apply({proposalId:proposal.id,renderedCandidate:proposal.candidateDigest})).rejects.toMatchObject({code:"revision-conflict"});
 const second=await local.ai.prepare({entry,instruction:"二案"});if(second.status!=="proposed")throw new Error("proposal");await local.ai.apply({proposalId:second.proposal.id,renderedCandidate:second.proposal.candidateDigest});
 const after=await service.readState(actor);await service.execute(actor,{kind:"set-fields",operationKey:crypto.randomUUID(),expected:expected(after),entry,values:{"note-description":"new manual description"},clear:[]});
 await expect(local.ai.undo({proposalId:second.proposal.id})).rejects.toMatchObject({code:"revision-conflict"});expect(changed.state.draftRevision).not.toBe(state.draftRevision);
});
it("rejects non-Note scope, provider extra fields, actor mismatch and missing rendered proof",async()=>{
 const {local,state,proposal}=await prepared();await expect(local.ai.scope({...note(state),modelId:"faq-item"})).rejects.toMatchObject({code:"forbidden"});await expect(local.ai.apply({proposalId:proposal.id})).rejects.toMatchObject({code:"invalid-request"});
 const other=await noteAiService(env.DB,{id:"other@example.test"},null);await expect(other.ai.read({proposalId:proposal.id})).rejects.toMatchObject({code:"not-found"});
 const malicious=await noteAiService(env.DB,actor,{label:"bad",async propose(){return{kind:"proposal",values:{description:"no"},summary:"bad"};}});await expect(malicious.ai.prepare({entry:note(state),instruction:"change"})).rejects.toMatchObject({code:"forbidden"});
});
it("HTTP Apply requires matching candidate/route/renderer binding; recovery works without provider or new render",async()=>{
 const {local,proposal}=await prepared();const preview=await local.preview(proposal.id),snapshot=preview.snapshot;
 const identity={proposalId:proposal.id,candidateDigest:preview.candidateDigest,snapshotId:snapshot.id,snapshotDigest:snapshot.digest,draftRevision:snapshot.draftRevision,baseline:snapshot.baseline,definition:snapshot.definition,routeId:preview.route,...PACK,...RENDERER};
 const app=createApp({identity:createFixtureIdentity(actor.id),localAi:localAiHandler});
 const call=async(payload:unknown)=>app.fetch(new Request("http://localhost/api/hosted/ai",{method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify({operation:"content-ai-apply",payload})}),env);
 expect((await call({proposalId:proposal.id,renderedCandidate:proposal.candidateDigest})).status).toBe(400);
 expect((await call({proposalId:proposal.id,renderedIdentity:{...identity,routeId:"/"}})).status).toBe(400);
 expect((await call({proposalId:proposal.id,renderedIdentity:identity})).status).toBe(200);
 const recovered=await call({proposalId:proposal.id});expect(recovered.status).toBe(200);expect(await recovered.json()).toMatchObject({ok:true,value:{recovered:true}});
});
