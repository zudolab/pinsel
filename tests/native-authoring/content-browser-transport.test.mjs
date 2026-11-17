import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import { observeContentCreation } from './creation-observer.mjs';
import { continueContentRequest, readBrowserContent } from './content-browser-transport.mjs';
// Disposable strict-origin HTTP fixture only. No Composer process or authoring store.
test('original browser transport preserves security metadata without fabricating it', async () => {
  let origin, writes = 0, reads = 0;
  const server = createServer(async (req, res) => {
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<title>Content transport fixture</title>'); return; }
    res.setHeader('content-type', 'application/json');
    if (req.url !== '/__zudo_composer_content_provider' || req.method !== 'POST' || req.headers.origin !== origin || req.headers['sec-fetch-site'] !== 'same-origin' || `http://${req.headers.host}` !== origin) { res.writeHead(403); res.end(JSON.stringify({ ok: false, error: 'origin-rejected' })); return; }
    if (req.headers['x-zudo-composer-capability'] !== 'fixture' || req.headers['x-zudo-native-epoch'] !== '1') { res.writeHead(401); res.end('{}'); return; }
    for await (const _ of req) { /* Consume fixture request. */ }
    const operation = req.headers['x-zudo-composer-operation'];
    if (operation === 'put-entry') writes++; else reads++;
    res.end(JSON.stringify({ ok: true, ...(operation === 'read-all' ? { result: { mutationToken: writes } } : {}) }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.NATIVE_ACCEPTANCE_CHROMIUM || chromium.executablePath() });
  try {
    const page = await browser.newPage(); await page.goto(origin);
    const headers = { 'content-type': 'application/json', 'x-zudo-composer-capability': 'fixture', 'x-zudo-composer-workspace': 'fixture', 'x-zudo-native-client': 'fixture', 'x-zudo-native-epoch': '1' };
    const request = (operation, body = '') => page.evaluate(async ({ headers, operation, body }) => { const response = await fetch('/__zudo_composer_content_provider', { method: 'POST', headers: { ...headers, 'x-zudo-composer-operation': operation }, body }); return { status: response.status, body: await response.json() }; }, { headers, operation, body });
    const pattern = '**/__zudo_composer_content_provider';
    // Red-before proof: the old replay drops browser-only metadata even on a read.
    await page.route(pattern, async route => { const response = await route.fetch(); assert.equal(response.status(), 403); await route.fulfill({ response }); });
    assert.equal((await request('get-model')).status, 403); assert.equal(writes, 0); await page.unroute(pattern);
    let supplemental, complete; const observed = new Promise(resolve => { complete = resolve; });
    await page.route(pattern, async route => {
      if (route.request().headers()['x-zudo-composer-operation'] === 'read-all') { await route.continue(); return; }
      try { supplemental = await readBrowserContent(page, route.request(), 2000); const response = await continueContentRequest(page, route, 2000); complete({ status: response.status() }); } catch (error) { complete({ error }); await route.abort().catch(() => {}); }
    });
    assert.equal((await request('get-model')).status, 200); const readResult = await observed; if (readResult.error) throw readResult.error;
    assert.equal(readResult.status, 200); assert.deepEqual(supplemental, { mutationToken: 0 }); assert.equal(reads, 2); await page.unroute(pattern);
    const events = [];
    const ref = await observeContentCreation(page, { before: { project: { providers: { content: [{ id: 'content-filesystem', entries: [] }] } } }, modelId: 'note', persist: async event => { events.push(event); },
      action: () => request('put-entry', JSON.stringify({ record: { id: 'fixture', modelId: 'note', lifecycle: 'draft' } })), dispatchTimeoutMs: 2000, requestTimeoutMs: 2000 });
    assert.equal(ref.recordId, 'fixture'); assert.equal(writes, 1); assert.equal(events.at(-1).phase, 'create-response'); assert.equal(events.at(-1).body.ok, true);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
