import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observeContentCreation } from './creation-observer.mjs';
const before = { project: { providers: { content: [{ id: 'content-filesystem', entries: [{ id: 'old', modelId: 'note', lifecycle: 'published' }] }] } } };
const input = { record: { id: 'fresh', modelId: 'note', lifecycle: 'draft' } };
const response = { status: () => 200, json: async () => ({ ok: true }) };
function fixture() {
  const events = []; let handler;
  const page = { unroutes: 0, async route(_, callback) { handler = callback; }, async unroute() { this.unroutes++; handler = undefined; }, async send(operation = 'put-entry', options = {}) {
    const record = { fetched: 0, aborted: 0, continued: 0, fulfilled: 0 };
    const route = { request: () => ({ headers: () => ({ 'x-zudo-composer-operation': operation }), postDataJSON: () => options.input ?? input }),
      async fetch() { record.fetched++; return options.fetch ? options.fetch() : response; }, async abort() { record.aborted++; }, async continue() { record.continued++; }, async fulfill() { record.fulfilled++; } };
    const done = handler(route); return { record, done };
  } };
  const run = action => observeContentCreation(page, { before, modelId: 'note', persist: async event => { events.push(event); }, action, dispatchTimeoutMs: 15, requestTimeoutMs: 40 });
  return { page, events, run };
}
test('actual successful create is journaled before acknowledged and unroutes only on success', async () => {
  const f = fixture(); let sent;
  const ref = await f.run(async () => { sent = await f.page.send(); });
  assert.deepEqual(ref, { providerId: 'content-filesystem', modelId: 'note', recordId: 'fresh' });
  assert.deepEqual(f.events.map(e => e.phase), ['create-request', 'create-response']);
  assert.equal(sent.record.fetched, 1); assert.equal(sent.record.fulfilled, 1); assert.equal(f.page.unroutes, 1);
});
test('admitted slow response survives dispatch deadline; no outer timer abandons it', async () => {
  const f = fixture();
  const ref = await f.run(async () => { await f.page.send('put-entry', { fetch: async () => { await new Promise(resolve => setTimeout(resolve, 35)); return response; } }); });
  assert.equal(ref.recordId, 'fresh'); assert(!f.events.some(e => e.phase.includes('timeout')));
});
test('extra put-entry is aborted, original outcome retained and further writes stay refused', async () => {
  const f = fixture(); let release, first, extra;
  const pending = new Promise(resolve => { release = resolve; });
  await assert.rejects(f.run(async () => {
    first = await f.page.send('put-entry', { fetch: () => pending });
    extra = await f.page.send(); await extra.done; release(response);
  }));
  assert.equal(extra.record.fetched, 0); assert.equal(extra.record.aborted, 1);
  assert.equal(first.record.fetched, 1); assert(f.events.some(e => e.phase === 'create-response'));
  assert(f.events.some(e => e.phase === 'create-uncertain')); assert.equal(f.page.unroutes, 0);
  const later = await f.page.send('delete-entry'); await later.done; assert.equal(later.record.fetched, 0); assert.equal(later.record.aborted, 1);
});
test('dispatch timeout retains rejecting interceptor so a late create cannot escape', async () => {
  const f = fixture(); await assert.rejects(f.run(async () => {}), /dispatch timed out/);
  assert.equal(f.page.unroutes, 0); assert.equal(f.events[0].phase, 'create-dispatch-timeout');
  const late = await f.page.send(); await late.done; assert.equal(late.record.fetched, 0); assert.equal(late.record.aborted, 1);
});
test('failed admitted response is not treated as success or retried', async () => {
  const f = fixture(); let sent;
  await assert.rejects(f.run(async () => { sent = await f.page.send('put-entry', { fetch: async () => { throw Error('response lost'); } }); }), /response lost/);
  assert.equal(sent.record.fetched, 1); assert.equal(sent.record.fulfilled, 0);
  assert.equal(f.events.at(-1).phase, 'create-uncertain'); assert.equal(f.page.unroutes, 0);
});
test('wrong model or existing identity refuses before dispatch', async () => {
  for (const record of [{ ...input.record, modelId: 'course' }, { ...input.record, id: 'old' }]) {
    const f = fixture(); let sent;
    await assert.rejects(f.run(async () => { sent = await f.page.send('put-entry', { input: { record } }); }));
    assert.equal(sent.record.fetched, 0); assert.equal(f.page.unroutes, 0);
  }
});
test('unknown Content mutation is refused but inspected read operations pass', async () => {
  const f = fixture(); let read, write;
  await assert.rejects(f.run(async () => {
    read = await f.page.send('read-all'); await read.done;
    write = await f.page.send('delete-model'); await write.done;
  }), /Unexpected Content mutation/);
  assert.equal(read.record.continued, 1); assert.equal(write.record.fetched, 0); assert.equal(write.record.aborted, 1);
});
test('action rejection after admission waits for and preserves the actual outcome', async () => {
  const f = fixture(); let sent;
  await assert.rejects(f.run(async () => { sent = await f.page.send('put-entry', { fetch: async () => { await new Promise(resolve => setTimeout(resolve, 25)); return response; } }); throw Error('click observation lost'); }), /click observation lost/);
  assert.equal(sent.record.fetched, 1); assert(f.events.some(e => e.phase === 'create-response')); assert.equal(f.page.unroutes, 0);
});
