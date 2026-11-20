import assert from 'node:assert/strict';
import {join} from 'node:path';
import {isDeepStrictEqual as equal} from 'node:util';
import {inputHash} from '../families/frozen-inputs.mjs';
import {assertContentReceipt} from './retained-receipts.mjs';
import {auditPhase} from './audit.mjs';
import {metadataRecoveryStatus,assertMetadataReadback,verifyMetadataRecovery} from './metadata-recovery.mjs';
export const committedStatus='COMMITTED_METADATA_RECONCILED_RESTART_NOT_YET_VERIFIED';
export const copyFieldIds=['page-copy-route','page-copy-meta-title','page-copy-meta-description','page-copy-order'];
/** Files a reconciliation reads from the original held attempt; every one is hash-bound. */
export const originalInputs=['HELD.json','execution.json','accepted-inputs.json','before.json','after.json','events.ndjson'];
/** Recovery source bytes that the reviewed freeze binds, relative to this tool checkout. */
export const recoverySources=['tests/native-authoring/static/phase08-recovery.mjs','tests/native-authoring/static/run-phase08-recovery.mjs','tests/native-authoring/static/phase08-recovery-browser.mjs','tests/native-authoring/static/metadata-recovery.mjs','tests/native-authoring/static/retained-receipts.mjs','tests/native-authoring/static/audit.mjs','tests/native-authoring/static/copy-driver.mjs','tests/native-authoring/routes.mjs','tests/native-authoring/families/readonly-proof.mjs','tests/native-authoring/families/composition-output.mjs','tests/native-authoring/families/original-request.mjs'];
const writeEvidence=new Set(['create-request','create-response','draft-save-before','draft-save-after','copy-fields-admitted']);
const writeFailure=new Set(['draft-save-uncertain','draft-write-refused','copy-fields-held','foreign-write-refused','request-before-dispatch','composition-put-before-dispatch']);
/** Offline: the held phase08 attempt committed exactly create+4 acknowledged saves and lost only a derived read. */
export async function reconcileOriginal({original,bytes,json,events}){
 const inputHashes={};for(const name of originalInputs)inputHashes[join(original,name)]=inputHash(await bytes(join(original,name)));
 const held=await json(join(original,'HELD.json'));assert.equal(held.qualification,'No automatic replay, inverse or cleanup.');assert(typeof held.error==='string'&&held.error);
 const execution=await json(join(original,'execution.json'));assert.deepEqual(Object.keys(execution).sort(),['bundleHash','composer','installed','port','source','stage']);
 assert.equal(inputHashes[join(original,'accepted-inputs.json')],execution.bundleHash,'Original accepted bundle differs from its execution');
 const accepted=await json(join(original,'accepted-inputs.json')),before=await json(join(original,'before.json')),after=await json(join(original,'after.json')),journal=await events(join(original,'events.ndjson'));
 const intent=accepted.intent;assert.equal(intent.kind,'copy-create');assert.equal(intent.sequence,8);assert.deepEqual(accepted.snapshot,before);assert.equal(intent.captureDigest,before.digest);
 const begins=journal.filter(e=>e.phase==='begin');assert.equal(begins.length,1);assert.deepEqual(begins[0].intent,intent);
 assert(journal.some(e=>e.phase==='held'),'Original held journal required');assert(!journal.some(e=>writeFailure.has(e.phase)),'Original contains an unacknowledged or refused canonical write');
 assert(!journal.some(e=>e.phase==='ui-complete-offline-audit-required'),'Original completed; not a held attempt');
 const creates=journal.filter(e=>e.phase==='create-request');assert.equal(creates.length,1);const ref=creates[0].ref;
 const acknowledged=[];let pending;for(const e of journal){if(e.phase==='draft-save-before'){assert(!pending);pending=e;}else if(e.phase==='draft-save-after'){assert(pending&&e.status===200&&e.body?.ok===true,'Unacknowledged draft save');acknowledged.push(pending.input.record);pending=undefined;}}assert(!pending,'Draft save outcome uncertain');assert.equal(acknowledged.length,4);
 const record={...acknowledged.at(-1),generation:before.tokens.content+acknowledged.length+1},result={domain:'content',ref,record,commitCount:acknowledged.length+1};
 assert.deepEqual(record.values,{'page-copy-route':intent.route,'page-copy-meta-title':intent.title,'page-copy-meta-description':'Independent static page authoring acceptance','page-copy-order':99});
 assertContentReceipt(journal,result,before);auditPhase(before,after,result);for(const key of ['workspaceId','schemaVersion','componentPack','renderer'])assert.deepEqual(after[key],before[key]);
 return{status:committedStatus,kind:'copy-create',sequence:8,originalFailure:original,beforeDigest:before.digest,afterDigest:after.digest,result,resources:{...intent.resources,copy:ref},inputHashes,acknowledgedWrites:journal.filter(e=>writeEvidence.has(e.phase)).length};
}
/** The reviewer signs this map; the runner refuses on any byte drift, including its own source. */
export function freezeManifest({committed,committedPath,committedBytes,sources}){
 const frozen={...committed.inputHashes,[committedPath]:inputHash(committedBytes)};for(const[path,hash]of Object.entries(sources)){assert(path.startsWith('/'));assert(!Object.hasOwn(frozen,path));frozen[path]=hash;}return frozen;
}
export async function assertFrozen(frozen,bytes){for(const[path,hash]of Object.entries(frozen))assert.equal(inputHash(await bytes(path)),hash,`Frozen recovery input/source changed: ${path}`);}
export function recoveryBundle({after,committed,frozen}){return{snapshot:after,expected:{ref:committed.result.ref,record:committed.result.record,resources:committed.resources},hashes:frozen};}
/** Same consumer checkout, Composer, stage and installed roots as the held attempt; the recovery tool may differ only by frozen bytes. */
export function assertSameInstallation(originalExecution,{head,composer,stage,installation}){
 assert.equal(head,originalExecution.source.head,'Recovery must restart the original consumer source');assert.equal(composer,originalExecution.composer);assert.equal(stage,originalExecution.stage);
 assert.deepEqual(installation.installedRoots,originalExecution.installed.installedRoots);assert.equal(installation.installedLockSha256,originalExecution.installed.installedLockSha256);
}
export function recoveryUi({expected,entryReads,fieldsVerified}){
 assert(entryReads>0,'Exact Content get-entry required');assert.deepEqual([...fieldsVerified].sort(),[...copyFieldIds].sort());assert.deepEqual(Object.keys(expected.record.values).sort(),[...copyFieldIds].sort());
 return{kind:'static08-readonly-recovery',ref:expected.ref,record:expected.record,entryReads,fieldsVerified:[...fieldsVerified],freshBrowser:true};
}
/** Browser-side classification for an observed Content read; any other record or status holds. */
export function exactEntryRead(expected,workspaceId,{endpoint,operation,workspace,input,status,body}){
 if(endpoint!=='/__zudo_composer_content_provider'||operation!=='get-entry'||input?.id!==expected.ref.recordId)return false;
 assert.equal(workspace,workspaceId);assert.deepEqual(input,{id:expected.ref.recordId});assert.equal(status,200);assert.equal(body?.ok,true);assert.equal(body.result?.status,'loaded');assert.deepEqual(body.result.record,expected.record,'Recovered Content record differs from reconciled commit');return true;
}
export function recoveredProof({committed,dir,manifestHash,bundleHash,ui}){
 return{...committed,status:metadataRecoveryStatus,originalStatus:'FAIL',readonlyRecovery:dir,afterCapture:join(dir,'after.json'),recovery:{manifestHash,bundleHash,ui}};
}
/** Self-check with the retained validator before the proof is written; a status label is never enough. */
export async function verifyRecovery({proofPath,proof,freezePath,original,readback,bytes,json,events}){
 const before=await json(join(original,'before.json')),after=await json(proof.afterCapture),journal=await events(join(original,'events.ndjson'));
 assertMetadataReadback(readback,{ref:proof.result.ref,record:proof.result.record},after.workspaceId,proof.recovery.ui);
 return verifyMetadataRecovery({index:7,proofPath,proof,manifest:{recoveryFreezeManifests:{[proofPath]:freezePath}},before,after,original,journal,bytes,json,events});
}
export function noCanonicalWrites(readback){return!readback.some(e=>/held|refused|uncertain/.test(e.phase)||equal(e.phase,'request-before-dispatch'));}
