import assert from 'node:assert/strict';
export const assistantOperations = new Set(['status', 'conversations', 'conversation', 'createConversation', 'start', 'run', 'events', 'memory', 'draft', 'receipt', 'hostReview']);
export function admitted({ url, method, body, operation, base, workspaceId, providerRead, held = false }) {
    const target = new URL(url);
    if (target.origin !== base)
        return false;
    if (method === 'GET' || method === 'HEAD')
        return true;
    if (method !== 'POST' || target.search || target.hash)
        return false;
    if (target.pathname === '/__zudo-native-edit')
        return body?.operation === 'document-preview' && body?.input?.workspaceId === workspaceId;
    if (target.pathname === '/__zudo-assistant')
        return body?.workspaceId === workspaceId && assistantOperations.has(body.operation) && !(held && ['start', 'createConversation'].includes(body.operation));
    return providerRead(target.pathname, operation);
}
export function replacement(value, suffix = '') {
    assert.equal(typeof value, 'string');
    const needle = value.split(/[\n"\r]/).find(part => part.trim().length > 1);
    assert(needle, 'No unambiguous deterministic replacement substring');
    return `replace "${needle}" with "Read-only ownership acceptance"${suffix}`;
}
export function assertExact(before, after) { assert.deepEqual(after, before, 'Read-only Assistant visit changed full public capture'); }
