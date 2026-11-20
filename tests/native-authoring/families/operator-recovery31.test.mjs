import { test } from 'vitest';
import assert from 'node:assert/strict';
import { RECOVERY31, assertCompositionRecoveryIdentity, validateOperatorRecovery31 } from './operator-recovery31.mjs';
import { syntheticRecovery31 } from './fixtures/synthetic-recovery.mjs';

// Synthetic, in-memory evidence only. The historical phase31 originals are checked by
// historical-evidence.test.mjs when PINSEL_HISTORICAL_EVIDENCE_ROOT is set.
const validate = built => validateOperatorRecovery31({ proof: built.proof, previous: built.previous, history: built.history, loaded: built.loaded, read: built.read, json: built.json });
const writeOf = (parts, n) => parts.events.filter(event => event.phase === 'composition-put-before-dispatch')[n];

test('index 31 accepts the saved TOC number and refuses a widened or replayed failure', async () => {
  const intact = syntheticRecovery31();
  assert.equal(intact.proof.status, RECOVERY31);
  assertCompositionRecoveryIdentity(intact.proof, intact.history[30], intact.loaded.continuation.descriptor);
  const readback = await validate(intact);
  assert.equal(readback.digest, 'synthetic-digest-after-31');
  const wrongIndex = structuredClone(intact.proof);
  wrongIndex.intent.sequence.index = 30;
  assert.throws(() => assertCompositionRecoveryIdentity(wrongIndex, intact.history[30], intact.loaded.continuation.descriptor));
  const changed = syntheticRecovery31(parts => { writeOf(parts, 1).input.record.document.root[0].props.number = 11; });
  await assert.rejects(validate(changed));
  const missing = syntheticRecovery31(parts => { parts.events = parts.events.filter(event => event.phase !== 'held'); });
  assert.equal(missing.proof.originalFailure, intact.proof.originalFailure);
  await assert.rejects(validate(missing));
});

test('index 31 refuses structural identity changes', () => {
  const intact = syntheticRecovery31();
  const descriptor = intact.loaded.continuation.descriptor;
  const variants = [
    proof => { proof.status = 'SYNTHETIC_OTHER_STATUS'; },
    proof => { proof.originalFailure = 'synthetic other failure'; },
    proof => { proof.extra = true; },
    proof => { proof.intent.sequence.step = 'synthetic-step'; },
    proof => { proof.intent.sequence.total = 44; },
    proof => { proof.intent.action.value = 998; },
    proof => { proof.intent.document.root[0].props.number = 998; },
    proof => { proof.result.record.document.root[0].props.number = 998; },
    proof => { proof.intent.familyContinuation = { synthetic: 'other' }; },
    proof => { proof.intent.captureDigest = 'synthetic-other'; },
    proof => { proof.afterCapture = proof.evidence.originalAfter; },
    proof => { proof.evidence.readbackCapture = proof.evidence.originalAfter; proof.afterCapture = proof.evidence.originalAfter; },
    proof => { delete proof.evidence.originalTrace; },
  ];
  for (const [index, variant] of variants.entries()) {
    const proof = structuredClone(intact.proof);
    variant(proof);
    assert.throws(() => assertCompositionRecoveryIdentity(proof, intact.history[30], descriptor), undefined, `variant ${index}`);
  }
  assert.throws(() => assertCompositionRecoveryIdentity(intact.proof, { afterDigest: 'synthetic-other' }, descriptor));
});

test('index 31 refuses hash, sequence, replay, ownership and saved-state changes', async () => {
  const intact = syntheticRecovery31();
  await assert.rejects(validateOperatorRecovery31({ ...intact, history: intact.history.slice(0, 30) }));
  const previousChanged = structuredClone(intact.previous);
  previousChanged.tokens.content += 1;
  await assert.rejects(validateOperatorRecovery31({ ...intact, previous: previousChanged }));
  const historyDigest = structuredClone(intact.history);
  historyDigest[30] = { afterDigest: 'synthetic-other' };
  await assert.rejects(validateOperatorRecovery31({ ...intact, history: historyDigest }));
  const afterDigest = structuredClone(intact.proof);
  afterDigest.afterDigest = 'synthetic-other';
  await assert.rejects(validateOperatorRecovery31({ ...intact, proof: afterDigest }));
  const cases = {
    readbackDiffers: parts => { parts.readback.digest = 'synthetic-readback-differs'; },
    thirdWrite: parts => { parts.events.splice(4, 0, structuredClone(parts.events[2]), structuredClone(parts.events[3])); },
    singleWrite: parts => { parts.events.splice(2, 2); },
    firstIsContinuation: parts => { writeOf(parts, 0).continuation = true; },
    firstHasOutputs: parts => { writeOf(parts, 0).input.outputsById = { 'synthetic-output': 'x' }; },
    firstResponseSaved: parts => { parts.events[1].body = { ok: true }; },
    secondResponseFailed: parts => { parts.events[3].status = 409; },
    notSaved: parts => { parts.events[3].body.result.canonical.status = 'draft'; },
    secondHeld: parts => { parts.events.push({ phase: 'held', error: 'synthetic second hold' }); },
    otherHeldError: parts => { parts.events[4].error = 'synthetic other error'; },
    reloadSettled: parts => { parts.events.push({ phase: 'browser-quiescence-settled', boundary: 'after-family-reload' }); },
    postReloadRead: parts => { parts.events.push({ phase: 'post-reload-public-record-response' }); },
    otherOwner: parts => { parts.intent.owner.recordId = 'synthetic-zz-other'; parts.bundle.intent.owner.recordId = 'synthetic-zz-other'; },
    staleUpdatedAt: parts => { for (const n of [0, 1]) writeOf(parts, n).input.record.updatedAt = '2025-01-01T00:00:00.000Z'; },
    extraFieldWritten: parts => { for (const n of [0, 1]) writeOf(parts, n).input.record.document.name = 'Synthetic renamed'; },
    readbackNotSaved: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.project.providers.compositions[0].records[0].document.root[0].props.number = 1; },
    unrelatedRecordChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.project.providers.compositions[0].records[1].document.name = 'synthetic drift'; },
    unrelatedTokenChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.tokens.mappings += 1; },
    tokenNotAdvanced: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.tokens.compositions -= 1; },
    publicFilesChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.publicFiles.push('synthetic-extra.html'); },
    bundleSnapshot: parts => { parts.bundle.snapshot.tokens.content += 1; },
    bundleIntent: parts => { parts.bundle.intent.title = 'synthetic'; },
    beforeWorkspaceTokenDrift: parts => { parts.before.tokens.workspace += 1; },
    shutdownPid: parts => { parts.shutdown.pid = 4243; },
    shutdownTrace: parts => { parts.trace[1].message.port = 4209; parts.shutdown.trace[1].message.port = 4209; },
    shutdownLease: parts => { parts.shutdown.lease = 'present'; },
  };
  for (const [name, edit] of Object.entries(cases)) await assert.rejects(validate(syntheticRecovery31(edit)), undefined, name);
});
