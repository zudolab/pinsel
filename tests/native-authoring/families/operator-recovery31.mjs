import assert from 'node:assert/strict';
import { admitRecordEdit, auditDelta } from './intents.mjs';
import { assertContinuationShutdown } from './continuation-core.mjs';

export const RECOVERY31 = 'COMPOSITION_PROP_FILL_RECOVERY_VERIFIED';
const SAVE_TIMEOUT = "locator.isEnabled: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Save', exact: true })\n";

/** Structural identity only. File bytes are checked by validateOperatorRecovery31. */
export function assertCompositionRecoveryIdentity(proof, previous, descriptor) {
  assert.equal(proof.status, RECOVERY31);
  assert.deepEqual(Object.keys(proof).sort(), ['afterCapture', 'afterDigest', 'beforeDigest', 'domain', 'evidence', 'intent', 'originalFailure', 'originalProof', 'originalScenario', 'originalUiResult', 'recoveryKind', 'result', 'status']);
  assert.equal(proof.originalScenario, 'FAIL');
  assert.equal(proof.originalProof, 'ABSENT');
  assert.equal(proof.originalUiResult, 'ABSENT');
  assert.equal(proof.originalFailure, SAVE_TIMEOUT);
  assert.equal(proof.recoveryKind, 'saved-composition-fill-separate-public-capture');
  assert.equal(proof.domain, 'compositions');
  assert.equal(proof.intent.family, 'results');
  assert.equal(proof.intent.domain, 'compositions');
  assert.equal(proof.intent.kind, 'record-edit');
  assert.equal(proof.intent.sequence.index, 31);
  assert.equal(proof.intent.sequence.step, 'toc-prop-number');
  assert.equal(proof.intent.sequence.total, 45);
  assert.deepEqual(proof.intent.action, { kind: 'fill', label: '番号', value: 999, treeRoot: true });
  assert.equal(proof.intent.document.root[0].props.number, 999);
  assert.deepEqual(proof.intent.familyContinuation, descriptor);
  assert.equal(proof.intent.captureDigest, proof.beforeDigest);
  assert.equal(proof.beforeDigest, previous.afterDigest);
  assert.equal(proof.result.record.document.root[0].props.number, 999);
  assert.equal(proof.afterCapture, proof.evidence.readbackCapture);
  assert.notEqual(proof.evidence.originalAfter, proof.evidence.readbackCapture);
  assert.deepEqual(Object.keys(proof.evidence).sort(), ['originalAfter', 'originalBefore', 'originalBundle', 'originalEvents', 'originalShutdown', 'originalTrace', 'readbackCapture']);
  for (const path of Object.values(proof.evidence)) assert.equal(typeof path, 'string');
}

/**
 * The original browser saved the TOC number through the composition queue,
 * closed the output challenge with the same record, then held on Save.
 * Acceptance uses the separate public capture, not a replay.
 */
export async function validateOperatorRecovery31({ proof, previous, history, loaded, read, json }) {
  assert.equal(history.length, 31);
  assertCompositionRecoveryIdentity(proof, history[30], loaded.continuation.descriptor);
  const before = await json(proof.evidence.originalBefore);
  const originalAfter = await json(proof.evidence.originalAfter);
  const readback = await json(proof.evidence.readbackCapture);
  assert.deepEqual(before, previous);
  assert.equal(before.digest, proof.beforeDigest);
  assert.deepEqual(readback, originalAfter);
  assert.equal(readback.digest, proof.afterDigest);
  const events = (await read(proof.evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const writes = events.filter(event => event.phase === 'composition-put-before-dispatch');
  const responses = events.filter(event => event.phase === 'composition-put-response');
  assert.equal(writes.length, 2);
  assert.equal(responses.length, 2);
  assert.equal(writes[0].continuation, false);
  assert.deepEqual(writes[0].input.outputsById, {});
  assert.equal(writes[0].input.record.document.root[0].props.number, 999);
  assert.equal(writes[1].continuation, true);
  assert.deepEqual(writes[1].input.record, writes[0].input.record);
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].body.ok, 'needs-output');
  assert.equal(responses[1].status, 200);
  assert.equal(responses[1].body.ok, true);
  assert.equal(responses[1].body.result.canonical.status, 'saved');
  const record = admitRecordEdit(before, proof.intent, writes[0].input);
  assert.deepEqual(record, proof.result.record);
  assert.deepEqual(record, writes[1].input.record);
  const saved = readback.project.providers.compositions.find(provider => provider.id === 'files').records.find(item => item.id === proof.intent.owner.recordId);
  assert.deepEqual(saved, record);
  const held = events.filter(event => event.phase === 'held');
  assert.equal(held.length, 1);
  assert.equal(held[0].error, SAVE_TIMEOUT);
  assert(!events.some(event => event.phase === 'browser-quiescence-settled' && event.boundary === 'after-family-reload'));
  assert(!events.some(event => event.phase === 'post-reload-public-record-response'));
  const delta = auditDelta(before, readback, proof.intent, record);
  assert.equal(proof.beforeDigest, delta.beforeDigest);
  assert.equal(proof.afterDigest, delta.afterDigest);
  assert.equal(delta.domain, 'compositions');
  const bundle = await json(proof.evidence.originalBundle);
  assert.deepEqual(bundle.snapshot, before);
  assert.deepEqual(bundle.intent, proof.intent);
  const shutdown = await json(proof.evidence.originalShutdown);
  const trace = await json(proof.evidence.originalTrace);
  assertContinuationShutdown(shutdown, trace, { hostRoot: '/workspace/pinsel-baseline-publication/packages/pinsel-content', port: 4208 });
  return readback;
}
