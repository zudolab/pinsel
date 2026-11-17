import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { observeAssistantHumanSave, assertAssistantHumanJournalSettled, assertAssistantRunHumanSettled, assertAssistantHumanCapture } from './assistant-human-save.mjs';
const field = 'course-price';
function fixture() {
  const entry = { id: 'consultation', modelId: 'course', generation: 1, updatedAt: 'old', lifecycle: 'published', values: { [field]: 'Original', generation: 'authored' } };
  const content = { providerId: 'content-filesystem', mutationToken: 7, models: [], entries: [entry] };
  const prior = { digest: 'before', tokens: { content: 7 }, assets: {}, publicFiles: [], project: { providers: { content: [{ id: content.providerId, models: [], entries: [structuredClone(entry)] }], compositions: [], mappings: [], sitemaps: [] } } };
  const journal = { providerId: content.providerId, entryId: 'consultation', spec: { id: 'course-stale', modelId: 'course', domain: 'content' }, old: 'Original', value: 'AI changed', marker: 'Marker' };
  const value = 'Marker human intervening';
  const after = structuredClone(content); after.mutationToken = 8; after.entries[0].generation = 8; after.entries[0].updatedAt = 'new'; after.entries[0].values[field] = value;
  const request = { record: structuredClone(after.entries[0]) };
  let handler, reads = 0; const saved = [];
  const response = { ok: () => true, status: () => 200, json: async () => ({ ok: true }) };
  const page = {
    url: () => 'http://local/content', unroutes: 0, readError: false, evaluate: async () => { reads++; if (page.readError && reads === 2) throw Error('post-write read lost'); return { ok: true, body: { ok: true, result: structuredClone(reads === 1 ? content : after) } }; },
    async route(_, value) { handler = value; }, async unroute() { this.unroutes++; handler = undefined; },
    async send(operation = 'put-entry', options = {}) {
      const state = { fetched: 0, aborted: 0, fulfilled: 0, continued: 0 };
      let actualResponse;
      const req = { headers: () => ({ 'x-zudo-composer-operation': operation, origin: 'http://local', 'x-zudo-native-epoch': '3', 'x-zudo-native-client': 'test', 'x-zudo-composer-capability': 'test', 'x-zudo-composer-workspace': 'test' }), method: () => 'POST', url: () => 'http://local/__zudo_composer_content_provider', postDataJSON: () => request,
        response: async () => actualResponse, redirectedFrom: () => null, redirectedTo: () => null };
      const route = { request: () => req, async abort() { state.aborted++; }, async continue() { state.continued++; if (operation !== 'put-entry') return; state.fetched++; const value = options.fetch ? await options.fetch() : response; actualResponse = { ...value, request: () => req, url: req.url, finished: async () => null }; } };
      return { state, done: handler(route) };
    },
  };
  const options = { journal, prior, beforeCapture: 'prior.json', phase: 'intervene', current: 'Original', value, persist: async () => { saved.push(structuredClone(journal)); }, action: async () => { await page.send(); }, waitSaved: async () => {}, dispatchTimeoutMs: 15, requestTimeoutMs: 60 };
  const capturedAfter = () => { const result = structuredClone(prior); result.digest = 'after'; result.tokens.content = after.mutationToken; result.project.providers.content[0].entries = structuredClone(after.entries); return result; };
  return { content, prior, journal, after, request, page, options, saved, response, capturedAfter };
}
test('actual human Save proves qualified owner/token and exact post-save public capture', async () => {
  const f = fixture(), proof = await observeAssistantHumanSave(f.page, f.options);
  assert.equal(proof.generation, 8); assert.equal(proof.beforeGeneration, 1);
  assertAssistantHumanJournalSettled(f.journal); assertAssistantHumanCapture(f.prior, f.capturedAfter(), f.journal, 'prior.json');
  assert(f.saved.some(journal => journal.humanContentAttempts?.[0].status === 'dispatching'));
  assert.equal(f.page.unroutes, 1);
  const wrong = f.capturedAfter(); wrong.project.providers.mappings.push({ id: 'unrelated', records: [] });
  assert.throws(() => assertAssistantHumanCapture(f.prior, wrong, f.journal, 'prior.json'));
});
test('post-write response/read loss retains unresolved evidence and blocks every run-scope inverse', async () => {
  const f = fixture(); f.page.readError = true;
  await assert.rejects(observeAssistantHumanSave(f.page, f.options), /post-write read lost/);
  assert.equal(f.journal.humanContentAttempts[0].status, 'uncertain'); assert(f.journal.humanContentAttempts[0].response.body.ok);
  assert.equal(f.page.unroutes, 0); assert.throws(() => assertAssistantHumanJournalSettled(f.journal));
  const root = await mkdtemp(join(tmpdir(), 'assistant-human-guard-'));
  try {
    await writeFile(join(root, 'assistant-course-stale.json'), JSON.stringify(f.journal));
    await writeFile(join(root, 'assistant-note.json'), JSON.stringify({ spec: { domain: 'content' } }));
    let writes = 0;
    await assert.rejects(async () => { await assertAssistantRunHumanSettled(root); writes++; });
    assert.equal(writes, 0);
  } finally { await rm(root, { recursive: true }); }
});
test('dispatch timeout retains an append-only attempt and refuses late writes', async () => {
  const f = fixture(); f.options.action = async () => {};
  await assert.rejects(observeAssistantHumanSave(f.page, f.options), /dispatch timed out/);
  const retained = structuredClone(f.journal); const late = await f.page.send(); await late.done;
  assert.equal(late.state.fetched, 0); assert.equal(f.journal.humanContentAttempts.length, retained.humanContentAttempts.length);
  let called = false;
  await assert.rejects(observeAssistantHumanSave(f.page, { ...f.options, phase: 'human-inverse', action: async () => { called = true; } }));
  assert.equal(called, false); assert.equal(f.page.unroutes, 0);
});
test('extra canonical mutation is refused; admitted outcome is retained rather than retried', async () => {
  const f = fixture(); let release, first, extra; const delayed = new Promise(resolve => { release = resolve; });
  f.options.action = async () => { first = await f.page.send('put-entry', { fetch: () => delayed }); await new Promise(resolve => setTimeout(resolve, 1)); extra = await f.page.send('delete-entry'); await extra.done; release(f.response); };
  await assert.rejects(observeAssistantHumanSave(f.page, f.options));
  assert.equal(extra.state.fetched, 0); assert.equal(extra.state.aborted, 1); assert.equal(first.state.fetched, 1);
  assert.throws(() => assertAssistantHumanJournalSettled(f.journal));
});
test('stale prior capture refuses before dispatch; invalid authored generation stays strict', async () => {
  const f = fixture(); f.content.entries[0].values.generation = 'intervening'; let sent;
  f.options.action = async () => { sent = await f.page.send(); };
  await assert.rejects(observeAssistantHumanSave(f.page, f.options), /Content changed/); assert.equal(sent.state.fetched, 0);
});
test('UI badge failure after verified public read-back is retained without fabricating uncertainty', async () => {
  const f = fixture(); f.options.waitSaved = async () => { throw Error('UI badge timed out'); };
  await assert.rejects(observeAssistantHumanSave(f.page, f.options), /UI badge/);
  assert.equal(f.journal.humanContentAttempts[0].status, 'verified'); assert(f.journal.humanContentAttempts[0].uiError);
  assertAssistantHumanJournalSettled(f.journal); assert.equal(f.page.unroutes, 0);
});
test('repeated supported inverse no-op sends no request and authorizes no generation change', async () => {
  const f = fixture(); let called = false;
  const result = await observeAssistantHumanSave(f.page, { ...f.options, phase: 'human-inverse', value: 'Original', action: async () => { called = true; } });
  assert.equal(result, null); assert.equal(called, false); assert.equal(f.journal.humanContentAttempts, undefined);
  assertAssistantHumanCapture(f.prior, structuredClone(f.prior), f.journal, 'prior.json');
  const changed = structuredClone(f.prior); changed.tokens.content++;
  assert.throws(() => assertAssistantHumanCapture(f.prior, changed, f.journal, 'prior.json'));
});
test('legacy predicted or tampered proof cannot authorize inverse', async () => {
  assert.throws(() => assertAssistantHumanJournalSettled({ humanWrites: [{ changed: true, saved: true, expectedContentToken: 8 }] }));
  const f = fixture(); await observeAssistantHumanSave(f.page, f.options);
  f.journal.humanContentWrites[0].generation++;
  assert.throws(() => assertAssistantHumanJournalSettled(f.journal));
});
test('admitted slow save outlives dispatch timer and completes exactly once', async () => {
  const f = fixture(); let sent;
  f.options.action = async () => { sent = await f.page.send('put-entry', { fetch: async () => { await new Promise(resolve => setTimeout(resolve, 35)); return f.response; } }); };
  await observeAssistantHumanSave(f.page, f.options); assert.equal(sent.state.fetched, 1); assertAssistantHumanJournalSettled(f.journal);
});
test('refused operation during before-read retains exact cause and safe append-only diagnostics', async () => {
  const f = fixture(); let release, first, extra;
  const evaluate = f.page.evaluate; const pending = new Promise(resolve => { release = resolve; });
  f.page.evaluate = async (...args) => { await pending; return evaluate(...args); };
  f.options.action = async () => {
    first = await f.page.send(); await new Promise(resolve => setTimeout(resolve, 1));
    extra = await f.page.send('content-ai-prepare'); await extra.done; release();
  };
  await assert.rejects(observeAssistantHumanSave(f.page, f.options), /interrupted before dispatch/);
  const attempt = f.journal.humanContentAttempts[0];
  assert.equal(first.state.fetched, 0); assert.equal(extra.state.fetched, 0);
  assert.match(attempt.error, /operation-not-admitted \(content-ai-prepare\)/);
  assert.deepEqual(attempt.diagnostics.map(item => item.event), ['admitted', 'refused', 'observer-failed']);
  assert.equal(attempt.diagnostics[1].operation, 'content-ai-prepare');
  assert.equal(attempt.diagnostics[1].method, 'POST');
  assert.equal(attempt.diagnostics[1].path, '/__zudo_composer_content_provider');
  const metadata = JSON.stringify(attempt.diagnostics);
  assert(!metadata.includes('x-zudo')); assert(!metadata.includes('Original')); assert(!metadata.includes('values'));
  assert.throws(() => assertAssistantHumanJournalSettled(f.journal));
});

test('observed Content-AI scope read does not consume or interrupt the one Save admission', async () => {
  const f = fixture(); let release, first, scope;
  const evaluate = f.page.evaluate; const pending = new Promise(resolve => { release = resolve; });
  f.page.evaluate = async (...args) => { await pending; return evaluate(...args); };
  f.options.action = async () => { first = await f.page.send(); await new Promise(resolve => setTimeout(resolve, 1)); scope = await f.page.send('content-ai-scope'); await scope.done; release(); };
  const proof = await observeAssistantHumanSave(f.page, f.options);
  assert.equal(proof.generation, 8); assert.equal(scope.state.continued, 1); assert.equal(scope.state.aborted, 0); assert.equal(first.state.fetched, 1);
  assertAssistantHumanJournalSettled(f.journal);
});
test('same-server inverse uses the last verified public Content read without inventing workspace digest', async () => {
  const f = fixture(); await observeAssistantHumanSave(f.page, f.options);
  const g = fixture(); Object.assign(g.content, structuredClone(f.after));
  g.after.mutationToken = 9; g.after.entries[0].generation = 9; g.after.entries[0].values[field] = 'Original';
  g.request.record = structuredClone(g.after.entries[0]);
  await observeAssistantHumanSave(g.page, { ...g.options, journal: f.journal, phase: 'human-inverse', current: f.options.value, value: 'Original', prior: undefined, priorContent: structuredClone(f.after) });
  const inverse = f.journal.humanContentAttempts[1];
  assert.equal(inverse.evidenceKind, 'public-content-read'); assert.equal(inverse.beforeDigest, null);
  assert.deepEqual(inverse.before, f.after); assertAssistantHumanJournalSettled(f.journal);
  for (const baseline of [{ prior: f.prior, priorContent: f.content }, { prior: undefined, priorContent: undefined }, { prior: undefined, priorContent: f.content }]) {
    const h = fixture(); let called = false;
    await assert.rejects(observeAssistantHumanSave(h.page, { ...h.options, ...baseline, action: async () => { called = true; } }));
    assert.equal(called, false);
  }
});
test('live inverse rejects missing, unresolved, or mismatched prior public proof before any action', async () => {
  const f = fixture(); await observeAssistantHumanSave(f.page, f.options);
  for (const kind of ['missing', 'unresolved', 'mismatched']) {
    const journal = structuredClone(f.journal), priorContent = structuredClone(f.after);
    if (kind === 'missing') { journal.humanContentAttempts = []; journal.humanContentWrites = []; }
    if (kind === 'unresolved') journal.humanContentAttempts[0].status = 'uncertain';
    if (kind === 'mismatched') priorContent.entries[0].values[field] = 'Foreign value';
    let called = false;
    await assert.rejects(observeAssistantHumanSave(f.page, { ...f.options, journal, phase: 'human-inverse', current: f.options.value, value: 'Original', prior: undefined, priorContent, action: async () => { called = true; } }));
    assert.equal(called, false, kind);
  }
});
