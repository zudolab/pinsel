import { test } from 'node:test';
import assert from 'node:assert/strict';
import { continueContentRequest, readBrowserContent, contentRequestDiagnostic } from './content-browser-transport.mjs';
function fixture() {
  const request = { url: () => 'http://local/__zudo_composer_content_provider', method: () => 'POST', headers: () => ({ origin: 'http://local', 'x-zudo-composer-capability': 'test', 'x-zudo-composer-workspace': 'test', 'x-zudo-native-client': 'test', 'x-zudo-native-epoch': '1' }), redirectedFrom: () => null, redirectedTo: () => null };
  const response = { request: () => request, url: request.url, finished: async () => null }; request.response = async () => response;
  const state = { writes: 0, reads: 0 };
  const page = { url: () => 'http://local/content', evaluate: async (_, args) => { state.reads++; assert(!('origin' in args.headers)); assert(!('sec-fetch-site' in args.headers)); return { ok: true, body: { ok: true, result: {} } }; } };
  const route = { request: () => request, continue: async () => { state.writes++; } };
  return { request, response, state, page, route };
}
test('cross-origin, wrong endpoint and absent Origin refuse before read or write', async () => {
  for (const change of [f => { f.request.url = () => 'http://elsewhere/__zudo_composer_content_provider'; }, f => { f.request.url = () => 'http://local/other'; }, f => { f.request.headers = () => ({}); }]) {
    const f = fixture(); change(f);
    await assert.rejects(continueContentRequest(f.page, f.route, 20)); await assert.rejects(readBrowserContent(f.page, f.request, 20));
    assert.deepEqual(f.state, { writes: 0, reads: 0 });
  }
});
test('exact response identity, redirect and failed completion refuse proof after one dispatch', async () => {
  for (const change of [f => { f.response.request = () => ({}); }, f => { f.request.redirectedTo = () => ({}); }, f => { f.response.finished = async () => 'failed'; }]) {
    const f = fixture(); change(f); await assert.rejects(continueContentRequest(f.page, f.route, 20)); assert.equal(f.state.writes, 1);
  }
});
test('uncertain response timeout never replays original request', async () => {
  const f = fixture(); f.request.response = () => new Promise(() => {});
  await assert.rejects(continueContentRequest(f.page, f.route, 10), /reconciliation/); assert.equal(f.state.writes, 1);
});
test('read reuses only observed auth headers and refuses absent session evidence', async () => {
  const f = fixture(); await readBrowserContent(f.page, f.request, 20); assert.equal(f.state.reads, 1); assert.equal(f.state.writes, 0);
  const original = f.request.headers(); delete original['x-zudo-native-epoch']; f.request.headers = () => original;
  await assert.rejects(readBrowserContent(f.page, f.request, 20)); assert.equal(f.state.reads, 1);
});

test('request diagnostics retain only safe qualified metadata, never headers, values or query', () => {
  const f = fixture(); f.request.url = () => 'http://local/__zudo_composer_content_provider?secret=excluded';
  f.request.postDataJSON = () => ({ entry: { providerId: 'content-filesystem', modelId: 'course', recordId: 'consultation', secret: 'excluded' }, record: { modelId: 'course', id: 'consultation', values: { secret: 'excluded' } } });
  const result = contentRequestDiagnostic(f.request);
  assert.deepEqual(result.entry, { providerId: 'content-filesystem', modelId: 'course', recordId: 'consultation' });
  assert.equal(result.path, '/__zudo_composer_content_provider');
  assert(!JSON.stringify(result).includes('excluded')); assert(!JSON.stringify(result).includes('capability'));
});
