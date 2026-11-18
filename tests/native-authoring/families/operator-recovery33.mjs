import assert from 'node:assert/strict';
import { admitBinding, auditDelta } from './intents.mjs';
import { assertContinuationShutdown } from './continuation-core.mjs';

export const RECOVERY33 = 'TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED';
const UNCERTAIN = 'Original request outcome uncertain; no further writes';

/** Structural identity only. File bytes are checked by validateOperatorRecovery33. */
export function assertBindingRecoveryIdentity(proof, previous, descriptor) {
  assert.equal(proof.status, RECOVERY33);
  assert.deepEqual(Object.keys(proof).sort(), ['afterCapture', 'afterDigest', 'beforeDigest', 'domain', 'evidence', 'intent', 'originalFailure', 'originalProof', 'originalScenario', 'originalUiResult', 'recoveryKind', 'result', 'status']);
  assert.equal(proof.originalScenario, 'FAIL');
  assert.equal(proof.originalProof, 'ABSENT');
  assert.equal(proof.originalUiResult, 'ABSENT');
  assert.equal(proof.originalFailure, UNCERTAIN);
  assert.equal(proof.recoveryKind, 'saved-binding-separate-public-capture');
  assert.equal(proof.domain, 'mappings');
  assert.equal(proof.intent.family, 'results');
  assert.equal(proof.intent.domain, 'mappings');
  assert.equal(proof.intent.kind, 'binding');
  assert.equal(proof.intent.sequence.index, 33);
  assert.equal(proof.intent.sequence.step, 'toc-bind-label');
  assert.equal(proof.intent.sequence.total, 45);
  assert.equal(proof.intent.fieldId, 'result-year-label');
  assert.equal(proof.intent.fieldLabel, '年度');
  assert.equal(proof.intent.title, 'TOC item');
  assert.equal(proof.intent.target.prop, 'label');
  assert.deepEqual(proof.intent.familyContinuation, descriptor);
  assert.equal(proof.intent.captureDigest, proof.beforeDigest);
  assert.equal(proof.beforeDigest, previous.afterDigest);
  assert.equal(proof.result.record.document.bindings.at(-1).target.prop, 'label');
  assert.equal(proof.result.record.document.bindings.at(-1).sourceFieldId, 'result-year-label');
  assert.equal(proof.afterCapture, proof.evidence.readbackCapture);
  assert.notEqual(proof.evidence.originalAfter, proof.evidence.readbackCapture);
  assert.deepEqual(Object.keys(proof.evidence).sort(), ['originalAfter', 'originalBefore', 'originalBundle', 'originalEvents', 'originalShutdown', 'originalTrace', 'readbackCapture']);
}

/**
 * The binding write returned 200 and the public capture shows that one binding.
 * The following composition snapshot did not answer within the original-request limit.
 */
export async function validateOperatorRecovery33({ proof, previous, history, loaded, read, json }) {
  assert.equal(history.length, 33);
  assertBindingRecoveryIdentity(proof, history[32], loaded.continuation.descriptor);
  const before = await json(proof.evidence.originalBefore);
  const originalAfter = await json(proof.evidence.originalAfter);
  const readback = await json(proof.evidence.readbackCapture);
  assert.deepEqual(before, previous);
  assert.equal(before.digest, proof.beforeDigest);
  assert.deepEqual(readback, originalAfter);
  assert.equal(readback.digest, proof.afterDigest);
  const events = (await read(proof.evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const writes = events.filter(event => event.phase === 'request-before-dispatch');
  const responses = events.filter(event => event.phase === 'request-response');
  assert.equal(writes.length, 1);
  assert.equal(responses.length, 1);
  assert.equal(writes[0].endpoint, '/__zudo_composer_mapping_provider');
  assert.deepEqual(writes[0].input, writes[0].wire);
  assert.equal(responses[0].status, 200);
  assert.deepEqual(responses[0].body, { ok: true, result: null });
  assert.deepEqual(responses[0].input, writes[0].input);
  const record = admitBinding(before, proof.intent, writes[0].input);
  assert.deepEqual(record, proof.result.record);
  const saved = readback.project.providers.mappings.find(provider => provider.id === 'mapping-filesystem').records.find(item => item.id === proof.intent.owner.recordId);
  assert.deepEqual(saved, record);
  const held = events.filter(event => event.phase === 'composition-held' && event.error === UNCERTAIN);
  assert.equal(held.length, 1);
  assert.equal(held[0].input.operation, 'snapshot');
  assert.equal(events.filter(event => event.phase === 'held' && event.error === UNCERTAIN).length, 1);
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
