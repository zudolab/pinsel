import assert from 'node:assert/strict';
import { admitRecordEdit, auditDelta } from './intents.mjs';
import { assertContinuationShutdown } from './continuation-core.mjs';

export const RECOVERY26 = 'MAPPING_OPERATOR_RELOAD_SNAPSHOT_RECOVERY_VERIFIED';
const UNCERTAIN = 'Original request outcome uncertain; no further writes';

/** Structural identity only. File bytes are checked by validateOperatorRecovery26. */
export function assertOperatorRecoveryIdentity(proof, previous, descriptor) {
  assert.equal(proof.status, RECOVERY26);
  assert.deepEqual(Object.keys(proof).sort(), ['afterCapture', 'afterDigest', 'beforeDigest', 'domain', 'evidence', 'intent', 'originalFailure', 'originalProof', 'originalScenario', 'originalUiResult', 'recoveryKind', 'result', 'status']);
  assert.equal(proof.originalScenario, 'FAIL');
  assert.equal(proof.originalProof, 'ABSENT');
  assert.equal(proof.originalUiResult, 'ABSENT');
  assert.equal(proof.originalFailure, UNCERTAIN);
  assert.equal(proof.recoveryKind, 'saved-operator-edit-separate-public-capture');
  assert.equal(proof.domain, 'mappings');
  assert.equal(proof.intent.family, 'results');
  assert.equal(proof.intent.domain, 'mappings');
  assert.equal(proof.intent.kind, 'record-edit');
  assert.equal(proof.intent.sequence.index, 26);
  assert.equal(proof.intent.sequence.step, 'child-reference-not-equals');
  assert.equal(proof.intent.sequence.total, 45);
  assert.deepEqual(proof.intent.action, { kind: 'select', label: 'Filter 1 operator', value: 'not-equals' });
  assert.deepEqual(proof.intent.familyContinuation, descriptor);
  assert.equal(proof.intent.captureDigest, proof.beforeDigest);
  assert.equal(proof.beforeDigest, previous.afterDigest);
  assert.equal(proof.result.record.document.mode.query.conditions[0].operator, 'not-equals');
  assert.equal(proof.afterCapture, proof.evidence.readbackCapture);
  assert.notEqual(proof.evidence.originalAfter, proof.evidence.readbackCapture);
  assert.deepEqual(Object.keys(proof.evidence).sort(), ['originalAfter', 'originalBefore', 'originalBundle', 'originalEvents', 'originalShutdown', 'originalTrace', 'readbackCapture']);
  for (const path of Object.values(proof.evidence)) assert.equal(typeof path, 'string');
}

/**
 * The original browser saved the operator edit and then held the post-reload
 * composition snapshot. Acceptance uses a later offline capture, not a replay.
 */
export async function validateOperatorRecovery26({ proof, previous, history, loaded, read, json }) {
  assert.equal(history.length, 26);
  assertOperatorRecoveryIdentity(proof, history[25], loaded.continuation.descriptor);
  const before = await json(proof.evidence.originalBefore);
  const originalAfter = await json(proof.evidence.originalAfter);
  const readback = await json(proof.evidence.readbackCapture);
  assert.deepEqual(before, previous);
  assert.equal(before.digest, proof.beforeDigest);
  assert.deepEqual(readback, originalAfter);
  assert.equal(readback.digest, proof.afterDigest);
  const events = (await read(proof.evidence.originalEvents)).toString().trim().split('\n').map(JSON.parse);
  const writes = events.filter(event => event.phase === 'request-before-dispatch');
  const responses = events.filter(event => event.phase === 'request-response');
  assert.equal(writes.length, 1);
  assert.equal(responses.length, 1);
  assert.equal(writes[0].endpoint, '/__zudo_composer_mapping_provider');
  assert.deepEqual(writes[0].input, writes[0].wire);
  assert.deepEqual(responses[0].input, writes[0].input);
  assert.equal(responses[0].status, 200);
  assert.deepEqual(responses[0].body, { ok: true, result: null });
  const record = admitRecordEdit(before, proof.intent, writes[0].input);
  assert.deepEqual(record, proof.result.record);
  assert.deepEqual(record, readback.project.providers.mappings.find(provider => provider.id === proof.intent.owner.providerId).records.find(item => item.id === proof.intent.owner.recordId));
  const held = events.filter(event => event.phase === 'composition-held' && event.error === UNCERTAIN);
  assert.equal(held.length, 1);
  assert.equal(held[0].input.operation, 'snapshot');
  assert(!events.some(event => event.phase === 'browser-quiescence-settled' && event.boundary === 'after-family-reload'));
  assert(!events.some(event => event.phase === 'post-reload-public-record-response'));
  const delta = auditDelta(before, readback, proof.intent, record);
  assert.equal(proof.beforeDigest, delta.beforeDigest);
  assert.equal(proof.afterDigest, delta.afterDigest);
  assert.equal(delta.domain, 'mappings');
  const bundle = await json(proof.evidence.originalBundle);
  assert.deepEqual(bundle.snapshot, before);
  assert.deepEqual(bundle.intent, proof.intent);
  const shutdown = await json(proof.evidence.originalShutdown);
  const trace = await json(proof.evidence.originalTrace);
  assertContinuationShutdown(shutdown, trace, { hostRoot: '/workspace/pinsel-baseline-publication/packages/pinsel-content', port: 4208 });
  return readback;
}
