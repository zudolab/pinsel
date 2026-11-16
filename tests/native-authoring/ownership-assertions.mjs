import assert from 'node:assert/strict';
import { canonicalProject } from './support.mjs';

function nodes(project) {
  const result = [];
  const visit = items => { for (const node of items) { result.push(node); for (const children of Object.values(node.slots)) visit(children); } };
  for (const provider of project.providers.compositions) for (const record of provider.records) visit(record.document.root);
  return result;
}
function ownerNode(project, target) {
  const provider = project.providers.compositions.find(item => item.id === target.providerId);
  const record = provider?.records.find(item => item.id === target.recordId);
  assert(record, 'Selected qualified Composition owner is absent');
  const matches = nodes({ providers: { compositions: [{ records: [record] }] } }).filter(node => node.id === target.nodeId);
  assert.equal(matches.length, 1, 'Selected canonical node must resolve exactly once');
  return matches[0];
}
/** Verify the saved Composition delta before Undo can conceal an unintended write. */
export function assertCompositionOwnership(before, after, journal) {
  const a = canonicalProject(before), b = canonicalProject(after);
  const original = ownerNode(a, journal.target), saved = ownerNode(b, journal.target);
  assert.equal(journal.spec.domain, 'composition');
  if (journal.spec.id === 'local') {
    assert.equal(journal.prop, 'text');
    assert.equal(original.props.text, journal.old);
    assert.equal(saved.props.text, journal.value);
    assert.notEqual(journal.value, journal.old);
    saved.props.text = original.props.text;
  } else {
    assert.equal(journal.spec.id, 'insert');
    // This is the exact advertised slot used to construct the recorded insert prompt.
    const slot = journal.target.capabilities?.insertSlots.find(item => item.components.some(component => component.id === 'pinsel.paragraph'));
    assert(slot, 'Missing requested insertion slot');
    const priorChildren = original.slots[slot.slotId] ?? [];
    const nextChildren = saved.slots[slot.slotId];
    assert(Array.isArray(nextChildren));
    assert.equal(nextChildren.length, priorChildren.length + 1);
    const oldIds = new Set(nodes(a).map(node => node.id));
    const inserted = nextChildren.filter(node => !oldIds.has(node.id));
    assert.equal(inserted.length, 1, 'Expected one newly identified child in the requested slot');
    const node = inserted[0];
    assert.equal(typeof node.id, "string");
    assert(node.id.length > 0, "Inserted child needs a stable identity");
    assert.deepEqual(node, { id: node.id, componentId: 'pinsel.paragraph', componentVersion: 1, props: { text: journal.marker }, slots: {} });
    assert.equal(nodes(b).filter(item => item.id === node.id).length, 1, 'Inserted identity is duplicated');
    saved.slots[slot.slotId] = nextChildren.filter(item => item !== node);
    if (!Object.hasOwn(original.slots, slot.slotId)) delete saved.slots[slot.slotId];
  }
  assert.deepEqual(b, a, 'Composition Apply changed state beyond the exact selected field or insertion');
  assert.deepEqual(after.assets, before.assets, 'Composition Apply changed Assets');
  assert.deepEqual(after.publicFiles, before.publicFiles, 'Composition Apply changed public files');
}
