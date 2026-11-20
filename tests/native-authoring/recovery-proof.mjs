import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
// Host document-edit has fixed ASCII object keys; canonical JSON sorts these keys.
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value !== null && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
export const requestDigest = input => createHash('sha256').update(canonical(input) + '\n').digest('hex');
const clean = value => { const { updatedAt, ...rest } = value; return rest; };
const find = (nodes, id) => { for (const node of nodes) { if (node.id === id) return node; for (const children of Object.values(node.slots)) { const result = find(children, id); if (result) return result; } } };
export function recoveryImages(before, journal) {
  assert.equal(journal.version, 1);
  assert.equal(journal.beforeDigest, before.digest);
  const owner = journal.placement;
  assert.equal(owner?.providerId, 'files'); assert.equal(owner.recordId, 'lessons');
  const records = before.project.providers.compositions.find(p => p.id === owner.providerId)?.records;
  const original = records?.find(r => r.id === owner.recordId); assert(original);
  const moved = structuredClone(original);
  const children = owner.parentNodeId === null ? moved.document.root : find(moved.document.root, owner.parentNodeId)?.slots[owner.slotId];
  assert(Array.isArray(children), 'Missing exact placement slot');
  const index = children.findIndex(n => n.id === owner.nodeId); assert(index > 0, 'Placement cannot move up');
  [children[index - 1], children[index]] = [children[index], children[index - 1]];
  return { original, moved };
}
export function assertRecoveryRequest(before, journal, request, inverse = false) {
  recoveryImages(before, journal);
  assert.equal(request?.operation, 'document-edit'); const input = request.input;
  assert.equal(input.workspaceId, before.workspaceId); assert.equal(input.pathname, '/lessons');
  assert.match(input.operationId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(input.target, journal.target);
  assert.deepEqual(input.change, { kind: 'reorder-placement', direction: inverse ? 'down' : 'up' });
  if (!inverse) assert.equal(input.revision, before.digest);
  else { assert.match(input.revision, /^[a-f0-9]{64}$/); assert.notEqual(input.operationId, journal.forward.request.input.operationId); }
}
export function assertRecoveryReceipt(before, journal, operation, inverse = false) {
  assertRecoveryRequest(before, journal, operation.request, inverse);
  const receipt = operation.response?.result; assert.equal(operation.response?.ok, true, 'A successful exact receipt is required');
  const { original, moved } = recoveryImages(before, journal);
  assert.equal(receipt.planDigest, requestDigest(operation.request.input));
  assert.equal(receipt.operationId, 'host-' + operation.request.input.operationId);
  assert.equal(receipt.workspaceId, before.workspaceId); assert.equal(receipt.beforeRevision, operation.request.input.revision);
  assert.equal(receipt.recordId, journal.placement.recordId);
  assert.deepEqual(clean(receipt.before), clean(inverse ? moved : original));
  assert.deepEqual(clean(receipt.after), clean(inverse ? original : moved));
  return receipt;
}
export function assertRecoveryState(before, current, journal) {
  const { original, moved } = recoveryImages(before, journal);
  assert.deepEqual(current.assets, before.assets); assert.deepEqual(current.publicFiles, before.publicFiles);
  const actual = structuredClone(current.project), expected = structuredClone(before.project);
  const record = actual.providers.compositions.find(p => p.id === journal.placement.providerId)?.records.find(r => r.id === original.id);
  assert(record);
  const state = isDeepStrictEqual(clean(record), clean(original)) ? 'original' : 'moved';
  assert.deepEqual(clean(record), clean(state === 'original' ? original : moved), 'Placement differs from both exact recorded images');
  const records = expected.providers.compositions.find(p => p.id === journal.placement.providerId).records;
  records[records.findIndex(r => r.id === original.id)] = { ...(state === 'original' ? original : moved), updatedAt: record.updatedAt };
  assert.deepEqual(actual, expected, 'Unrelated authored state changed; recovery held');
  return state;
}
/** A retry without a known success must be stale: it may recover a receipt but cannot newly commit. */
export function assertReceiptOnlyRetry(before, current, journal, operation, inverse = false) {
  assertRecoveryRequest(before, journal, operation.request, inverse);
  assertRecoveryState(before, current, journal);
  if (operation.response?.ok) assertRecoveryReceipt(before, journal, operation, inverse);
  else assert.notEqual(operation.request.input.revision, current.digest, 'Uncertain request is still executable; hold instead of replaying a mutation');
}

export function assertRecoveryInverse(before, current, journal, request) {
  assertRecoveryReceipt(before, journal, journal.forward);
  assert.equal(assertRecoveryState(before, current, journal), 'moved', 'No proven moved state to inverse');
  assertRecoveryRequest(before, journal, request, true);
  assert.equal(request.input.revision, current.digest, 'Preview changed since exact public recovery capture; inverse held');
}

/** Drain admitted handlers before returning; an extra write remains an error after success. */
export function recoveryObservation() {
  const active = new Set(); let failure;
  return {
    fail(error) { failure ??= error; },
    run(action) {
      const task = Promise.resolve().then(action).catch(error => { failure ??= error; }).finally(() => active.delete(task));
      active.add(task); return task;
    },
    async drain() {
      while (active.size) await Promise.all([...active]);
      if (failure) throw failure;
    },
  };
}

/** Called before the runner authorizes any finally/cleanup path. */
export function assertRestoreBoundary(manifest, scope, before, scenario) {
  assert.deepEqual(manifest.scope, scope, 'Restore scope differs from original repository/stage/package/workspace identity');
  assert.equal(manifest.scenario, scenario, 'Restore requires original --scenario');
  assert.equal(manifest.beforeDigest, before.digest, 'Original before capture differs from manifest');
}

/** Cleanup consumes a durably verified receipt; it never replays an unknown mutation. */
export function assertRecoveryCleanup(before, current, journal) {
  assertRecoveryReceipt(before, journal, journal.forward);
  const state = assertRecoveryState(before, current, journal);
  if (journal.inverse) {
    assertRecoveryReceipt(before, journal, journal.inverse, true);
    assert.equal(state, 'original', 'Recorded inverse does not match current state; hold');
    return 'already-restored';
  }
  assert.equal(state, 'moved', 'No proven moved state to inverse');
  return 'move-down';
}
