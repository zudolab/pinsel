import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RECOVERY26, assertOperatorRecoveryIdentity, validateOperatorRecovery26 } from './operator-recovery26.mjs';

const descriptor = { proofPath: '/descriptor', freezeManifestPath: '/freeze', freezeManifestSha256: 'a'.repeat(64) };
const oldRecord = { id: 'child', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', document: { mode: { kind: 'collection', query: { conditions: [{ fieldId: 'result-entry-year', operator: 'equals', value: { providerId: 'content-filesystem', modelId: 'result-year', recordId: 'parent' } }] } } } };
const saved = { ...oldRecord, updatedAt: '2026-01-02T00:00:00.000Z', document: { mode: { kind: 'collection', query: { conditions: [{ fieldId: 'result-entry-year', operator: 'not-equals', value: oldRecord.document.mode.query.conditions[0].value }] } } } };
const intent = { family: 'results', domain: 'mappings', kind: 'record-edit', owner: { providerId: 'mapping-filesystem', recordId: 'child' }, document: saved.document, action: { kind: 'select', label: 'Filter 1 operator', value: 'not-equals' }, sequence: { index: 26, step: 'child-reference-not-equals', total: 45, configHash: 'c'.repeat(64) }, captureDigest: 'b'.repeat(64), capturePath: '/before.json', familyContinuation: descriptor };
const snapshot = (digest, record) => ({ digest, workspaceId: 'pinsel', schemaVersion: 1, componentPack: {}, renderer: {}, assets: [], publicFiles: [], tokens: { mappings: digest, content: 1 }, project: { providers: { mappings: [{ id: 'mapping-filesystem', records: [record] }] } } });

test('operator recovery identity is refused away from index 26', () => {
  const proof = { status: RECOVERY26, originalScenario: 'FAIL', originalProof: 'ABSENT', originalUiResult: 'ABSENT', originalFailure: 'Original request outcome uncertain; no further writes', recoveryKind: 'saved-operator-edit-separate-public-capture', domain: 'mappings', beforeDigest: 'b'.repeat(64), afterDigest: 'd'.repeat(64), afterCapture: '/readback.json', intent, result: { record: saved }, evidence: { originalBefore: '/before.json', originalAfter: '/after.json', readbackCapture: '/readback.json', originalEvents: '/events.ndjson', originalBundle: '/bundle.json', originalShutdown: '/shutdown.json', originalTrace: '/trace.json' } };
  assert.throws(() => assertOperatorRecoveryIdentity(proof, { afterDigest: 'a'.repeat(64) }, descriptor));
  assert.doesNotThrow(() => assertOperatorRecoveryIdentity(proof, { afterDigest: proof.beforeDigest }, descriptor));
});

test('operator recovery requires the uncertain snapshot and the exact saved record', async () => {
  const before = snapshot('b'.repeat(64), oldRecord);
  const after = snapshot('d'.repeat(64), saved);
  const dir = await mkdtemp(join(tmpdir(), 'recovery26-'));
  const paths = Object.fromEntries(['before', 'after', 'readback', 'events', 'bundle', 'shutdown', 'trace'].map(name => [name, join(dir, name)]));
  const nonce = '9558ee11-ed8b-4ddb-8fae-a06ccc830c2a';
  const hostRoot = '/workspace/pinsel-baseline-publication/packages/pinsel-content';
  const message = type => ({ protocol: 'pinsel-native-owner-v1', nonce, pid: 10, hostRoot, port: 4208, type });
  const trace = [{ event: 'message', at: '2026-01-02T00:00:00.000Z', message: message('ready') }, { event: 'stop', at: '2026-01-02T00:00:01.000Z', message: message('stop') }, { event: 'message', at: '2026-01-02T00:00:02.000Z', message: message('closed') }, { event: 'close', code: 0, signal: null }];
  const shutdown = { code: 0, signal: null, lease: 'absent', port: 'free', protocol: 'pinsel-native-owner-v1', pid: 10, trace };
  const events = [{ phase: 'begin', intent }, { phase: 'request-before-dispatch', endpoint: '/__zudo_composer_mapping_provider', input: { record: saved }, wire: { record: saved } }, { phase: 'request-response', input: { record: saved }, status: 200, body: { ok: true, result: null } }, { phase: 'composition-request-before-dispatch', input: { operation: 'snapshot' } }, { phase: 'composition-held', input: { operation: 'snapshot' }, error: 'Original request outcome uncertain; no further writes' }];
  await writeFile(paths.before, JSON.stringify(before));
  await writeFile(paths.after, JSON.stringify(after));
  await writeFile(paths.readback, JSON.stringify(after));
  await writeFile(paths.events, events.map(event => JSON.stringify(event)).join('\n'));
  await writeFile(paths.bundle, JSON.stringify({ snapshot: before, intent }));
  await writeFile(paths.shutdown, JSON.stringify(shutdown));
  await writeFile(paths.trace, JSON.stringify(trace));
  const files = new Map(await Promise.all(Object.values(paths).map(async path => [path, await readFile(path, 'utf8')])));
  const read = async path => ({ toString: () => files.get(path) });
  const json = async path => JSON.parse(files.get(path));
  const proof = { status: RECOVERY26, originalScenario: 'FAIL', originalProof: 'ABSENT', originalUiResult: 'ABSENT', originalFailure: 'Original request outcome uncertain; no further writes', recoveryKind: 'saved-operator-edit-separate-public-capture', domain: 'mappings', beforeDigest: before.digest, afterDigest: after.digest, afterCapture: paths.readback, intent, result: { record: saved }, evidence: { originalBefore: paths.before, originalAfter: paths.after, readbackCapture: paths.readback, originalEvents: paths.events, originalBundle: paths.bundle, originalShutdown: paths.shutdown, originalTrace: paths.trace } };
  const readback = await validateOperatorRecovery26({ proof, previous: before, history: Array.from({ length: 26 }, (_, index) => index === 25 ? { afterDigest: before.digest } : { afterDigest: 'x' }), loaded: { continuation: { descriptor } }, read, json });
  assert.equal(readback.digest, after.digest);
  proof.evidence.readbackCapture = proof.evidence.originalAfter;
  await assert.rejects(validateOperatorRecovery26({ proof, previous: before, history: Array.from({ length: 26 }, (_, index) => index === 25 ? { afterDigest: before.digest } : {}), loaded: { continuation: { descriptor } }, read, json }));
});
