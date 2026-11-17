import assert from 'node:assert/strict';
export function parseOptions(args) {
    const options = {};
    const flags = ['--composer', '--stage', '--artifacts', '--port', '--recover-price-from'];
    for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        assert(flags.includes(flag) && !options[flag] && args[i + 1], 'Unknown, duplicate or missing option');
        options[flag] = args[i + 1];
    }
    assert.match(options['--composer'] ?? '', /^[a-f0-9]{40}$/, 'Exact immutable Composer SHA required');
    assert.match(options['--stage'] ?? '', /^[a-z0-9][a-z0-9-]+$/, 'Explicit named known-data stage required');
    assert(options['--artifacts'], 'New external --artifacts directory required');
    const port = Number(options['--port'] ?? 4173);
    assert(Number.isInteger(port) && port > 1023 && port <= 65535, 'Invalid loopback port');
    return { composer: options['--composer'], stage: options['--stage'], artifacts: options['--artifacts'], port, recoverFrom: options['--recover-price-from'] };
}
/** Only recover a positively identified prior price run; an uncertain start is a hold. */
export function recoverPriceRun(manifest, prior, current, records, scope) {
    for (const key of ['repo', 'stage', 'composer'])
        assert.equal(manifest[key], scope[key], `Recovery ${key} differs`);
    assert.deepEqual(current, prior, 'Workspace changed since prior attempt; do not reuse its selected revision');
    const starts = records.filter(e => e.kind === 'request' && e.value.path === '/__zudo-assistant' && e.value.body?.operation === 'start');
    assert(starts.length > 0, 'No prior start request; use fresh mode only after reviewing prior attempt');
    const request = starts[0].value.body;
    const replies = records.filter(e => e.kind === 'response' && e.value.path === '/__zudo-assistant' && e.value.operation === 'start' && e.value.body?.ok === true && e.value.body.result?.conversationId === request.input.conversationId);
    assert.equal(replies.length, 1, 'Prior start response uncertain or ambiguous: reconcile through supported Assistant readback; never start another proposal');
    const result = replies[0].value.body.result;
    assert.equal(typeof result.runId, 'string');
    assert.equal(request.workspaceId, current.workspaceId);
    assert.equal(request.input.context.hostSelection.revision, current.digest);
    return { conversationId: result.conversationId, runId: result.runId, prompt: request.input.text, selection: request.input.context.hostSelection };
}
