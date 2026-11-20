import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { observeAssistantStreams } from './stream.mjs';
function harness() {
    const reports = [];
    let calls = 0, clones = 0;
    const response = { status: 200, headers: new Headers({ 'content-type': 'application/x-ndjson' }), clone() { clones++; return { text: async () => '{"type":"done"}\n' }; } };
    const context = vm.createContext({ URL, location: { href: 'http://127.0.0.1:4173/composer' }, fetch: async () => { calls++; return response; }, __recordAssistantStream: async (value) => reports.push(value) });
    vm.runInContext(`(${observeAssistantStreams.toString()})({base:'http://127.0.0.1:4173',workspaceId:'pinsel'})`, context);
    return { context, reports, response, counts: () => ({ calls, clones }) };
}
test('stream observer uses one original request, returns its exact response and clones only scoped events', async () => {
    const h = harness();
    const result = await h.context.fetch('/__zudo-assistant', { method: 'POST', body: JSON.stringify({ operation: 'events', workspaceId: 'pinsel', input: { runId: 'run-1', afterSeq: 0 } }) });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(result, h.response);
    assert.deepEqual(h.counts(), { calls: 1, clones: 1 });
    assert.equal(h.reports[0].runId, 'run-1');
    assert.equal(h.reports[0].contentType, 'application/x-ndjson');
    assert.equal(h.reports[0].text, '{"type":"done"}\n');
    for (const [url, operation, workspaceId] of [['/__zudo-assistant', 'start', 'pinsel'], ['/__zudo-assistant', 'events', 'other'], ['https://other.test/__zudo-assistant', 'events', 'pinsel']])
        await h.context.fetch(url, { method: 'POST', body: JSON.stringify({ operation, workspaceId, input: { runId: 'other' } }) });
    assert.deepEqual(h.counts(), { calls: 4, clones: 1 });
});
test('clone read failure reports observation loss without changing the app response', async () => {
    const h = harness();
    h.response.clone = () => ({ text: async () => { throw Error('stream unavailable'); } });
    const result = await h.context.fetch('/__zudo-assistant', { method: 'POST', body: JSON.stringify({ operation: 'events', workspaceId: 'pinsel', input: { runId: 'run-2' } }) });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(result, h.response);
    assert.equal(h.reports.length, 1);
    assert.equal(h.reports[0].runId, 'run-2');
    assert.match(h.reports[0].error, /stream unavailable/);
    assert.equal(h.counts().calls, 1);
});
