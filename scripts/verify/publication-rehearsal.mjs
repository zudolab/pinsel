// Local immutable snapshot rehearsal. No Git writes, deploy, publisher or remote D1.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createHarness, migrate, prerequisites, startWorker, workerConfig } from "./local-harness.mjs";
const root = path.resolve(import.meta.dirname,"../..");
const reportIndex=process.argv.indexOf("--report");
const h=await createHarness("publication",path.resolve(root,reportIndex<0?".reports/publication-rehearsal.json":(process.argv[reportIndex+1] ?? ".reports/publication-rehearsal.json")));
const persist=path.join(h.work,"d1");
/** @param {string} probe */
const result=probe=>{h.report.results.push({probe,ok:true});console.log(`PASS ${probe}`);};
let error;
try {
 await prerequisites(root);
 const config=await workerConfig(root,path.join(h.work,"config"),{fixture:true});
 await migrate(h,root,config,persist);
 let worker=await startWorker(h,root,config,persist,{failStartup:process.argv.includes("--fail-startup")});
 /** @param {string} method @param {unknown} [argument] @returns {Promise<any>} */
 async function rpc(method,argument){const reply=await h.request(`${worker.origin}/api/hosted/rpc`,{method:"POST",headers:{origin:worker.origin,"content-type":"application/json"},body:JSON.stringify({method,argument})});assert.equal(reply.status,200,reply.body.slice(0,200));return JSON.parse(reply.body);}
 /** @param {any} state */
 const identities=state=>({draftRevision:state.draftRevision,baseline:state.baseline,definition:state.definition});
 let state=await rpc("readState");
 const provider=state.providers[0], note=provider.entries.find((/** @type {any} */ entry)=>entry.modelId==="note");
 const entry={providerId:provider.providerId,modelId:"note",recordId:note.id};
 /** @param {string} title */
 const change=async title=>{state=(await rpc("execute",{kind:"set-fields",operationKey:randomUUID(),expected:identities(state),entry,values:{"note-title":title},clear:[]})).state;};
 await change("Snapshot A rehearsal");
 const snapshot=(await rpc("execute",{kind:"capture-snapshot",operationKey:randomUUID(),expected:identities(state)})).snapshot;
 const captured=JSON.stringify(snapshot), file=path.join(h.work,"snapshot-A.json");await writeFile(file,captured);
 await change("Retained draft B rehearsal"); const revisionB=state.draftRevision;
 await worker.stop();
 await h.run("pnpm",["build:snapshot","--",file],{cwd:root,timeout:180000});
 const output=path.join(root,".dogfood/builds",snapshot.id);
 assert.match(await readFile(path.join(output,"notes",note.id,"index.html"),"utf8"),/Snapshot A rehearsal/);
 result("snapshot A builds immutable local HTML through the shared renderer");
 worker=await startWorker(h,root,config,persist);
 const restarted=await rpc("readState");assert.equal(restarted.draftRevision,revisionB);assert.equal(restarted.providers[0].entries.find((/** @type {any} */ item)=>item.id===note.id).values["note-title"],"Retained draft B rehearsal");
 result("real Worker stop/build/restart preserves later draft B in the same local D1");
 const reread=await h.request(`${worker.origin}/api/hosted/snapshot?id=${snapshot.id}`);assert.equal(JSON.stringify(JSON.parse(reread.body)),captured);
 result("snapshot ID and digest retain the exact A payload after restart");
 h.report.snapshot={id:snapshot.id,digest:snapshot.digest,revisionA:snapshot.draftRevision,revisionB,definition:snapshot.definition};
 await worker.stop();
} catch(reason){error=reason;}
await h.finish(error);
