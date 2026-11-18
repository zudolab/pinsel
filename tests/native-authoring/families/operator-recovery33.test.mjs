import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RECOVERY33, assertBindingRecoveryIdentity, validateOperatorRecovery33 } from './operator-recovery33.mjs';

const dir = '/workspace/composer-adoption-notes/results-continuation24-phase33-01/artifacts';
const readbackPath = '/workspace/composer-adoption-notes/results-continuation24-phase33-readback-01/capture.json';
const evidence = {
  originalBefore: `${dir}/before.json`,
  originalAfter: `${dir}/after.json`,
  readbackCapture: readbackPath,
  originalEvents: `${dir}/events.ndjson`,
  originalBundle: `${dir}/accepted-inputs.json`,
  originalShutdown: `${dir}/server-shutdown.json`,
  originalTrace: `${dir}/server-ipc-trace.json`,
};
const UNCERTAIN = 'Original request outcome uncertain; no further writes';

async function proofFrom(eventsText = null) {
  const read = async path => eventsText !== null && path === evidence.originalEvents ? Buffer.from(eventsText) : readFile(path);
  const json = async path => JSON.parse(await read(path));
  const before = await json(evidence.originalBefore);
  const intent = (await json(evidence.originalBundle)).intent;
  const events = (await read(evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const record = events.find(event => event.phase === 'request-before-dispatch').input.record;
  const proof = {
    status: RECOVERY33, originalScenario: 'FAIL', originalProof: 'ABSENT', originalUiResult: 'ABSENT', originalFailure: UNCERTAIN,
    recoveryKind: 'saved-binding-separate-public-capture', domain: 'mappings', beforeDigest: before.digest,
    afterDigest: (await json(readbackPath)).digest, afterCapture: readbackPath, intent, result: { record }, evidence,
  };
  const history = Array.from({ length: 33 }, () => ({ afterDigest: '0'.repeat(64) }));
  history[32] = { afterDigest: before.digest };
  return { proof, before, history, read, json, loaded: { continuation: { descriptor: intent.familyContinuation } } };
}

test('index 33 accepts the saved TOC label binding and refuses a second write', async () => {
  const intact = await proofFrom();
  assertBindingRecoveryIdentity(intact.proof, intact.history[32], intact.loaded.continuation.descriptor);
  await validateOperatorRecovery33({ proof: intact.proof, previous: intact.before, history: intact.history, loaded: intact.loaded, read: intact.read, json: intact.json });
  const wrong = structuredClone(intact.proof);
  wrong.intent.sequence.index = 34;
  assert.throws(() => assertBindingRecoveryIdentity(wrong, intact.history[32], intact.loaded.continuation.descriptor));
  const events = (await intact.read(evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  events.push(structuredClone(events.find(event => event.phase === 'request-before-dispatch')));
  const extra = await proofFrom(events.map(event => JSON.stringify(event)).join('\n'));
  await assert.rejects(validateOperatorRecovery33({ proof: extra.proof, previous: extra.before, history: extra.history, loaded: extra.loaded, read: extra.read, json: extra.json }));
});
