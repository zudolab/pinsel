import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, recoverPriceRun } from './config.mjs';
const args = ['--composer', 'a'.repeat(40), '--stage', 'known-data', '--artifacts', '/tmp/new-evidence'];
test('explicit immutable pin/named stage and exclusive artifacts are required', () => {
    assert.equal(parseOptions(args).port, 4173);
    for (const extra of [['--unknown', 'x'], ['--stage', 'other'], ['--port', 'NaN'], ['--port', '80']])
        assert.throws(() => parseOptions([...args, ...extra]));
    assert.throws(() => parseOptions(['--composer', 'main', ...args.slice(2)]));
    assert.throws(() => parseOptions(args.filter((_, i) => i !== 2 && i !== 3)));
});
const scope = { repo: '/checkout', stage: 'known-data', composer: 'a'.repeat(40) };
const snapshot = { workspaceId: 'pinsel', digest: 'capture-a', tokens: { content: 4 } };
const selection = { revision: 'capture-a', pathname: '/lessons', prop: 'price', target: { recordId: 'course', nodeId: 'price' } };
const request = { kind: 'request', value: { path: '/__zudo-assistant', body: { operation: 'start', workspaceId: 'pinsel', input: { conversationId: 'conversation-1', text: 'price prompt', context: { hostSelection: selection } } } } };
const response = { kind: 'response', value: { path: '/__zudo-assistant', operation: 'start', body: { ok: true, result: { conversationId: 'conversation-1', runId: 'run-1' } } } };
test('recover exact completed start identity; never infer response loss as permission to retry', () => {
    assert.deepEqual(recoverPriceRun(scope, snapshot, snapshot, [request, response], scope), { conversationId: 'conversation-1', runId: 'run-1', prompt: 'price prompt', selection });
    for (const records of [[], [request], [request, response, response]])
        assert.throws(() => recoverPriceRun(scope, snapshot, snapshot, records, scope));
    assert.throws(() => recoverPriceRun(scope, snapshot, { ...snapshot, tokens: { content: 5 } }, [request, response], scope));
    assert.throws(() => recoverPriceRun(scope, snapshot, snapshot, [request, response], { ...scope, repo: '/other' }));
    assert.throws(() => recoverPriceRun(scope, snapshot, snapshot, [request, response], { ...scope, composer: 'b'.repeat(40) }));
});
