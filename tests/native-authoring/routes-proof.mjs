import assert from 'node:assert/strict';
export const refKey = ref => JSON.stringify([ref.providerId, ref.modelId, ref.recordId]);
export function contentRefs(snapshot, lifecycle) {
  return snapshot.project.providers.content.flatMap(provider => provider.entries
    .filter(entry => !lifecycle || entry.lifecycle === lifecycle)
    .map(entry => ({ providerId: provider.id, modelId: entry.modelId, recordId: entry.id })));
}
/** First activation has no baseline. Preserve reviewed published entries, never unrelated drafts. */
export function publicationSelection(before, requested, { firstActivation = false } = {}) {
  const selected = new Map();
  for (const ref of [...(firstActivation ? contentRefs(before, 'published') : []), ...requested]) {
    assert(ref.providerId && ref.modelId && ref.recordId, 'Incomplete qualified Content reference');
    selected.set(refKey(ref), ref);
  }
  return [...selected.values()];
}
export function assertNewRecord(before, modelId, record) {
  assert.equal(record.modelId, modelId);
  assert.equal(record.lifecycle, 'draft');
  assert(record.id && !contentRefs(before).some(ref => ref.providerId === 'content-filesystem' && ref.recordId === record.id), 'Create did not allocate a fresh identity');
  return { providerId: 'content-filesystem', modelId, recordId: record.id };
}
export function assertBaselineContentRetained(before, after) {
  for (const provider of before.project.providers.content) {
    const current = after.project.providers.content.find(item => item.id === provider.id);
    assert(current, `Missing provider ${provider.id}`);
    assert.deepEqual(current.models, provider.models, 'Release changed model definitions');
    for (const entry of provider.entries) {
      const retained = current.entries.find(item => item.id === entry.id && item.modelId === entry.modelId);
      assert(retained, `Missing ${provider.id}/${entry.modelId}/${entry.id}`);
      assert.deepEqual(retained.values, entry.values, `Baseline values changed: ${entry.id}`);
      assert.equal(retained.lifecycle, entry.lifecycle, `Baseline lifecycle changed: ${entry.id}`);
    }
  }
}
