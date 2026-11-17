import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRestoreBoundary, recoveryObservation, assertRecoveryInverse, requestDigest, recoveryImages, assertRecoveryState, assertRecoveryReceipt, assertReceiptOnlyRetry } from './recovery-proof.mjs';
const a = 'a'.repeat(64), b = 'b'.repeat(64);
function fixture() {
  const node = id => ({ id, props: {}, slots: {} });
  const record = { id: 'lessons', createdAt: 'fixed', updatedAt: 'old', document: { root: [{ id: 'frame', props: {}, slots: { main: [node('intro'), node('consultation')] } }] } };
  const before = { digest: a, workspaceId: 'pinsel', assets: {}, publicFiles: [], project: { providers: { compositions: [{ id: 'files', records: [record, { id: 'other', updatedAt: 'old', document: {} }] }], content: [{ entries: [{ id: 'untouched', updatedAt: 'old' }] }] } } };
  const journal = { version: 1, beforeDigest: a, placement: { providerId: 'files', recordId: 'lessons', nodeId: 'consultation', parentNodeId: 'frame', slotId: 'main' }, target: { renderedNodeId: 'rendered', providerId: 'files', recordId: 'shared', nodeId: 'section' } };
  const images = recoveryImages(before, journal);
  const operation = inverse => {
    const request = { operation: 'document-edit', input: { operationId: inverse ? '10000000-0000-4000-8000-000000000002' : '10000000-0000-4000-8000-000000000001', revision: inverse ? b : a, workspaceId: 'pinsel', pathname: '/lessons', target: journal.target, change: { kind: 'reorder-placement', direction: inverse ? 'down' : 'up' } } };
    return { request, response: { ok: true, result: { operationId: 'host-' + request.input.operationId, planDigest: requestDigest(request.input), workspaceId: 'pinsel', beforeRevision: request.input.revision, recordId: 'lessons', before: inverse ? images.moved : images.original, after: inverse ? images.original : images.moved } } };
  };
  journal.forward = operation(false); journal.inverse = operation(true);
  const moved = structuredClone(before); moved.digest = b; moved.project.providers.compositions[0].records[0] = structuredClone(images.moved); moved.project.providers.compositions[0].records[0].updatedAt = 'new';
  return { before, journal, moved };
}
test('exact moved/current and both receipts validate without modifying evidence', () => {
  const f = fixture(), copy = structuredClone(f);
  assert.equal(assertRecoveryState(f.before, f.moved, f.journal), 'moved');
  assert.equal(assertRecoveryState(f.before, f.before, f.journal), 'original');
  assertRecoveryReceipt(f.before, f.journal, f.journal.forward);
  assertRecoveryReceipt(f.before, f.journal, f.journal.inverse, true);
  assert.deepEqual(f, copy);
});
for (const name of ['content', 'other-time', 'owner-created', 'extra-prop', 'assets', 'public', 'placement', 'before-digest']) test(`holds unrelated ${name}`, () => {
  const f = fixture();
  if (name === 'content') f.moved.project.providers.content[0].entries[0].updatedAt = 'changed';
  if (name === 'other-time') f.moved.project.providers.compositions[0].records[1].updatedAt = 'changed';
  if (name === 'owner-created') f.moved.project.providers.compositions[0].records[0].createdAt = 'changed';
  if (name === 'extra-prop') f.moved.project.providers.compositions[0].records[0].document.root[0].props.extra = true;
  if (name === 'assets') f.moved.assets.extra = true;
  if (name === 'public') f.moved.publicFiles.push('extra');
  if (name === 'placement') f.journal.placement.slotId = 'foreign';
  if (name === 'before-digest') f.journal.beforeDigest = b;
  assert.throws(() => assertRecoveryState(f.before, f.moved, f.journal));
});
for (const name of ['operation', 'workspace', 'revision', 'after', 'missing', 'direction', 'digest', 'target']) test(`rejects forged/missing receipt ${name}`, () => {
  const f = fixture(), op = structuredClone(f.journal.forward);
  if (name === 'operation') op.response.result.operationId += 'other';
  if (name === 'workspace') op.response.result.workspaceId = 'other';
  if (name === 'revision') op.response.result.beforeRevision = b;
  if (name === 'after') op.response.result.after.document.root[0].props.extra = true;
  if (name === 'missing') delete op.response;
  if (name === 'direction') op.request.input.change.direction = 'down';
  if (name === 'digest') op.response.result.planDigest = 'wrong';
  if (name === 'target') { op.request.input.target.renderedNodeId = 'foreign'; f.journal.target = op.request.input.target; }
  assert.throws(() => assertRecoveryReceipt(f.before, f.journal, op));
});
test('unknown forward/inverse retry is receipt-only: executable request holds, stale may recover', () => {
  const f = fixture(); delete f.journal.forward.response; delete f.journal.inverse.response;
  assert.throws(() => assertReceiptOnlyRetry(f.before, f.before, f.journal, f.journal.forward), /still executable/);
  assertReceiptOnlyRetry(f.before, f.moved, f.journal, f.journal.forward);
  assert.throws(() => assertReceiptOnlyRetry(f.before, f.moved, f.journal, f.journal.inverse, true), /still executable/);
  assertReceiptOnlyRetry(f.before, f.before, f.journal, f.journal.inverse, true);
});

test('fresh inverse requires exact verified moved snapshot and current reviewed revision before dispatch', () => {
  const f = fixture();
  assertRecoveryInverse(f.before, f.moved, f.journal, f.journal.inverse.request);
  assert.throws(() => assertRecoveryInverse(f.before, f.before, f.journal, f.journal.inverse.request), /No proven moved/);
  const newer = structuredClone(f.journal.inverse.request); newer.input.revision = 'c'.repeat(64);
  assert.throws(() => assertRecoveryInverse(f.before, f.moved, f.journal, newer), /Preview changed/);
  f.moved.project.providers.content[0].entries[0].value = 'foreign';
  assert.throws(() => assertRecoveryInverse(f.before, f.moved, f.journal, f.journal.inverse.request), /Unrelated/);
});

test('late extra write failure cannot be erased by an earlier successful response', async () => {
  const observation = recoveryObservation();
  await observation.run(async () => {});
  observation.fail(Error('extra write refused'));
  await assert.rejects(observation.drain(), /extra write/);
});
test('timeout reconciliation drains an in-flight handler before exposing failure', async () => {
  const observation = recoveryObservation(); let finish, settled = false;
  const pending = new Promise(resolve => { finish = resolve; });
  observation.run(async () => { await pending; });
  observation.fail(Error('timeout'));
  const drain = observation.drain().catch(error => { settled = true; return error; });
  await Promise.resolve(); assert.equal(settled, false);
  finish(); assert.match((await drain).message, /timeout/); assert.equal(settled, true);
});

test('restore scope, scenario and original before-image all gate cleanup authorization', () => {
  const scope = { stage: 'notes-v1', workspaceId: 'pinsel', composer: 'fixed' }, before = { digest: a };
  const manifest = { scope, scenario: 'recovery', beforeDigest: a };
  assertRestoreBoundary(manifest, scope, before, 'recovery');
  assert.throws(() => assertRestoreBoundary(manifest, scope, before, 'assistant'), /original --scenario/);
  assert.throws(() => assertRestoreBoundary(manifest, { ...scope, stage: 'other' }, before, 'recovery'), /scope differs/);
  assert.throws(() => assertRestoreBoundary(manifest, scope, { digest: b }, 'recovery'), /before capture/);
});
