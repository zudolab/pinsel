import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationSelection, assertNewRecord, assertBaselineContentRetained } from './routes-proof.mjs';
const before = { project: { providers: { content: [{ id: 'content-filesystem', models: [{ id: 'note' }], entries: [
  { id: 'old', modelId: 'note', lifecycle: 'published', values: { title: 'Retained' } },
  { id: 'unrelated', modelId: 'note', lifecycle: 'draft', values: { title: 'Private' } },
] }] } } };
const ref = { providerId: 'content-filesystem', modelId: 'note', recordId: 'new-id' };
test('first activation selects reviewed published baseline and only requested new identities', () => {
  assert.deepEqual(publicationSelection(before, [ref], { firstActivation: true }).map(x => x.recordId), ['old', 'new-id']);
  assert.deepEqual(publicationSelection(before, [ref]).map(x => x.recordId), ['new-id']);
});
test('creation refuses an existing identity or wrong model/lifecycle', () => {
  assert.deepEqual(assertNewRecord(before, 'note', { id: 'new-id', modelId: 'note', lifecycle: 'draft' }), ref);
  for (const record of [{ id: 'old', modelId: 'note', lifecycle: 'draft' }, { id: 'new', modelId: 'course', lifecycle: 'draft' }, { id: 'new', modelId: 'note', lifecycle: 'published' }]) assert.throws(() => assertNewRecord(before, 'note', record));
});
test('baseline audit catches dropped entries, fields, publication and models', () => {
  assertBaselineContentRetained(before, structuredClone(before));
  for (const mutate of [x => x.entries.pop(), x => { x.entries[0].values.title = 'Lost'; }, x => { x.entries[0].lifecycle = 'draft'; }, x => x.models.pop()]) {
    const after = structuredClone(before); mutate(after.project.providers.content[0]);
    assert.throws(() => assertBaselineContentRetained(before, after));
  }
});
