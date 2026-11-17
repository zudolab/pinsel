import {contentPreviewResponseTracker,contentPreviewOperations,assertContentPreviewRequest,assertContentPreviewHeaders,assertContentPreviewResponse} from '../native-preview-reads.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, appendFile, realpath } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { resolve, join, dirname, basename } from 'node:path';
import http from 'node:http';
import { admitted, assertExact } from './policy.mjs';
import { checks } from './ui.mjs';
import { observeAssistantStreams } from './stream.mjs';
import { parseOptions, recoverPriceRun } from './config.mjs';
import { repoRoot, assertInstalledPin, assertFreePort, sha256 } from '../support.mjs';
import { isProviderRead } from '../routes-fields.mjs';
import { chromium, expect } from '@playwright/test';
const options = parseOptions(process.argv.slice(2));
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use Node 24');
const repo = await realpath(repoRoot);
// Resolve the existing parent before excluding repository/stage paths, including symlinks.
const proposed = resolve(options.artifacts);
const run = join(await realpath(dirname(proposed)), basename(proposed));
assert(run !== repo && !run.startsWith(repo + '/'), 'Evidence must remain outside the checkout');
const port = options.port;
const installed = await assertInstalledPin(repo, options.composer);
await assertFreePort(port);
await mkdir(run); // Exclusive: never reuse an earlier attempt.
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const sourcePaths = ['run.mjs', 'ui.mjs', 'config.mjs', 'policy.mjs', 'stream.mjs'].map(name => 'tests/native-authoring/assistant-readonly/' + name).concat(['tests/native-authoring/support.mjs', 'tests/native-authoring/routes-fields.mjs']);
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, sha256(await readFile(join(repo, path)))])));
const sources = await sourceHashes();
const base = 'http://127.0.0.1:' + port, env = { ...process.env, PINSEL_AUTHORING_STAGE: options.stage, PINSEL_ASSISTANT_PROVIDER: 'fake' };
const record = (kind, value) => appendFile(join(run, 'events.jsonl'), JSON.stringify({ time: new Date().toISOString(), kind, value }) + '\n');
const command = async (args) => { await record('command', args); await new Promise((ok, bad) => { const out = createWriteStream(join(run, 'commands.log'), { flags: 'a' }); const p = spawn(args[0], args.slice(1), { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'] }); p.stdout.pipe(out, { end: false }); p.stderr.pipe(out, { end: false }); p.on('error', bad); p.on('exit', (code, signal) => { out.end(); code === 0 ? ok() : bad(Error(JSON.stringify(args) + ' ' + (code ?? signal))); }); }); };
const capture = async (name) => { await command(['pnpm', '--filter', '@pinsel/content', 'authoring:capture', '--', join(run, name)]); return JSON.parse(await readFile(join(run, name), 'utf8')); };
let contentReads;
let server, context, page, preview, blocked, observerFailure, assistantReadHeaders, error, result, before, after, resumePrice;
const pending = new Set(), streams = [];
const track = p => { pending.add(p); p.finally(() => pending.delete(p)).catch(() => { }); return p; };
const drain = async () => { while (pending.size)
    await Promise.allSettled([...pending]); };
const portClosed = async () => { const deadline = Date.now() + 30000; while (true) {
    try {
        await assertFreePort(port);
        return;
    }
    catch (cause) {
        if (Date.now() >= deadline)
            throw Error('Owned port still occupied after shutdown; offline capture held: ' + cause);
        await new Promise(resolve => setTimeout(resolve, 250));
    }
} };
const stop = async () => { const errors = []; if (page && !page.isClosed())
    await page.goto('about:blank').catch(() => { }); if (context) {
    try {
        await context.close();
        context = null;
    }
    catch (cause) {
        errors.push(cause);
    }
} if (server && server.exitCode === null && server.signalCode === null) {
    try {
        await new Promise((ok, bad) => { const timer = setTimeout(() => bad(Error('Owned server failed graceful shutdown; preserve lease/process evidence')), 30000); server.once('exit', () => { clearTimeout(timer); ok(); }); process.kill(-server.pid, 'SIGTERM'); });
    }
    catch (cause) {
        errors.push(cause);
    }
} if (errors.length)
    throw new AggregateError(errors, 'Owned resource shutdown incomplete'); };
try {
    before = await capture('before.json');
    if (options.recoverFrom) {
        const prior = resolve(options.recoverFrom);
        const json = async (name) => JSON.parse(await readFile(join(prior, name), 'utf8'));
        const records = (await readFile(join(prior, 'events.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
        resumePrice = recoverPriceRun(await json('manifest.json'), await json('before.json'), before, records, { repo, stage: options.stage, composer: options.composer });
    }
    await writeFile(join(run, 'manifest.json'), JSON.stringify({ repo, sourceCommit, sources, composer: options.composer, stage: options.stage, port, installed, workspaceId: before.workspaceId, digest: before.digest, pack: before.componentPack, renderer: before.renderer, source: 'portable canonical-read-only Assistant acceptance', recoveredPrice: resumePrice ?? null }, null, 2), { flag: 'wx' });
    const log = createWriteStream(join(run, 'server.log'), { flags: 'wx' });
    server = spawn('pnpm', ['--filter', '@pinsel/content', 'authoring:dev', '--port', String(port), '--strict-port'], { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    server.stdout.pipe(log, { end: false });
    server.stderr.pipe(log, { end: false });
    server.once('exit', () => log.end());
    const deadline = Date.now() + 180000;
    let ready = false;
    while (Date.now() < deadline) {
        ready = await new Promise(ok => { const req = http.get(base + '/composer?native=1', { headers: { Accept: 'text/html' } }, res => { res.resume(); ok(res.statusCode === 200); }); req.on('error', () => ok(false)); req.setTimeout(2000, () => req.destroy()); });
        if (ready)
            break;
        assert(server.exitCode === null, 'Owned server exited before readiness');
        await new Promise(r => setTimeout(r, 500));
    }
    assert(ready, 'Authoring readiness timeout');
    context = await chromium.launchPersistentContext(join(run, 'browser-profile'), { headless: true, ...(process.env.NATIVE_ACCEPTANCE_CHROMIUM ? { executablePath: process.env.NATIVE_ACCEPTANCE_CHROMIUM } : {}), viewport: { width: 1600, height: 1100 } });
    page = context.pages()[0] ?? await context.newPage();
    await page.exposeBinding('__recordAssistantStream', async (source, value) => track((async () => {
        try {
            assert(source.page === page, 'Stream binding came from another page');
            assert(source.frame === page.mainFrame(), 'Stream binding came from another frame');
            assert.equal(value.workspaceId, before.workspaceId);
            assert.equal(typeof value.runId, 'string');
            assert(!value.error, value.error);
            assert(value.status >= 200 && value.status < 300);
            assert.match(value.contentType, /application\/(?:x-)?ndjson/);
            const events = value.text.split('\n').filter(Boolean).map(line => JSON.parse(line));
            streams.push({ runId: value.runId, events });
            await record('actual-model-tool-stream', streams.at(-1));
        }
        catch (cause) {
            observerFailure ??= cause;
            await record('stream-observer-error', { message: String(cause) });
        }
    })()));
    await page.addInitScript(observeAssistantStreams, { base, workspaceId: before.workspaceId });
    await page.route('**/*', route => track((async () => {
        const req = route.request();
        let body;
        try {
            body = req.postDataJSON();
        }
        catch { }
        const operation = req.headers()['x-zudo-composer-operation'] ?? req.headers()['x-zudo-composer-asset-operation'] ?? body?.operation ?? '';
        const allowed = admitted({ url: req.url(), method: req.method(), body, operation, base, workspaceId: before.workspaceId, providerRead: isProviderRead, held: !!blocked || !!observerFailure });
        if (!allowed) {
            blocked ??= Error('Unexpected request blocked: ' + new URL(req.url()).pathname + ' ' + operation);
            await record('blocked', { path: new URL(req.url()).pathname, method: req.method(), operation });
            return route.abort();
        }
        if (new URL(req.url()).pathname === '/__zudo-assistant' && body?.operation === 'conversation') {
            const h = req.headers();
            assistantReadHeaders = Object.fromEntries(['content-type', 'x-zudo-native-client', 'x-zudo-native-capability'].map(key => { assert(h[key], 'Actual Assistant read header missing'); return [key, h[key]]; }));
        }
        if(new URL(req.url()).pathname==='/__zudo-native-edit'&&contentPreviewOperations.has(body?.operation)){try{assertContentPreviewRequest(body,before.workspaceId);assertContentPreviewHeaders(req.headers());}catch(cause){observerFailure??=cause;await record('content-preview-request-held',{error:String(cause)});return route.abort();}}
        if (req.method() === 'POST')
            await record('request', { path: new URL(req.url()).pathname, operation, body });
        return route.continue();
    })()));
    page.on('response', res => {
        const path = new URL(res.url()).pathname;
        if (!['/__zudo-native-edit', '/__zudo-assistant'].includes(path))
            return;
        let input;
        try {
            input = res.request().postDataJSON();
        }
        catch { }
        if (input?.operation === 'events')
            return;
        track((async () => { try {
            const body = await res.json();
            if(path==='/__zudo-native-edit'&&contentPreviewOperations.has(input?.operation))(contentReads??=contentPreviewResponseTracker(before,{revision:before.digest})).observe(input,{status:res.status(),body},res.request().headers());
            if (input?.operation === 'document-preview' && body.ok)
                preview = body.result;
            await record('response', { path, operation: input?.operation, status: res.status(), body });
        }
        catch (cause) {
            if(contentPreviewOperations.has(input?.operation))observerFailure??=cause;
            await record('observer-error', { path, operation: input?.operation, error: String(cause) });
        } })());
    });
    const recoverPrice = async () => { assert(resumePrice, 'No selected recovery run'); assert(assistantReadHeaders, 'No actual current app Assistant read headers'); await page.evaluate(async ({ headers, workspaceId, runId }) => { const res = await fetch('/__zudo-assistant', { method: 'POST', credentials: 'same-origin', redirect: 'error', headers, body: JSON.stringify({ operation: 'events', workspaceId, input: { runId, afterSeq: 0 } }) }); if (!res.ok)
        throw Error('Existing-run events unavailable'); await res.text(); }, { headers: assistantReadHeaders, workspaceId: before.workspaceId, runId: resumePrice.runId }); };
    result = await checks({ page, base, before, resumePrice, recoverPrice, getPreview: () => preview, getStreams: () => streams, expect, record, shot: name => page.screenshot({ path: join(run, name + '.png'), fullPage: true }) });
    contentReads?.finish();
    if (blocked || observerFailure)
        throw blocked ?? observerFailure;
}
catch (cause) {
    error = cause;
    await record('failure', { message: String(cause), stack: cause.stack });
}
finally {
    try {
        await stop();
        await drain();
        await portClosed();
        after = await capture('after.json');
        if (before)
            assertExact(before, after);
        assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sourceCommit, 'Source commit changed during acceptance');
        assert.deepEqual(await sourceHashes(), sources, 'Acceptance source changed during run');
    }
    catch (cause) {
        error ??= cause;
        await record('cleanup-or-capture-failure', { message: String(cause) });
    }
    try{contentReads?.finish();}catch(cause){observerFailure??=cause;}
    if (blocked || observerFailure)
        error ??= blocked ?? observerFailure;
    await writeFile(join(run, 'result.json'), JSON.stringify({ status: error ? 'FAIL' : 'PASS', error: error ? String(error) : null, result, beforeDigest: before?.digest, afterDigest: after?.digest, fullCaptureEqual: !!before && !!after && JSON.stringify(before) === JSON.stringify(after), blocked: blocked ? String(blocked) : null, retained: 'All conversations, review records, browser profile, captures and logs; no inverse/delete/reset attempted.' }, null, 2));
}
if (error) {
    console.error(error);
    process.exitCode = 1;
}
else
    console.log('PASS', run);
