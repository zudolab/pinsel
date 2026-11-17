import test from 'node:test';
import assert from 'node:assert/strict';
import { contentFieldPlan, markdownLinesText, createDraftSettlement, isAdmittedDraftSave, isProviderRead } from './routes-fields.mjs';
import { assertOnlyNewContentDrafts } from './routes-proof.mjs';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('required labels use stable schema IDs and exact Markdown names before editing', () => {
  const model = { fields: [{ id: 'slug', label: 'URL スラッグ', kind: 'slug', required: true }, { id: 'body', label: '本文（Markdown）', kind: 'markdown', required: true }] };
  const plans = contentFieldPlan(model, { 'URL スラッグ': 'independent-slug', '本文（Markdown）': 'body' });
  assert.equal(plans[0].id, 'content-entry-slug');
  assert(plans[1].name.test('本文（Markdown）')); assert(plans[1].name.test('本文（Markdown） *'));
  assert(!plans[1].name.test('本文（Markdown） formatted preview'));
  assert.throws(() => contentFieldPlan(model, { missing: 'value' }));
  assert.throws(() => contentFieldPlan({ fields: [...model.fields, model.fields[0]] }, { 'URL スラッグ': 'x' }));
});
test('CodeMirror line elements retain blank lines without textContent concatenation', () => {
  const lines = ['# Heading', '', 'Body.', '', '## Second heading', '', 'Tail.'];
  assert.equal(markdownLinesText(lines), '# Heading\n\nBody.\n\n## Second heading\n\nTail.');
  assert.throws(() => markdownLinesText([]));
});
test('boolean authoring is explicit, never a model default or coerced text', () => {
  const model = { fields: [{ id: 'featured', label: 'Featured', kind: 'boolean', required: true }] };
  assert.equal(contentFieldPlan(model, { Featured: true })[0].value, true);
  assert.equal(contentFieldPlan(model, { Featured: false })[0].value, false);
  assert.throws(() => contentFieldPlan(model, { Featured: 'false' }));
  assert(!('default' in model.fields[0]));
});
test('late response uncertainty blocks completion and following model changes', async () => {
  const gate = createDraftSettlement(), pending = deferred(); gate.track(pending.promise);
  let advanced = false; const next = gate.beforeAdvance().then(() => { advanced = true; });
  pending.reject(Error('uncertain response')); await assert.rejects(next, /uncertain response/);
  assert.equal(advanced, false); await assert.rejects(gate.beforeAdvance(), /uncertain response/);
});
test('refused additional mutation remains held after admitted response completes', async () => {
  const gate = createDraftSettlement(), pending = deferred(); gate.track(pending.promise);
  gate.hold('unexpected write'); pending.resolve(); await assert.rejects(gate.beforeAdvance(), /unexpected write/);
});
test('successful responses must settle before advancement', async () => {
  const gate = createDraftSettlement(), pending = deferred(); gate.track(pending.promise);
  let advanced = false; const next = gate.beforeAdvance().then(() => { advanced = true; });
  await Promise.resolve(); assert.equal(advanced, false); pending.resolve(); await next; assert(advanced);
});
test('draft admission is qualified, lifecycle-bound and excludes a read-only Note', () => {
  const refs = [{ providerId: 'content-filesystem', modelId: 'course', recordId: 'new-course' }];
  const record = { modelId: 'course', id: 'new-course', lifecycle: 'draft' };
  assert(isAdmittedDraftSave({ record }, refs));
  for (const change of [{ modelId: 'note' }, { id: 'old-course' }, { lifecycle: 'published' }]) assert(!isAdmittedDraftSave({ record: { ...record, ...change } }, refs));
  assert(!isAdmittedDraftSave({ record }, [{ ...refs[0], providerId: 'foreign' }]));
});
test('exact new-draft proof rejects extra records, changed old metadata and changed values', () => {
  const ref = { providerId: 'content-filesystem', modelId: 'note', recordId: 'uuid-note' };
  const before = { digest: 'before', project: { providers: { content: [{ id: ref.providerId, models: [{ id: 'note' }], entries: [{ id: 'old', modelId: 'note', lifecycle: 'published', values: { body: 'retain' }, generation: 1 }] }] } }, tokens: { content: 1, workspace: 3 }, assets: {}, publicFiles: [] };
  const after = structuredClone(before); after.digest = 'after'; after.tokens.content = 2;
  after.project.providers.content[0].entries.push({ id: ref.recordId, modelId: ref.modelId, lifecycle: 'draft', values: { slug: 'not-the-id', body: '# Heading\n\nBody' } });
  const expected = [{ ref, values: { slug: 'not-the-id', body: '# Heading\n\nBody' } }];
  assert(assertOnlyNewContentDrafts(before, after, expected).originalProjectExact);
  for (const mutate of [s => s.project.providers.content[0].entries[0].generation++, s => s.project.providers.content[0].entries[1].values.body = 'changed', s => s.project.providers.content[0].entries.push({ id: 'extra' }), s => s.tokens.workspace++]) {
    const changed = structuredClone(after); mutate(changed); assert.throws(() => assertOnlyNewContentDrafts(before, changed, expected));
  }
});

test('provider reads are explicit and non-prefix canonical mutations remain refused', () => {
  assert(isProviderRead('/__zudo_composer_content_provider', 'initialize'));
  assert(isProviderRead('/__zudo_composer_content_provider', 'content-ai-scope'));
  assert(isProviderRead('/__zudo_composer_asset_file_provider', 'get'));
  for (const op of ['reconcile-publication', 'editorial-apply', 'editorial-undo', 'unknown-operation']) assert(!isProviderRead('/__zudo_composer_content_provider', op));
  assert(!isProviderRead('/__zudo_composer_asset_file_provider', 'metadata'));
  assert(!isProviderRead('/__zudo_composer_workspace_provider', 'complete'));
  assert(!isProviderRead('/__zudo_composer_unknown_provider', 'initialize'));
});

test('installed provider guard aborts non-prefix writes and retains refusal for later saves', async () => {
  const { installDraftWriteGuard } = await import('./routes.mjs');
  let handler; const events = [], refs = [{ providerId: 'content-filesystem', modelId: 'course', recordId: 'new-course' }];
  const gate = await installDraftWriteGuard({ route: async (_pattern, callback) => { handler = callback; } }, { getRefs: () => refs, persist: async event => { events.push(event); } });
  const call = async operation => {
    let continued = false, aborted = false;
    const request = { url: () => 'http://127.0.0.1:4194/__zudo_composer_content_provider', headers: () => ({ 'x-zudo-composer-operation': operation }), postDataJSON: () => ({ record: { id: 'new-course', modelId: 'course', lifecycle: 'draft' } }) };
    await handler({ request: () => request, continue: async () => { continued = true; }, abort: async () => { aborted = true; } });
    return { continued, aborted };
  };
  assert.deepEqual(await call('content-ai-scope'), { continued: true, aborted: false });
  assert.deepEqual(await call('editorial-apply'), { continued: false, aborted: true });
  assert.deepEqual(await call('put-entry'), { continued: false, aborted: true });
  await assert.rejects(gate.beforeAdvance(), /Unexpected canonical write/);
  assert.equal(events.length, 2);
});
test('new entry cannot bypass a prior held writer by installing its creation observer', async () => {
  const { createContentEntry } = await import('./routes.mjs');
  const settlement = createDraftSettlement(); settlement.hold('previous save uncertain');
  await assert.rejects(createContentEntry({}, { settlement }), /previous save uncertain/);
});

test('missing boolean false uses one explicit No action, never a toggle workaround', async () => {
  const { editContentBoolean } = await import('./routes-fields.mjs');
  const actions = [];
  const control = { isChecked: async () => false, press: async key => { actions.push(key); } };
  const no = { count: async () => 1, isVisible: async () => true, isEnabled: async () => true, click: async () => { actions.push('set-no'); } };
  assert.equal(await editContentBoolean(control, no, false), 'set-no');
  assert.deepEqual(actions, ['set-no']);
});
test('existing false is a no-op and existing true toggles to false once', async () => {
  const { editContentBoolean } = await import('./routes-fields.mjs');
  const actions = [], no = { count: async () => 0 };
  assert.equal(await editContentBoolean({ isChecked: async () => false }, no, false), 'none');
  assert.equal(await editContentBoolean({ isChecked: async () => true, press: async key => { actions.push(key); } }, no, false), 'toggle');
  assert.deepEqual(actions, ['Space']);
});
test('unset true uses the normal switch; ambiguous or disabled unset No refuses', async () => {
  const { editContentBoolean, booleanContentAction } = await import('./routes-fields.mjs');
  const actions = [];
  const control = { isChecked: async () => false, press: async key => { actions.push(key); } };
  assert.equal(await editContentBoolean(control, { count: async () => 1 }, true), 'toggle');
  assert.deepEqual(actions, ['Space']);
  assert.throws(() => booleanContentAction({ value: false, checked: false, unsetChoices: 2 }));
  assert.throws(() => booleanContentAction({ value: false, checked: true, unsetChoices: 1 }));
  await assert.rejects(editContentBoolean(control, { count: async () => 1, isVisible: async () => true, isEnabled: async () => false }, false), /unavailable/);
  assert.deepEqual(actions, ['Space']);
});
