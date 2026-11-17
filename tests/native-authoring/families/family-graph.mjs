import assert from 'node:assert/strict';
export const FAMILY = {
  results: { route: '/results', parentModel: 'result-year', childModel: 'result-entry', referenceField: 'result-entry-year', referenceLabel: '年度', sourceParent: 'year-2015', page: 'results', tocOwner: 'results-toc', parentTemplate: 'results-year-year-2015', childTemplate: 'results-rows-year-2015', tocTemplate: 'results-toc-year-2015', parentComponent: 'pinsel.year-section', childComponent: 'pinsel.result-row', parentTitle: 'Results year', childTitle: 'Result row', parentBindings: [['年度','label'],['件数','count']], childBindings: [['大学名','school'],['学科','department'],['大学サイト','url']], tocBindings: [['年度','label'],['年度','href']], orderField: 'result-entry-order' },
  faq: { route: '/faq', parentModel: 'faq-group', childModel: 'faq-item', referenceField: 'faq-item-group', referenceLabel: 'カテゴリー', sourceParent: 'faq-exam', page: 'faq', tocOwner: 'faq-toc', parentTemplate: 'faq-category-faq-exam', childTemplate: 'faq-items-faq-exam', tocTemplate: 'faq-toc-faq-exam', parentComponent: 'pinsel.faq-category', childComponent: 'pinsel.faq-item', parentTitle: 'FAQ category', childTitle: 'FAQ item', parentBindings: [['カテゴリー名','title']], childBindings: [['質問','question'],['回答','answer']], tocBindings: [['カテゴリー名','label']], orderField: 'faq-item-order' },
};
export const records = (snapshot, domain, providerId) => snapshot.project.providers[domain].find(provider => provider.id === providerId)?.records ?? [];
export function inspectFamilySource(snapshot, kind) {
  const spec = FAMILY[kind]; assert(spec, 'Unknown family');
  const content = snapshot.project.providers.content.find(provider => provider.id === 'content-filesystem');
  const model = content.models.find(model => model.id === spec.childModel);
  assert.deepEqual(model.document.fields.find(field => field.id === spec.referenceField).target, { providerId: content.id, recordId: spec.parentModel });
  const compositions = records(snapshot, 'compositions', 'files');
  const mappings = records(snapshot, 'mappings', 'mapping-filesystem');
  const templates = [spec.parentTemplate, spec.childTemplate, spec.tocTemplate].map(id => compositions.find(record => record.id === id));
  assert(templates.every(Boolean));
  assert.deepEqual(templates.map(record => record.document.root.map(node => node.componentId)), [[spec.parentComponent], [spec.childComponent], ['pinsel.toc-item']]);
  const childMapping = mappings.find(record => record.id === spec.childTemplate);
  assert.deepEqual(childMapping.document.mode.query.conditions, [{ fieldId: spec.referenceField, operator: 'equals', value: { providerId: content.id, modelId: spec.parentModel, recordId: spec.sourceParent } }]);
  const page = compositions.find(record => record.id === spec.page);
  const toc = compositions.find(record => record.id === spec.tocOwner);
  const archive = page.document.root[0].slots.main.find(node => node.id === 'archive');
  assert.equal(archive.componentId, 'pinsel.archive-layout');
  assert.equal(toc.document.root[0].componentId, 'pinsel.toc');
  return { spec, templates, page, toc, placementCount: archive.slots.body.length, tocCount: toc.document.root[0].slots.items.length };
}
/** Check actual exported graph after UI operations; no private filesystem access. */
export function verifyFamily(snapshot, family, kind, {moved=false}={}) {
  const spec = FAMILY[kind];
  assert.equal(family.content.parent.providerId, 'content-filesystem');
  assert.equal(family.content.child.providerId, 'content-filesystem');
  const content = snapshot.project.providers.content.find(provider => provider.id === 'content-filesystem');
  const parent = content.entries.find(record => record.id === family.content.parent.recordId && record.modelId === family.content.parent.modelId);
  const child = content.entries.find(record => record.id === family.content.child.recordId && record.modelId === family.content.child.modelId);
  assert.equal(parent.modelId, spec.parentModel); assert.equal(child.modelId, spec.childModel);
  assert.equal(parent.lifecycle, 'published'); assert.equal(child.lifecycle, 'published');
  assert.deepEqual(child.values[spec.referenceField], moved?{providerId:'content-filesystem',modelId:spec.parentModel,recordId:spec.sourceParent}:family.content.parent);
  const mappings = records(snapshot, 'mappings', 'mapping-filesystem');
  for (const role of ['parent','child','toc']) {
    const mapping=mappings.find(record=>record.id===family.mappings[role].id);assert(mapping);
    assert.deepEqual(mapping.document.contentModel,{providerId:'content-filesystem',recordId:role==='child'?spec.childModel:spec.parentModel});
    assert.deepEqual(mapping.document.composition,{providerId:'files',recordId:family.compositions[role].id});
    assert.equal(mapping.document.mode.kind,'collection');
    assert.equal(mapping.document.mode.query.publication,'published-only');
    const composition=records(snapshot,'compositions','files').find(record=>record.id===family.compositions[role].id);
    assert.deepEqual(composition,family.compositions[role],'Descriptor must contain exact captured semantic composition');
    const model=content.models.find(m=>m.id===(role==='child'?spec.childModel:spec.parentModel));
    const expected=spec[`${role}Bindings`].map(([label,prop])=>({sourceFieldId:model.document.fields.find(f=>f.label===label).id,projection:{kind:'value'},target:{nodeId:composition.document.root[0].id,prop},transform:kind==='results'&&role==='toc'&&prop==='href'?{kind:'prefix',prefix:'#year-'}:{kind:'identity'}}));
    assert.deepEqual(mapping.document.bindings.map(({id,...binding})=>binding),expected);
    assert.deepEqual(mapping.document.mode.query.sort,role==='child'?[{fieldId:spec.orderField,direction:'asc'}]:[]);
  }
  const query = mappings.find(record => record.id === family.mappings.child.id).document.mode.query;
  assert.deepEqual(query.conditions, [{ fieldId: spec.referenceField, operator: 'equals', value: family.content.parent }]);
  assert.deepEqual(query.pins, [], 'Live membership must not become a finite pinned list');
  assert.equal(query.publication, 'published-only');
  assert.equal(query.limit, 1000);
  for (const role of ['parent','toc']) {
    const record = mappings.find(record => record.id === family.mappings[role].id);
    assert.deepEqual(record.document.mode.query.pins, [family.content.parent]);
    assert.deepEqual(record.document.mode.query.conditions, []);
    assert.equal(record.document.mode.query.limit, 1);
  }
  const page=records(snapshot,'compositions','files').find(r=>r.id===spec.page),toc=records(snapshot,'compositions','files').find(r=>r.id===spec.tocOwner);
  const archive=page.document.root[0].slots.main.find(n=>n.id==='archive');
  for(const [role,slot]of [['body',archive.slots.body],['toc',toc.document.root[0].slots.items]]){const actual=slot.filter(n=>n.id===family.placements[role].id);assert.equal(actual.length,1);assert.deepEqual(actual[0],family.placements[role]);assert.equal(actual[0].componentId,'pinsel.group');assert.deepEqual(actual[0].slots,{items:[]});}
  const expected = [
    { mapping: family.mappings.child.id, composition: family.compositions.parent.id, nodeId: family.compositions.parent.document.root[0].id, slotId: 'items' },
    { mapping: family.mappings.parent.id, composition: spec.page, nodeId: family.placements.body.id, slotId: 'items' },
    { mapping: family.mappings.toc.id, composition: spec.tocOwner, nodeId: family.placements.toc.id, slotId: 'items' },
  ];
  for (const edge of expected) {
    const matches = snapshot.project.collectionAttachments.filter(item => item.mapping.providerId === 'mapping-filesystem' && item.mapping.recordId === edge.mapping && item.composition.providerId === 'files' && item.composition.recordId === edge.composition && item.target.nodeId === edge.nodeId && item.target.slotId === edge.slotId);
    assert.equal(matches.length, 1, `Missing/duplicate owned attachment ${JSON.stringify(edge)}`);
  }
  return { parentId: parent.id, childId: child.id, edges: expected };
}
