// Real-browser check for the post-save reload race: a pure Composition read that
// is still in flight (or still queued) when the runner reloads must be journaled
// as read-aborted-at-navigation; it must never latch the phase as uncertain.
// Usage: node tests/native-authoring/families/reload-race.browser.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import { compositionAuthoringGate } from './composition-authoring.mjs';

const snapshot = { workspaceId: 'pinsel', project: { providers: { compositions: [{ id: 'files', records: [] }] } } };
const page_html = `<!doctype html><title>race</title><script>
window.fire = n => { for (let i = 0; i < n; i++) fetch('/__zudo_composer_file_provider', { method: 'POST', headers: { 'content-type': 'application/json', 'x-zudo-composer-workspace': 'pinsel' }, body: JSON.stringify({ operation: 'snapshot' }) }); };
</script>`;
let served = 0;
const server = createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page_html); }
  served++;
  setTimeout(() => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, result: { records: [] } })); }, 4000);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
try {
  for (const queued of [1, 3]) {
    const page = await browser.newPage();
    const events = [];
    const gate = compositionAuthoringGate({ page, snapshot, persist: async event => { events.push(event); }, admit: () => { throw Error('no write expected'); }, accept: () => {} });
    await page.route('**/__zudo_composer_file_provider', route => gate.handle(route));
    await page.goto(base);
    await page.evaluate(n => window.fire(n), queued);
    await new Promise(resolve => setTimeout(resolve, 300));
    const started = Date.now();
    gate.beginNavigation();
    await page.reload({ waitUntil: 'commit' });
    gate.navigationCommitted();
    await gate.drain();
    gate.assertSettled();
    const aborted = events.filter(event => event.phase === 'read-aborted-at-navigation');
    assert.equal(aborted.length, queued, `every pre-reload read journaled as aborted (${JSON.stringify(events.map(e => e.phase))})`);
    assert(!events.some(event => event.phase === 'composition-held'));
    assert(Date.now() - started < 30000, 'settled without waiting for the uncertain-outcome timeout');
    results.push({ queued, aborted: aborted.map(event => event.failure?.errorText), ms: Date.now() - started });
    await page.close();
  }
  // A reload that commits while the read's dispatch journal is still being written.
  {
    const page = await browser.newPage();
    const events = [];
    const slow = async event => { events.push(event); if (event.phase === 'composition-request-before-dispatch') await new Promise(resolve => setTimeout(resolve, 800)); };
    const gate = compositionAuthoringGate({ page, snapshot, persist: slow, admit: () => { throw Error('no write expected'); }, accept: () => {} });
    await page.route('**/__zudo_composer_file_provider', route => gate.handle(route));
    await page.goto(base);
    const before = served;
    await page.evaluate(() => window.fire(1));
    await new Promise(resolve => setTimeout(resolve, 200));
    gate.beginNavigation();
    await page.reload({ waitUntil: 'commit' });
    gate.navigationCommitted();
    await gate.drain();
    gate.assertSettled();
    const aborted = events.filter(event => event.phase === 'read-aborted-at-navigation');
    assert.deepEqual(aborted.map(event => event.failure?.errorText), ['document-replaced-before-dispatch']);
    assert.equal(served, before, 'a read released during its journal write is never sent');
    results.push({ journalWindow: aborted[0].failure.errorText, sent: served - before });
    await page.close();
  }
  // A read the old document issues after the runner began the reload but before it committed.
  {
    const page = await browser.newPage();
    const events = [];
    const gate = compositionAuthoringGate({ page, snapshot, persist: async event => { events.push(event); }, admit: () => { throw Error('no write expected'); }, accept: () => {}, navigationGraceMs: 6000 });
    await page.route('**/__zudo_composer_file_provider', route => gate.handle(route));
    await page.goto(base);
    const started = Date.now();
    gate.beginNavigation();
    await page.evaluate(() => window.fire(1));
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.reload({ waitUntil: 'commit' });
    gate.navigationCommitted();
    await gate.drain();
    gate.assertSettled();
    const aborted = events.filter(event => event.phase === 'read-aborted-at-navigation');
    assert.deepEqual(aborted.map(event => event.failure?.errorText), ['document-replaced-during-navigation'], JSON.stringify(events.map(e => e.phase)));
    assert(!events.some(event => event.phase === 'composition-held'));
    results.push({ duringNavigation: aborted[0].failure.errorText, ms: Date.now() - started });
    await page.close();
  }
  // Control: a read failing with no runner navigation still latches.
  const page = await browser.newPage();
  const events = [];
  const gate = compositionAuthoringGate({ page, snapshot, persist: async event => { events.push(event); }, admit: () => { throw Error('no write expected'); }, accept: () => {} });
  await page.route('**/__zudo_composer_file_provider', route => gate.handle(route));
  await page.goto(base);
  await page.evaluate(() => window.fire(1));
  await new Promise(resolve => setTimeout(resolve, 300));
  await page.reload({ waitUntil: 'commit' });
  const outcome = await Promise.race([gate.drain().then(() => 'settled', error => `held: ${error.message}`), new Promise(resolve => setTimeout(() => resolve('still pending'), 8000))]);
  assert.notEqual(outcome, 'settled', 'a read lost without a runner navigation must not be excused');
  results.push({ control: outcome });
  await page.close();
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ status: 'PASS', served, results }, null, 1));
process.exit(0);
