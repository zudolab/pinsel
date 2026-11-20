import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCompositionOwnership } from './ownership-assertions.mjs';
const uuid = '40000000-0000-4000-8000-000000000001';
const paragraph = (id, text) => ({ id, componentId: 'pinsel.paragraph', componentVersion: 1, props: { text }, slots: {} });
function fixture(id) {
  const before = { assets: { files: [] }, publicFiles: [], project: { collectionAttachments: [], providers: {
    compositions: [{ id: 'files', records: [{ id: 'lessons', updatedAt: 'old', document: { root: [{ id: 'frame', componentId: 'frame', props: {}, slots: { main: [paragraph('local', 'Original'), paragraph('other', 'Untouched')], aside: [] } }] } }] }],
    content: [{ id: 'content', models: [], entries: [{ id: 'same-id', values: { price: 'Original' } }] }], mappings: [], sitemaps: [],
  } } };
  const journal = { spec: { id, domain: 'composition' }, target: { providerId: 'files', recordId: 'lessons', nodeId: id === 'local' ? 'local' : 'frame', capabilities: { insertSlots: [{ slotId: 'main', components: [{ id: 'pinsel.paragraph' }] }] } }, prop: 'text', old: 'Original', value: 'Changed', marker: 'Inserted' };
  const after = structuredClone(before);
  const frame = after.project.providers.compositions[0].records[0].document.root[0];
  if (id === 'local') frame.slots.main[0].props.text = 'Changed'; else frame.slots.main.push(paragraph(uuid, 'Inserted'));
  return { before, after, journal, frame };
}
for (const id of ['local', 'insert']) {
  test(`${id}: accepts only exact owner delta and timestamp changes without mutating captures`, () => {
    const f = fixture(id); f.after.project.providers.compositions[0].records[0].updatedAt = 'new';
    const retained = structuredClone(f); assertCompositionOwnership(f.before, f.after, f.journal); assert.deepEqual(f, retained);
  });
  for (const kind of ['content', 'other-field', 'mapping', 'attachment', 'assets', 'public', 'owner']) test(`${id}: rejects unrelated ${kind} mutation before Undo`, () => {
    const f = fixture(id);
    if (kind === 'content') f.after.project.providers.content[0].entries[0].values.price = 'Lost';
    if (kind === 'other-field') f.frame.slots.main[1].props.text = 'Lost';
    if (kind === 'mapping') f.after.project.providers.mappings.push({ id: 'mapping', records: [] });
    if (kind === 'attachment') f.after.project.collectionAttachments.push({ id: 'extra' });
    if (kind === 'assets') f.after.assets.files.push({ id: 'extra' });
    if (kind === 'public') f.after.publicFiles.push({ fileName: 'extra' });
    if (kind === 'owner') f.journal.target.providerId = 'foreign';
    assert.throws(() => assertCompositionOwnership(f.before, f.after, f.journal));
  });
}
for (const kind of ['slot', 'reorder', 'extra-prop', 'nested-child', 'duplicate-id', 'wrong-component', 'second-insert']) test(`insert: refuses ${kind}`, () => {
  const f = fixture('insert'), added = f.frame.slots.main[2];
  if (kind === 'slot') f.frame.slots.aside.push(f.frame.slots.main.pop());
  if (kind === 'reorder') [f.frame.slots.main[0], f.frame.slots.main[1]] = [f.frame.slots.main[1], f.frame.slots.main[0]];
  if (kind === 'extra-prop') added.props.shadow = true;
  if (kind === 'nested-child') added.slots.child = [paragraph('hidden', 'Hidden')];
  if (kind === 'duplicate-id') added.id = 'local';
  if (kind === 'wrong-component') added.componentId = 'other';
  if (kind === 'second-insert') f.frame.slots.main.push(paragraph('50000000-0000-4000-8000-000000000001', 'Inserted'));
  assert.throws(() => assertCompositionOwnership(f.before, f.after, f.journal));
});
