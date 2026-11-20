import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admitted, assertExact, replacement } from './policy.mjs';
const base = 'http://127.0.0.1:4196', workspaceId = 'pinsel';
const check = (path, body, method = 'POST') => admitted({ url: base + path, method, body, operation: body?.operation, base, workspaceId, providerRead: (_p, op) => op === 'get-entry' });
test('canonical native/Assistant actions and unknown operations fail closed', () => {
    for (const operation of ['document-edit', 'applyHostReview', 'undoHostReview', 'applyDraft', 'publish', 'activate', 'unknown']) {
        assert(!check('/__zudo-native-edit', { operation, input: { workspaceId } }));
        assert(!check('/__zudo-assistant', { operation, workspaceId }));
    }
});
test('only exact scoped preview and Assistant metadata/proposals are admitted', () => {
    assert(check('/__zudo-native-edit', { operation: 'document-preview', input: { workspaceId } }));
    assert(!check('/__zudo-native-edit', { operation: 'document-preview', input: { workspaceId: 'other' } }));
    assert(check('/__zudo-assistant', { operation: 'start', workspaceId }));
    assert(!check('/__zudo-assistant', { operation: 'start', workspaceId: 'other' }));
    assert(!check('/__zudo-assistant?redirect=1', { operation: 'start', workspaceId }));
});
test('provider writes and non-POST methods cannot bypass the read predicate', () => {
    assert(check('/__zudo_composer_content_provider', { operation: 'get-entry' }));
    assert(!check('/__zudo_composer_content_provider', { operation: 'put-entry' }));
    assert(!check('/__zudo_composer_content_provider', { operation: 'get-entry' }, 'PUT'));
    assert(!admitted({ url: 'http://other.test/', method: 'GET', base, workspaceId, providerRead: () => true }));
});
test('full snapshot equality does not erase history/token deltas', () => {
    assertExact({ digest: 'a', tokens: { content: 1 } }, { digest: 'a', tokens: { content: 1 } });
    assert.throws(() => assertExact({ digest: 'a', tokens: { content: 1 } }, { digest: 'b', tokens: { content: 2 } }));
    assert.equal(replacement('¥10,000', ' on all pages'), 'replace "¥10,000" with "Read-only ownership acceptance" on all pages');
});
test('a prior refusal fences new conversations and model runs while reads can settle', () => {
    const input = { url: base + '/__zudo-assistant', method: 'POST', base, workspaceId, providerRead: () => false, held: true };
    for (const operation of ['start', 'createConversation'])
        assert(!admitted({ ...input, body: { operation, workspaceId } }));
    assert(admitted({ ...input, body: { operation: 'run', workspaceId } }));
});
