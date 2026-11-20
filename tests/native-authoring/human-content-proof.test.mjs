import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proveHumanContentSave, fullHumanGenerationChanges, courseOwner, assertHumanSaveRequest, assertHumanAttemptsVerified, createHumanSaveAdmission } from './human-content-proof.mjs';
import { assertRestored } from './support.mjs';
const entry = { id: 'consultation', modelId: 'course', generation: 2, createdAt: 'created', updatedAt: 'before', lifecycle: 'published', values: { 'course-price': 'Original', 'course-order': 1, 'course-contact-option-label': 'Contact', generation: 'authored' } };
const snapshot = () => ({ providerId: 'content-filesystem', mutationToken: 7, models: [], entries: [{ ...structuredClone(entry), modelId: 'unrelated', generation: 3 }, structuredClone(entry)] });
const journal = () => ({ price: 'Original', changedPrice: 'Changed', order: '1', changedOrder: '99', label: 'Contact', changedLabel: 'New contact', humanContentWrites: [], humanContentAttempts: [] });
function transition(before, fieldId, value, phase) {
  const after = structuredClone(before); after.mutationToken++;
  const changed = after.entries[1]; changed.values[fieldId] = value; changed.generation = after.mutationToken; changed.updatedAt = 'after';
  const options = { request: { record: structuredClone(changed) }, status: 200, response: { ok: true }, fieldId, value, phase };
  return { after, options, proof: proveHumanContentSave(before, after, options), attempt: { status: 'verified', phase, fieldId, before: structuredClone(before), after: structuredClone(after), request: structuredClone(options.request), response: { status: 200, body: { ok: true } } } };
}
const workspace = source => ({ tokens: { content: source.mutationToken }, assets: [], publicFiles: [], project: { providers: { compositions: [], mappings: [], sitemaps: [], content: [{ id: source.providerId, models: source.models, entries: source.entries }] } } });
test('observed void Save plus public reads proves qualified owner global generation jump without modifying inputs', () => {
  const before = snapshot(), { after, options, proof } = transition(before, 'course-price', 'Changed', 'stage');
  const retained = structuredClone({ before, after, options });
  assert.equal(proof.beforeGeneration, 2); assert.equal(proof.generation, 8);
  assert.deepEqual({ before, after, options }, retained);
  assert.deepEqual(proof.modelId, courseOwner.modelId);
});
for (const kind of ['unrelated-generation', 'authored-generation', 'other-field', 'wrong-model', 'stale-before', 'extra-commit', 'unsafe-token', 'failed-response', 'wrong-request', 'noop']) test(`rejects ${kind}`, () => {
  const before = snapshot(), { after, options } = transition(before, 'course-price', 'Changed', 'stage');
  if (kind === 'unrelated-generation') after.entries[0].generation++;
  if (kind === 'authored-generation') after.entries[1].values.generation = 'lost';
  if (kind === 'other-field') after.entries[1].values['course-order'] = 3;
  if (kind === 'wrong-model') after.entries[1].modelId = 'wrong';
  if (kind === 'stale-before') before.mutationToken--;
  if (kind === 'extra-commit') { after.mutationToken++; after.entries[1].generation++; }
  if (kind === 'unsafe-token') { before.mutationToken = Number.MAX_SAFE_INTEGER; after.mutationToken = Number.MAX_SAFE_INTEGER + 1; after.entries[1].generation = after.mutationToken; }
  if (kind === 'failed-response') options.response.ok = false;
  if (kind === 'wrong-request') options.request.record.modelId = 'unrelated';
  if (kind === 'noop') { before.entries[1].values['course-price'] = 'Changed'; }
  assert.throws(() => proveHumanContentSave(before, after, options));
});
test('full six actual Save transitions and guarded restore authorize only returned final generation', () => {
  const initial = snapshot(), record = journal(); let current = initial;
  for (const [field, value, phase] of [['course-price', 'Changed', 'stage'], ['course-contact-option-label', 'New contact', 'stage'], ['course-order', 99, 'stage'], ['course-price', 'Original', 'restore'], ['course-contact-option-label', 'Contact', 'restore'], ['course-order', 1, 'restore']]) {
    const result = transition(current, field, value, phase); current = result.after; record.humanContentWrites.push(result.proof); record.humanContentAttempts.push(result.attempt);
  }
  const baseline = workspace(initial), after = workspace(current);
  const changes = fullHumanGenerationChanges(baseline, after, record);
  assert.equal(changes[0].generation, 13); assert.equal(assertRestored(baseline, after, changes).length, 1);
  for (const mutate of [r => r.humanContentWrites.pop(), r => r.humanContentWrites[1].generation++, r => r.humanContentWrites[0].modelId = 'unrelated', r => r.humanContentWrites[0].acknowledged = false, r => r.price = 'Invented original']) {
    const broken = structuredClone(record); mutate(broken); assert.throws(() => fullHumanGenerationChanges(baseline, after, broken));
  }
  const wrong = structuredClone(after); wrong.project.providers.content[0].entries[0].generation++;
  assert.throws(() => assertRestored(baseline, wrong, changes));
});
test('partial staged save followed by supported inverse is valid; noops authorize nothing', () => {
  const initial = snapshot(), record = journal(), changed = transition(initial, 'course-price', 'Changed', 'stage');
  record.humanContentWrites.push(changed.proof); record.humanContentAttempts.push(changed.attempt);
  assert.throws(() => fullHumanGenerationChanges(workspace(initial), workspace(changed.after), record));
  const restored = transition(changed.after, 'course-price', 'Original', 'restore'); record.humanContentWrites.push(restored.proof); record.humanContentAttempts.push(restored.attempt);
  assert.equal(fullHumanGenerationChanges(workspace(initial), workspace(restored.after), record)[0].generation, 9);
  assert.deepEqual(fullHumanGenerationChanges(workspace(initial), workspace(initial), { humanContentNoops: [{ phase: 'restore' }] }), []);
});

test('stale UI values are rejected before dispatch, including authored generation fields', () => {
  const before = snapshot(), result = transition(before, 'course-price', 'Changed', 'stage');
  assertHumanSaveRequest(before, result.options.request, 'course-price', 'Changed');
  for (const field of ['course-order', 'generation']) {
    const changed = structuredClone(before); changed.entries[1].values[field] = 'Intervening';
    assert.throws(() => assertHumanSaveRequest(changed, result.options.request, 'course-price', 'Changed'));
  }
});

test('unresolved and mismatched attempts block restoration before any inverse writes', () => {
  const initial = snapshot(), changed = transition(initial, 'course-price', 'Changed', 'stage');
  const complete = { humanContentWrites: [changed.proof], humanContentAttempts: [changed.attempt] };
  assertHumanAttemptsVerified(complete);
  for (const status of ['dispatching', 'responded', 'uncertain']) {
    const bad = structuredClone(complete); bad.humanContentAttempts[0].status = status;
    assert.throws(() => assertHumanAttemptsVerified(bad));
  }
  for (const mutate of [j => j.humanContentAttempts.push(changed.attempt), j => j.humanContentAttempts[0].error = 'late extra write', j => j.humanContentAttempts[0].after.mutationToken++, j => j.humanContentWrites[0].generation++]) {
    const bad = structuredClone(complete); mutate(bad); assert.throws(() => assertHumanAttemptsVerified(bad));
  }
});
test('final token must equal last proven save, including no-write runs', () => {
  const initial = snapshot(), baseline = workspace(initial), after = structuredClone(baseline); after.tokens.content++;
  assert.throws(() => fullHumanGenerationChanges(baseline, after, {}));
  const change = transition(initial, 'course-price', 'Changed', 'stage');
  const restore = transition(change.after, 'course-price', 'Original', 'restore');
  const record = { ...journal(), humanContentWrites: [change.proof, restore.proof], humanContentAttempts: [change.attempt, restore.attempt] };
  const final = workspace(restore.after); assert.equal(fullHumanGenerationChanges(baseline, final, record)[0].generation, 9);
  final.tokens.content++; assert.throws(() => fullHumanGenerationChanges(baseline, final, record));
});

test('write admission forwards only the first UI put-entry and refuses every extra dispatch', () => {
  const admission = createHumanSaveAdmission();
  assert.equal(admission.started, false); assert.equal(admission.admit(), true);
  assert.equal(admission.started, true); assert.equal(admission.unexpected, false);
  assert.equal(admission.admit(), false); assert.equal(admission.admit(), false);
  assert.equal(admission.unexpected, true);
});
