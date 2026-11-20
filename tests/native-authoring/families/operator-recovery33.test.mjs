import { test } from 'vitest';
import assert from 'node:assert/strict';
import { RECOVERY33, assertBindingRecoveryIdentity, validateOperatorRecovery33 } from './operator-recovery33.mjs';
import { syntheticRecovery33 } from './fixtures/synthetic-recovery.mjs';

// Synthetic, in-memory evidence only. The historical phase33 originals are checked by
// historical-evidence.test.mjs when PINSEL_HISTORICAL_EVIDENCE_ROOT is set.
const validate = built => validateOperatorRecovery33({ proof: built.proof, previous: built.previous, history: built.history, loaded: built.loaded, read: built.read, json: built.json });
const lastBinding = record => record.document.bindings.at(-1);

test('index 33 accepts the saved TOC label binding and refuses a second write', async () => {
  const intact = syntheticRecovery33();
  assert.equal(intact.proof.status, RECOVERY33);
  assertBindingRecoveryIdentity(intact.proof, intact.history[32], intact.loaded.continuation.descriptor);
  const readback = await validate(intact);
  assert.equal(readback.digest, 'synthetic-digest-after-33');
  const wrong = structuredClone(intact.proof);
  wrong.intent.sequence.index = 34;
  assert.throws(() => assertBindingRecoveryIdentity(wrong, intact.history[32], intact.loaded.continuation.descriptor));
  const extra = syntheticRecovery33(parts => { parts.events.push(structuredClone(parts.events.find(event => event.phase === 'request-before-dispatch'))); });
  await assert.rejects(validate(extra));
});

test('index 33 refuses structural identity changes', () => {
  const intact = syntheticRecovery33();
  const descriptor = intact.loaded.continuation.descriptor;
  const variants = [
    proof => { proof.status = 'SYNTHETIC_OTHER_STATUS'; },
    proof => { proof.originalFailure = 'synthetic other failure'; },
    proof => { proof.recoveryKind = 'synthetic-kind'; },
    proof => { proof.domain = 'compositions'; },
    proof => { proof.intent.kind = 'record-edit'; },
    proof => { proof.intent.sequence.step = 'synthetic-step'; },
    proof => { proof.intent.fieldId = 'synthetic-field'; },
    proof => { proof.intent.target.prop = 'title'; },
    proof => { lastBinding(proof.result.record).sourceFieldId = 'synthetic-field'; },
    proof => { lastBinding(proof.result.record).target.prop = 'title'; },
    proof => { proof.intent.familyContinuation = { synthetic: 'other' }; },
    proof => { proof.intent.captureDigest = 'synthetic-other'; },
    proof => { proof.evidence.readbackCapture = proof.evidence.originalAfter; proof.afterCapture = proof.evidence.originalAfter; },
    proof => { proof.evidence.extra = '/synthetic-evidence/extra.json'; },
  ];
  for (const [index, variant] of variants.entries()) {
    const proof = structuredClone(intact.proof);
    variant(proof);
    assert.throws(() => assertBindingRecoveryIdentity(proof, intact.history[32], descriptor), undefined, `variant ${index}`);
  }
  assert.throws(() => assertBindingRecoveryIdentity(intact.proof, { afterDigest: 'synthetic-other' }, descriptor));
});

test('index 33 refuses hash, sequence, replay, ownership and saved-state changes', async () => {
  const intact = syntheticRecovery33();
  await assert.rejects(validateOperatorRecovery33({ ...intact, history: intact.history.slice(0, 32) }));
  const previousChanged = structuredClone(intact.previous);
  previousChanged.tokens.content += 1;
  await assert.rejects(validateOperatorRecovery33({ ...intact, previous: previousChanged }));
  const afterDigest = structuredClone(intact.proof);
  afterDigest.afterDigest = 'synthetic-other';
  await assert.rejects(validateOperatorRecovery33({ ...intact, proof: afterDigest }));
  const bothRecords = parts => [parts.events[0].input.record, parts.events[0].wire.record, parts.events[1].input.record];
  const cases = {
    readbackDiffers: parts => { parts.readback.digest = 'synthetic-readback-differs'; },
    duplicateResponse: parts => { parts.events.splice(2, 0, structuredClone(parts.events[1])); },
    otherEndpoint: parts => { parts.events[0].endpoint = '/synthetic-endpoint'; },
    wireDiffers: parts => { parts.events[0].wire.operation = 'synthetic'; },
    responseStatus: parts => { parts.events[1].status = 500; },
    responseBody: parts => { parts.events[1].body = { ok: true, result: { synthetic: true } }; },
    responseInput: parts => { parts.events[1].input.operation = 'synthetic'; },
    noCompositionHeld: parts => { parts.events.splice(2, 1); },
    heldNotSnapshot: parts => { parts.events[2].input.operation = 'save'; },
    secondHeld: parts => { parts.events.push({ phase: 'held', error: 'Original request outcome uncertain; no further writes' }); },
    reloadSettled: parts => { parts.events.push({ phase: 'browser-quiescence-settled', boundary: 'after-family-reload' }); },
    postReloadRead: parts => { parts.events.push({ phase: 'post-reload-public-record-response' }); },
    otherOwner: parts => { parts.intent.owner.providerId = 'synthetic-provider'; parts.bundle.intent.owner.providerId = 'synthetic-provider'; },
    duplicateBindingId: parts => { for (const record of bothRecords(parts)) lastBinding(record).id = 'synthetic-binding-0'; },
    twoBindingsAdded: parts => { for (const record of bothRecords(parts)) record.document.bindings.push({ ...lastBinding(record), id: 'synthetic-binding-2' }); },
    bindingTransform: parts => { for (const record of bothRecords(parts)) lastBinding(record).transform = { kind: 'synthetic' }; },
    existingBindingEdited: parts => { for (const record of bothRecords(parts)) record.document.bindings[0].target.prop = 'synthetic'; },
    readbackNotSaved: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.project.providers.mappings[0].records[0].document.bindings.pop(); },
    unrelatedTokenChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.tokens.compositions += 1; },
    unrelatedRecordChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.project.providers.compositions[0].records[1].document.name = 'synthetic drift'; },
    rendererChanged: parts => { for (const snapshot of [parts.after, parts.readback]) snapshot.renderer.digest = 'synthetic-renderer-other'; },
    bundleSnapshot: parts => { parts.bundle.snapshot.tokens.content += 1; },
    bundleIntent: parts => { parts.bundle.intent.title = 'synthetic'; },
    shutdownCode: parts => { parts.shutdown.code = 1; },
    shutdownHostRoot: parts => { for (const trace of [parts.trace, parts.shutdown.trace]) trace[0].message.hostRoot = '/synthetic-host'; },
  };
  for (const [name, edit] of Object.entries(cases)) await assert.rejects(validate(syntheticRecovery33(edit)), undefined, name);
});
