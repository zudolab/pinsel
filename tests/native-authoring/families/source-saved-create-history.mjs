import{assertHistoricalFamilySource}from'./installation-supplement-loader.mjs';
import{assertReviewedHarnessDelta}from'./source-rebind-core.mjs';
import{assertGitModes}from'./source-rebind-loader.mjs';
import{auditDeniedTerminalReads}from'./denied-terminal-reads.mjs';
import assert from'node:assert/strict';import{join,dirname}from'node:path';
import{inputHash}from'./expected-hashes.mjs';import{nextFamilyIntent}from'./sequence-core.mjs';
import{validateSavedMapping,mappingRecoverySequenceProof}from'./mapping-recovery.mjs';
import{auditOriginalCompositionReads}from'../header/saved-reference.mjs';
import{assertSuccessorProvenance}from'./source-successor-history.mjs';
export async function loadPendingSavedCreate({manifestPath,parent,oldInstallation,read,json}){
 const paths=await json(manifestPath);assert.deepEqual(Object.keys(paths).sort(),['after','before','bundle','bundleHash','events','extra','log','provenance']);assert(Array.isArray(paths.extra)&&new Set(paths.extra).size===paths.extra.length);const evidence={paths,hashes:{},originalInstallation:oldInstallation};for(const key of ['before','after','bundle','bundleHash','events','provenance']){const b=await read(paths[key]);evidence.hashes[paths[key]]=inputHash(b);evidence[key]=key==='events'?b.toString().trim().split('\n').map(JSON.parse):JSON.parse(b);}
 for(const[p,h]of Object.entries(evidence.bundle.hashes)){assert.equal(inputHash(await read(p)),h);evidence.hashes[p]=h;}assert((await read(paths.log)).toString().includes('verdict=FAIL exit=1'));for(const p of paths.extra)await read(p);
 assert.deepEqual(evidence.before,parent.snapshot);const expected=nextFamilyIntent({config:parent.config,snapshot:parent.snapshot,history:parent.history,expectedActive:null,capturePath:evidence.bundle.intent.capturePath,installationBridge:parent.originalBridge,installationSupplement:parent.supplement,sourceRebind:parent.rebind,sourceSuccessor:parent.successor,sourceCreate:parent.createHandoff});assert.deepEqual(evidence.bundle.intent,expected);
 const pending=validateSavedMapping(evidence.after,evidence);assert.equal(pending.failureKind,'saved-create-before-reload-quiescence');return{...parent,pending,snapshot:evidence.after,pendingEvidence:evidence};
}
export async function loadSavedCreateRestart({recoveryPath,chain,installation,read,json,repo,reviewedRestart}){
 const recovery=await json(recoveryPath),dir=dirname(recoveryPath),restart=await json(join(dir,'proof.json')),bundlePath=join(dir,'accepted-inputs.json'),bundle=await json(bundlePath),before=await json(join(dir,'before.json')),after=await json(join(dir,'after.json')),provenance=await json(join(dir,'runtime-provenance.json')),events=(await read(join(dir,'events.ndjson'))).toString().trim().split('\n').map(JSON.parse);
 assert.equal(recoveryPath,join(dir,'recovery-sequence-proof.json'));assertSavedCreateCapturePath(restart,dir);assert.deepEqual(before,chain.snapshot);assert.deepEqual(after,before);if(reviewedRestart){await assertHistoricalFamilySource(repo,{source:restart.source,composer:installation.composer});assertReviewedHarnessDelta(restart.source,installation.source,reviewedRestart);await assertGitModes(repo,restart.source.head,installation.source.head,reviewedRestart);}else assert.deepEqual(restart.source,installation.source);assert.equal(restart.intent.kind,'mapping-saved-create');assert.deepEqual(bundle.intent,restart.intent);assert.equal(restart.bundleHash,inputHash(await read(bundlePath)));for(const[p,h]of Object.entries(bundle.hashes))assert.equal(inputHash(await read(p)),h);assert.deepEqual(restart.inputHashes,bundle.hashes);assertSuccessorProvenance(provenance,bundle,before,{...installation,source:restart.source});
 // Re-audit the saved transaction frozen by this actual read-only attempt, not a caller label.
 const saved=validateSavedMapping(before,bundle.savedReference);const {evidenceHashes:originalHashes,...original}=chain.pending,{evidenceHashes:recoveryHashes,...recovered}=saved;assert.deepEqual(recovered,original);for(const[p,h]of Object.entries(originalHashes))assert.equal(recoveryHashes[p],h);assert.deepEqual(recovery,mappingRecoverySequenceProof(saved,restart));assert.deepEqual(restart.result.savedMapping,saved);assert.equal(restart.result.publicRecordVerified,true);assertSavedCreateRestartReads(before,saved,events);
 return{recovery,restart,recoveryPath,pending:saved};
}
export function assertSavedCreateRestartReads(before,saved,events){
 auditOriginalCompositionReads(before,events);const deliberateFailures=auditDeniedTerminalReads(events);
 assert(!events.some(e=>['request-before-dispatch','request-response','unexpected-refused'].includes(e.phase)||(/held|failed|uncertain|cleanup-error/.test(e.phase)&&!deliberateFailures.has(e))||e.phase.startsWith('composition-put')));
 const id=saved.result.record.id;assert(events.some(e=>e.phase==='post-reload-public-record-response'&&e.domain==='mappings'&&e.workspaceId===before.workspaceId&&e.ref?.providerId==='mapping-filesystem'&&e.ref.recordId===id&&e.status===200&&e.body?.ok===true&&e.body.result?.status==='loaded'&&JSON.stringify(e.body.result.record)===JSON.stringify(saved.result.record)));
 assert(events.some(e=>e.phase==='browser-quiescence-settled'&&e.boundary==='before-recovered-mapping-reload'&&e.readiness.pending===0&&e.readiness.outstanding===0));assert(events.some(e=>e.phase==='terminal-read-settlement-complete'&&e.state.pending===0&&e.state.challenges===0&&e.state.busy===0));
}

export function assertSavedCreateCapturePath(restart,dir){assert.equal(restart.afterCapture,join(dir,'after.json'),'Accepted recovery capture must be the frozen actual after file');}
