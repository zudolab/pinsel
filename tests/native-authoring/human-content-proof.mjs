import assert from 'node:assert/strict';
import { contentOwner } from './support.mjs';
export const courseOwner = { providerId: 'content-filesystem', modelId: 'course', entryId: 'consultation' };
export const courseFields = {
  '価格（表示）': { fieldId: 'course-price', original: 'price', changed: 'changedPrice' },
  'お問い合わせ 選択肢名': { fieldId: 'course-contact-option-label', original: 'label', changed: 'changedLabel' },
  '表示順': { fieldId: 'course-order', original: 'order', changed: 'changedOrder', numeric: true },
};
const project = snapshot => ({ providers: { content: [{ id: snapshot.providerId, models: snapshot.models, entries: snapshot.entries }] } });
const safeToken = token => assert(Number.isSafeInteger(token) && token >= 0, 'Invalid Content mutation token');
/** One observed Save may admit one write only; a second request is never forwarded. */
export function createHumanSaveAdmission() {
  let started = false, unexpected = false;
  return { get started() { return started; }, get unexpected() { return unexpected; }, admit() {
    if (started) { unexpected = true; return false; }
    started = true; return true;
  } };
}
/** Refuse a stale UI record before it can overwrite any unrelated current value. */
export function assertHumanSaveRequest(before, request, fieldId, value) {
  assert.equal(before.providerId, courseOwner.providerId); safeToken(before.mutationToken);
  const old = contentOwner(project(before), courseOwner);
  assert.equal(request.record?.id, courseOwner.entryId); assert.equal(request.record?.modelId, courseOwner.modelId);
  assert(Object.hasOwn(old.values, fieldId)); assert.notDeepEqual(old.values[fieldId], value);
  const expected = structuredClone(old), actual = structuredClone(request.record);
  expected.values[fieldId] = value;
  actual.updatedAt = expected.updatedAt; actual.generation = expected.generation;
  assert.deepEqual(actual, expected, 'UI Save would overwrite unrelated current entry state');
}
/** Supplemental proof from two public Content reads surrounding one observed successful UI save. */
export function proveHumanContentSave(before, after, { request, status, response, fieldId, value, phase }) {
  assert(['stage', 'restore', 'intervene', 'human-inverse'].includes(phase));
  assertHumanSaveRequest(before, request, fieldId, value);
  assert.equal(before.providerId, courseOwner.providerId); assert.equal(after.providerId, courseOwner.providerId);
  assert(status >= 200 && status < 300 && response?.ok === true, 'Human Save was not acknowledged successfully');
  safeToken(before.mutationToken); safeToken(after.mutationToken);
  assert.equal(after.mutationToken, before.mutationToken + 1, 'Human Save must be exactly one Content commit');
  const a = structuredClone(before), b = structuredClone(after);
  const old = contentOwner(project(a), courseOwner), saved = contentOwner(project(b), courseOwner);
  assert.equal(request.record.id, courseOwner.entryId); assert.equal(request.record.modelId, courseOwner.modelId);
  assert(Object.hasOwn(old.values, fieldId)); assert.notDeepEqual(old.values[fieldId], value, 'Only changed saves authorize generation');
  assert.deepEqual(saved.values[fieldId], value); assert.deepEqual(request.record.values, saved.values);
  safeToken(old.generation); assert(old.generation <= before.mutationToken);
  assert.equal(saved.generation, after.mutationToken);
  const proof = { ...courseOwner, fieldId, phase, beforeToken: before.mutationToken, generation: after.mutationToken,
    beforeGeneration: old.generation, beforeValue: old.values[fieldId], value, status, acknowledged: true };
  saved.values[fieldId] = old.values[fieldId]; saved.generation = old.generation; saved.updatedAt = old.updatedAt;
  b.mutationToken = a.mutationToken;
  assert.deepEqual(b, a, 'Human Save changed unrelated Content state');
  return proof;
}
/** An attempted dispatch must have its exact successful read/response proof before any inverse writes. */
export function assertHumanAttemptsVerified(journal) {
  const attempts = journal.humanContentAttempts ?? [], writes = journal.humanContentWrites ?? [];
  assert.equal(attempts.length, writes.length, 'Unreconciled human Content attempt');
  for (let index = 0; index < attempts.length; index++) {
    const attempt = attempts[index];
    assert.equal(attempt.status, 'verified', 'Uncertain Content Save retained; reconcile before any restoration write');
    assert(!attempt.error && attempt.after && attempt.response, 'Incomplete human Content attempt evidence');
    const proof = proveHumanContentSave(attempt.before, attempt.after, {
      request: attempt.request, status: attempt.response.status, response: attempt.response.body,
      fieldId: attempt.fieldId, value: attempt.request.record.values[attempt.fieldId], phase: attempt.phase,
    });
    assert.deepEqual(proof, writes[index], 'Human save proof differs from recorded request/read/response evidence');
  }
}
/** Only validated, recorded field transitions authorize generation differences in final restoration. */
export function fullHumanGenerationChanges(baseline, after, journal) {
  assertHumanAttemptsVerified(journal);
  const writes = journal.humanContentWrites ?? [];
  safeToken(after.tokens.content);
  if (!writes.length) { assert.equal(after.tokens.content, baseline.tokens.content, 'Unproven Content commit'); return []; }
  const initial = contentOwner(baseline.project, courseOwner);
  let token = baseline.tokens.content, generation = initial.generation;
  safeToken(token); safeToken(generation);
  const values = structuredClone(initial.values), phases = new Map();
  for (const write of writes) {
    assert.deepEqual({ providerId: write.providerId, modelId: write.modelId, entryId: write.entryId }, courseOwner);
    assert(write.acknowledged === true && write.status >= 200 && write.status < 300);
    safeToken(write.generation); safeToken(write.beforeToken); safeToken(write.beforeGeneration);
    assert.equal(write.beforeToken, token); assert.equal(write.generation, token + 1); assert.equal(write.beforeGeneration, generation);
    const field = Object.values(courseFields).find(item => item.fieldId === write.fieldId); assert(field, 'Unapproved human field');
    const convert = value => field.numeric ? Number(value) : value;
    const original = convert(journal[field.original]), changed = convert(journal[field.changed]);
    assert.deepEqual(initial.values[write.fieldId], original, 'Journal original differs from public baseline');
    assert.deepEqual(write.beforeValue, values[write.fieldId]);
    assert(['stage', 'restore'].includes(write.phase));
    if (write.phase === 'stage') {
      assert(!phases.has(write.fieldId), 'Repeated or out-of-order staged save');
      assert.deepEqual(write.beforeValue, original); assert.deepEqual(write.value, changed);
    } else {
      assert.equal(phases.get(write.fieldId), 'stage', 'Restore requires its recorded staged save');
      assert.deepEqual(write.beforeValue, changed); assert.deepEqual(write.value, original);
    }
    assert.notDeepEqual(write.beforeValue, write.value);
    phases.set(write.fieldId, write.phase); values[write.fieldId] = write.value;
    token = write.generation; generation = write.generation;
  }
  assert.deepEqual(values, initial.values, 'Recorded human saves have not restored original values');
  assert.equal(after.tokens.content, token, 'Final Content token differs from the last proven human save');
  return [{ ...courseOwner, generation, evidence: `human-content-save:commits-${writes.length}:tokens-${baseline.tokens.content}-${token}` }];
}
