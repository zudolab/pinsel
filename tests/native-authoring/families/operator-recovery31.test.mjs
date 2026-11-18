import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RECOVERY31, assertCompositionRecoveryIdentity, validateOperatorRecovery31 } from './operator-recovery31.mjs';

const dir = '/workspace/composer-adoption-notes/results-continuation24-phase31-01/artifacts';
const readbackPath = '/workspace/composer-adoption-notes/results-continuation24-phase31-readback-01/capture.json';
const evidence = {
  originalBefore: `${dir}/before.json`,
  originalAfter: `${dir}/after.json`,
  readbackCapture: readbackPath,
  originalEvents: `${dir}/events.ndjson`,
  originalBundle: `${dir}/accepted-inputs.json`,
  originalShutdown: `${dir}/server-shutdown.json`,
  originalTrace: `${dir}/server-ipc-trace.json`,
};

async function proofFrom(eventsText = null) {
  const read = async path => {
    if (eventsText !== null && path === evidence.originalEvents) return Buffer.from(eventsText);
    return readFile(path);
  };
  const json = async path => JSON.parse(await read(path));
  const before = await json(evidence.originalBefore);
  const intent = (await json(evidence.originalBundle)).intent;
  const events = (await read(evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const record = events.find(event => event.phase === 'composition-put-before-dispatch').input.record;
  const proof = {
    status: RECOVERY31,
    originalScenario: 'FAIL',
    originalProof: 'ABSENT',
    originalUiResult: 'ABSENT',
    originalFailure: events.find(event => event.phase === 'held')?.error ?? 'locator.isEnabled: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole(\'button\', { name: \'Save\', exact: true })\n',
    recoveryKind: 'saved-composition-fill-separate-public-capture',
    domain: 'compositions',
    beforeDigest: before.digest,
    afterDigest: (await json(readbackPath)).digest,
    afterCapture: readbackPath,
    intent,
    result: { record },
    evidence,
  };
  const loaded = { continuation: { descriptor: intent.familyContinuation } };
  const history = Array.from({ length: 31 }, () => ({ afterDigest: '0'.repeat(64) }));
  history[30] = { afterDigest: before.digest };
  return { proof, before, loaded, history, read, json };
}

test('index 31 accepts the saved TOC number and refuses a widened or replayed failure', async () => {
  const intact = await proofFrom();
  assertCompositionRecoveryIdentity(intact.proof, intact.history[30], intact.loaded.continuation.descriptor);
  await validateOperatorRecovery31({ proof: intact.proof, previous: intact.before, history: intact.history, loaded: intact.loaded, read: intact.read, json: intact.json });
  const wrongIndex = structuredClone(intact.proof);
  wrongIndex.intent.sequence.index = 30;
  assert.throws(() => assertCompositionRecoveryIdentity(wrongIndex, intact.history[30], intact.loaded.continuation.descriptor));
  const events = (await intact.read(evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const changedEvents = structuredClone(events);
  const second = changedEvents.findLast(event => event.phase === 'composition-put-before-dispatch');
  second.input.record.document.root[0].props.number = 11;
  const changed = await proofFrom(changedEvents.map(event => JSON.stringify(event)).join('\n'));
  await assert.rejects(validateOperatorRecovery31({ proof: changed.proof, previous: changed.before, history: changed.history, loaded: changed.loaded, read: changed.read, json: changed.json }));
  const withoutHeld = events.filter(event => event.phase !== 'held');
  const missing = await proofFrom(withoutHeld.map(event => JSON.stringify(event)).join('\n'));
  missing.proof.originalFailure = intact.proof.originalFailure;
  await assert.rejects(validateOperatorRecovery31({ proof: missing.proof, previous: missing.before, history: missing.history, loaded: missing.loaded, read: missing.read, json: missing.json }));
});
