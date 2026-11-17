import { continueContentRequest, readBrowserContent, contentReadOperations } from './content-browser-transport.mjs';
import { courseFields, proveHumanContentSave, assertHumanSaveRequest, assertHumanAttemptsVerified, createHumanSaveAdmission } from "./human-content-proof.mjs";
import { runAssistantPhase } from './assistant-scenarios.mjs';
import { chromium } from '@playwright/test';
import { join, isAbsolute } from 'node:path';
import { repoRoot, assertInstalledPin, assertFreePort } from './support.mjs';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { get } from 'node:http';
const probe = url => new Promise((resolve, reject) => { const request = get(url, { headers: { Accept: 'text/html' }, timeout: 3000 }, response => { let body = ''; response.on('data', chunk => body += chunk); response.on('end', () => resolve({ status: response.statusCode, body: body.slice(0, 120) })); }); request.on('error', reject); request.on('timeout', () => request.destroy(new Error('HTTP readiness timeout'))); });
const mode = process.argv[2];
assert.match(process.env.PINSEL_AUTHORING_STAGE ?? '', /^[a-z0-9][a-z0-9-]+$/, 'Explicit staged authority required');
assert(['inspect', 'stage', 'later', 'restore', 'recovery', 'negative'].includes(mode) || mode.startsWith('assistant:'), 'Unknown browser phase');
const expected = process.env.EXPECTED_COMPOSER_SHA;
assert.match(expected ?? '', /^[a-f0-9]{40}$/, 'Set exact expected immutable SHA');
await assertInstalledPin(repoRoot, expected);
const artifacts = process.env.NATIVE_ACCEPTANCE_ARTIFACTS;
assert(artifacts && isAbsolute(artifacts));
const manifest = JSON.parse(await readFile(join(artifacts, 'run-manifest.json'), 'utf8'));
assert.equal(manifest.scope.canonicalRepoRoot, await realpath(repoRoot));
assert.equal(manifest.scope.stage, process.env.PINSEL_AUTHORING_STAGE);
assert.equal(manifest.scope.composer, expected);
const run = join(artifacts, mode + '-' + Date.now());
await mkdir(run);
const port = Number(process.env.NATIVE_ACCEPTANCE_PORT);
await assertFreePort(port);
const base = 'http://127.0.0.1:' + port;
const notes = [];
let serverLog = '', context, page, preview, nativeHeaders;
let cleanupError;
const record = (key, value) => { notes.push({ key, value, time: new Date().toISOString() }); console.log(key, JSON.stringify(value)); };
const server = spawn('pnpm', ['dev', '--port', String(port), '--strict-port'], { cwd: repoRoot, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
server.stdout.on('data', b => serverLog += b);
server.stderr.on('data', b => serverLog += b);
const executablePath = process.env.NATIVE_ACCEPTANCE_CHROMIUM || chromium.executablePath();
const frame = () => page.frameLocator('iframe[title="Host rendered page"]');
let profileCounter = 0;
async function launch() {
    context = await chromium.launchPersistentContext((mode.startsWith('assistant:') ? join(artifacts, 'assistant-profile-' + mode.split(':')[1]) : run + '/browser-profile-' + (mode === 'negative' ? profileCounter++ : 0)), { executablePath, headless: true, viewport: { width: 1600, height: 1050 } });
    page = context.pages()[0] ?? await context.newPage();
    page.on('request', request => { if (request.url().endsWith('/__zudo-native-edit')) nativeHeaders = request.headers(); });
    page.on('pageerror', e => record('pageerror', e.message));
    page.on('response', async (response) => {
        try {
            if (response.url().endsWith('/__zudo-native-edit')) {
                const body = await response.json();
                if (body.result?.targets)
                    preview = body.result;
                record('native-response', { operation: response.request().postDataJSON()?.operation, status: response.status(), error: body.error });
            }
            else if (!response.ok() && response.url().includes('__zudo_composer_'))
                record('provider-error', { url: response.url(), status: response.status(), body: (await response.text()).slice(0, 1500) });
        }
        catch (e) {
            record('observer-disposed', e.message);
        }
    });
}
async function ready() { await page.getByText('Saved snapshot rendered', { exact: true }).waitFor({ timeout: 180000 }); assert(preview?.targets?.length, 'No captured targets'); }
async function open(visitor = '/') { await page.goto(base + '/composer?native=1&visitor=' + encodeURIComponent(visitor)); await ready(); }
async function browse() {
    const button = page.getByRole('button', { name: 'Select components', exact: true });
    if (await button.count())
        await button.click();
}
async function shot(name) { await page.screenshot({ path: run + '/' + name + '.png', fullPage: true }); }
async function selectConsultation() {
    const target = preview.targets.find(t => t.recordId === 'lessons-consultation' && t.nodeId === 'section');
    assert(target?.placement, 'Missing parent placement');
    await frame().locator('[data-composer-target]').evaluateAll((elements, id) => {
        const target = elements.find(el => el.getAttribute('data-composer-target') === id);
        if (!target)
            throw Error('Missing rendered target');
        target.click();
    }, target.renderedNodeId);
    const selected = page.getByRole('treeitem', { selected: true });
    await selected.waitFor();
    assert(Number(await selected.getAttribute('aria-level')) > 1, 'Tree did not expose nested selected target');
    await page.getByText('Component and owner', { exact: true }).click();
    await page.getByText('files/lessons-consultation/section', { exact: true }).waitFor();
    record('qualified-selection', { target, level: await selected.getAttribute('aria-level'), label: await selected.getAttribute('aria-label') });
    return target;
}
async function contentEntry() { await page.goto(base + '/content?provider=content-filesystem&model=course&entry=consultation'); await page.getByLabel('価格（表示）').waitFor({ timeout: 120000 }); }
async function saveField(label, value) {
    const field = courseFields[label]; assert(field, 'Unapproved full-scenario Content field');
    const control = page.getByLabel(label);
    const journalFile = process.env.NATIVE_ACCEPTANCE_JOURNAL;
    const priorJournal = JSON.parse(await readFile(journalFile, 'utf8'));
    assertHumanAttemptsVerified(priorJournal);
    if (await control.inputValue() === value) {
        const journal = JSON.parse(await readFile(journalFile, 'utf8'));
        journal.humanContentNoops ??= []; journal.humanContentNoops.push({ fieldId: field.fieldId, value, phase: mode });
        await writeFile(journalFile, JSON.stringify(journal, null, 2));
        return; // No request and no generation authorization.
    }
    const operationHeader = 'x-zudo-composer-operation';
    let finish, timeout, completed = false, stopped = false;
    const admission = createHumanSaveAdmission();
    const observed = new Promise(resolve => { finish = resolve; });
    let attempt, savedJournal;
    const persistAttempt = () => writeFile(journalFile, JSON.stringify(savedJournal, null, 2));
    const handler = async route => {
        const request = route.request();
        const operation = request.headers()[operationHeader];
        if (contentReadOperations.has(operation)) { await route.continue(); return; }
        if (operation !== 'put-entry') { stopped = true; if (attempt) { attempt.status = 'uncertain'; attempt.error = 'Unexpected Content mutation refused'; await persistAttempt(); } await route.abort(); if (!admission.started) finish({ error: Error('Unexpected Content mutation refused') }); return; }
        if (stopped) { await route.abort(); return; }
        if (!admission.admit()) { if (attempt) { attempt.status = 'uncertain'; attempt.error = 'Unexpected extra Content write was refused'; await persistAttempt(); } await route.abort(); return; }
        clearTimeout(timeout); // Each admitted network step has its own bounded timeout.

        try {
            const payload = request.postDataJSON();
            savedJournal = JSON.parse(await readFile(journalFile, 'utf8'));
            attempt = { phase: mode, fieldId: field.fieldId, request: payload, status: 'admitted' };
            savedJournal.humanContentAttempts ??= []; savedJournal.humanContentAttempts.push(attempt); await persistAttempt();
            const read = () => readBrowserContent(page, request, 120000);
            const before = await read();
            // Check intended owner before forwarding the real UI write.
            assert.equal(payload.record?.id, 'consultation'); assert.equal(payload.record?.modelId, 'course');
            const baseline = JSON.parse(await readFile(join(artifacts, 'before.json'), 'utf8'));
            const previous = savedJournal.humanContentWrites?.at(-1);
            assert.equal(before.mutationToken, previous?.generation ?? baseline.tokens.content, 'Content changed outside this full scenario; no write sent');
            assertHumanSaveRequest(before, payload, field.fieldId, field.numeric ? Number(value) : value);
            attempt.before = before; attempt.status = 'dispatching'; await persistAttempt();
            assert(!stopped && !admission.unexpected, 'Human Save interrupted before dispatch');
            const response = await continueContentRequest(page, route, 120000);
            const body = await response.json();
            attempt.response = { status: response.status(), body }; attempt.status = 'responded'; await persistAttempt();
            assert(response.ok() && body.ok, 'Human Content Save failed');
            const after = await read();
            assert(!stopped && !admission.unexpected, 'Unexpected extra Content write was refused');
            attempt.after = after; await persistAttempt();
            const proof = proveHumanContentSave(before, after, { request: payload, status: response.status(), response: body,
                fieldId: field.fieldId, value: field.numeric ? Number(value) : value, phase: mode });
            savedJournal.humanContentWrites ??= []; savedJournal.humanContentWrites.push(proof);
            assert(!stopped && !admission.unexpected, 'Unexpected extra Content write was refused');
            attempt.status = 'verified'; await persistAttempt();
            assert(!stopped && !admission.unexpected, 'Unexpected extra Content write was refused');
            // The browser may already show Saved; only return after durable proof.
            finish({ proof });
        } catch (error) { if (attempt) { attempt.status = 'uncertain'; attempt.error = String(error); await persistAttempt().catch(() => {}); } await route.abort().catch(() => {}); finish({ error }); }
    };
    await page.route('**/__zudo_composer_content_provider', handler);
    try {
        timeout = setTimeout(() => { if (!admission.started) { stopped = true; finish({ error: Error('Human Content Save was not dispatched') }); } }, 120000);
        let actionError;
        try { await control.fill(value); const save = page.getByRole('button', { name: 'Save', exact: true }); if (await save.isEnabled()) await save.click(); }
        catch (error) { actionError = error; if (!admission.started) { stopped = true; finish({ error }); } }
        const result = await observed; // Do not abandon an admitted original request after a UI error.
        if (result.error) throw result.error;
        if (actionError) throw actionError;
        await page.locator('button[title="All changes saved"]').waitFor({ timeout: 120000 });
        assert(!admission.unexpected, 'Unexpected extra Content write was refused; retained attempt needs review');
        record('human-content-save', result.proof); completed = true;
    } catch (error) {
        stopped = true;
        if (!attempt) {
            savedJournal = JSON.parse(await readFile(journalFile, 'utf8'));
            attempt = { status: 'uncertain', phase: mode, fieldId: field.fieldId, error: String(error) };
            savedJournal.humanContentAttempts ??= []; savedJournal.humanContentAttempts.push(attempt);
            await persistAttempt();
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        // On failure retain the refusing route until this browser is closed: a late UI write must not escape observation.
        if (completed) await page.unroute('**/__zudo_composer_content_provider', handler);
    }
}

async function move(direction) {
    const before = preview.identity.revision;
    await page.getByRole('button', { name: 'Move page placement ' + direction, exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.cms-host-document [role="status"]')?.textContent === 'Saved snapshot rendered', null, { timeout: 180000 });
    for (let i = 0; i < 180 && preview.identity.revision === before; i++)
        await page.waitForTimeout(1000);
    assert.notEqual(preview.identity.revision, before, 'Placement revision unchanged');
}
try {
    for (let i = 0; i < 240; i++) {
        if (server.exitCode !== null)
            throw Error('Launcher exited ' + server.exitCode + ' ' + serverLog);
        try {
            const r = await probe(base + '/composer?native=1');
            if (r.status === 200) {
                record('http-listening', r);
                break;
            }
        }
        catch (error) {
            if (i < 3 || i % 30 === 0)
                record('http-not-ready', error.message);
        }
        if (i === 239)
            throw Error('Launcher readiness timeout');
        await new Promise(r => setTimeout(r, 500));
    }
    await launch();
    await open();
    record('installed', { expected, workspace: preview.identity.workspaceId, identity: preview.identity });
    await page.getByRole('link', { name: 'Content', exact: true }).waitFor();
    await page.waitForFunction(() => new Set([...document.querySelectorAll('a[href^="/content?"][href*="model="]')].map(a => new URL(a.href).searchParams.get('model'))).size >= 25, null, { timeout: 120000 });
    const catalogModels = await page.locator('a[href^="/content?"][href*="model="]').evaluateAll(links => [...new Set(links.map(a => new URL(a.href).searchParams.get('model')))]);
    assert(catalogModels.length >= 25, 'Expected baseline Content models');
    for (const model of ['timeline-entry', 'testimonial', 'target-item', 'specialization', 'site-copy', 'result-year', 'result-entry', 'page-copy', 'note', 'nav-link', 'lessons-copy', 'legal-row', 'knowledge-card', 'instructor-profile', 'home-voice', 'home-result', 'home-faq', 'feature-card', 'faq-item', 'faq-group', 'course-step', 'course', 'contact-step', 'contact-copy', 'about-copy'])
        assert(catalogModels.includes(model), 'Missing Content model ' + model);
    record('cold-catalog-models', catalogModels);
    assert.equal(await page.getByText('Some Content models or providers are unavailable.', { exact: true }).count(), 0, 'Cold catalog error remained');
    if (mode === 'inspect') {
        assert.equal(preview.identity.packId, 'pinsel');
        assert.equal(preview.identity.rendererId, 'pinsel-zfb');
        await open('/lessons/');
        await selectConsultation();
        const section = preview.targets.find(t => t.recordId === 'lessons-consultation' && t.nodeId === 'section');
        assert.equal(await page.getByRole('treeitem', { selected: true }).getAttribute('aria-label'), section.props.title);
        const beforeOwner = await page.getByRole('treeitem', { selected: true }).getAttribute('aria-label');
        await page.getByLabel('Show structural wrappers', { exact: true }).check();
        assert.equal(await page.getByRole('treeitem', { selected: true }).getAttribute('aria-label'), beforeOwner);
        await shot('semantic-wrappers-advanced');
        await page.getByLabel('Show structural wrappers', { exact: true }).uncheck();
        await shot('semantic-default');
        assert.equal(await page.locator('.cms-host-inspector fieldset').evaluate(el => el.disabled && [...el.querySelectorAll('input,textarea,select')].every(control => control.matches(':disabled'))), true, 'Shared component fields must be disabled');
        await writeFile(run + '/target-capabilities.json', JSON.stringify(preview.targets, null, 2));
        await writeFile(run + '/inspector-body.txt', await page.locator('body').innerText());
        for (const [query, id] of [['1', 'consultation'], ['2', 'two-month'], ['3', 'four-month'], ['01', 'consultation'], ['consultation', 'consultation'], ['two-month', 'two-month'], ['four-month', 'four-month']]) {
            await open('/contact/?course=' + query);
            assert.equal(await frame().locator('select#course option:checked').getAttribute('data-course-id'), id);
            record('course-query-identity', { query, id });
        }
        await open('/');
        const links = await frame().locator('a[href*="/contact/?course="]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
        for (const id of ['consultation', 'two-month', 'four-month'])
            assert(links.includes('/contact/?course=' + id), 'New canonical ID link missing ' + id);
        record('canonical-course-links', links);
        await browse();
        await frame().locator('a[href="/lessons/"]:visible').first().click();
        await page.waitForFunction(() => new URLSearchParams(location.search).get('visitor') === '/lessons/', null, { timeout: 180000 });
        await ready();
        record('visitor-home-to-lessons', page.url());
        await open('/');
        await browse();
        await frame().locator('a[href="/contact/?course=consultation"]:visible').first().click();
        await page.waitForFunction(() => new URLSearchParams(location.search).get('visitor') === '/contact/?course=consultation', null, { timeout: 180000 });
        await ready();
        assert.equal(await frame().locator('select#course option:checked').getAttribute('data-course-id'), 'consultation');
        await page.reload();
        await ready();
        assert.equal(await frame().locator('select#course option:checked').getAttribute('data-course-id'), 'consultation');
        await shot('visitor-contact-query-reloaded');
        await open('/lessons/#consultation');
        await page.reload();
        await ready();
        assert.equal(new URL(page.frames().find(f => f !== page.mainFrame()).url()).hash, '#consultation');
        record('visitor-hash-reloaded', page.url());
    }
    if (['stage', 'later', 'restore'].includes(mode)) {
        const journalPath = process.env.NATIVE_ACCEPTANCE_JOURNAL;
        assert(journalPath && isAbsolute(journalPath), 'Absolute journal path required');
        let journal;
        const selectTarget = async (t) => {
            await frame().locator('[data-composer-target]').evaluateAll((elements, id) => {
                const el = elements.find(e => e.getAttribute('data-composer-target') === id);
                if (!el)
                    throw Error('Missing rendered target ' + id);
                el.click();
            }, t.renderedNodeId);
            await page.getByRole('treeitem', { selected: true }).waitFor();
        };
        const edit = async (action, override) => {
            const previousRevision = preview.identity.revision;
            let resolveResult;
            const resultPromise = new Promise(resolve => resolveResult = resolve);
            let handled = false;
            const handler = async (route) => {
                const submitted = route.request().postDataJSON();
                if (handled || submitted.operation !== 'document-edit') {
                    await route.continue();
                    return;
                }
                handled = true;
                try {
                    const input = { ...submitted.input, ...(override ? { change: override } : {}) };
                    if (input.change.kind === 'insert') {
                        journal.node = { providerId: input.target.providerId, recordId: input.target.recordId, nodeId: input.change.nodeId };
                        await writeFile(journalPath, JSON.stringify(journal, null, 2));
                    }
                    if (input.change.kind === 'remove') {
                        journal.removal = { request: { ...submitted, input } };
                        await writeFile(journalPath, JSON.stringify(journal, null, 2));
                    }
                    const response = await route.fetch({ postData: JSON.stringify({ ...submitted, input }), timeout: 180000 });
                    const body = await response.json();
                    if (input.change.kind === 'remove' && body.ok) {
                        journal.removal.receipt = body;
                        await writeFile(journalPath, JSON.stringify(journal, null, 2));
                    }
                    record(override ? 'supported-api-inverse' : 'actual-edit', { input, result: body });
                    await route.fulfill({ response });
                    resolveResult({ body });
                }
                catch (error) {
                    await route.abort().catch(() => { });
                    resolveResult({ error: String(error) });
                }
            };
            await page.route('**/__zudo-native-edit', handler);
            let result;
            try {
                await action();
                let timeout;
                try {
                    result = await Promise.race([resultPromise, new Promise(resolve => { timeout = setTimeout(() => resolve({ error: 'Reviewed edit request timeout' }), 180000); })]);
                }
                finally {
                    clearTimeout(timeout);
                }
            }
            finally {
                await page.unroute('**/__zudo-native-edit', handler);
            }
            assert(!result.error, result.error);
            assert(result.body.ok, JSON.stringify(result.body));
            for (let n = 0; n < 180 && preview.identity.revision === previousRevision; n++)
                await page.waitForTimeout(1000);
            assert.notEqual(preview.identity.revision, previousRevision, 'Save preview revision unchanged');
            await ready();
            return result.body.result;
        };
        if (mode === 'later') {
            journal = JSON.parse(await readFile(journalPath, 'utf8'));
            assert.equal(journal.expected, expected);
            journal.laterText = journal.text + ' — later saved B';
            await writeFile(journalPath, JSON.stringify(journal, null, 2));
            await open('/lessons/');
            const node = preview.targets.find(t => t.recordId === 'lessons' && t.nodeId === journal.node.nodeId);
            assert(node);
            assert.equal(node.props.text, journal.text);
            await selectTarget(node);
            await page.locator('.cms-host-inspector').getByLabel('本文').fill(journal.laterText);
            assert.equal(await page.locator('.cms-host-inspector').getByLabel('本文').inputValue(), journal.laterText);
            await edit(() => page.getByRole('button', { name: 'Save field', exact: true }).click());
            assert((await frame().locator('body').innerText()).includes(journal.laterText));
            await shot('later-saved-B');
            record('later-state-saved', { nodeId: node.nodeId, text: journal.laterText });
        }
        else if (mode === 'stage') {
            await contentEntry();
            await writeFile(run + '/content-controls.json', JSON.stringify(await page.locator('input,textarea,select').evaluateAll(elements => elements.map(e => ({ tag: e.tagName, type: e.type, id: e.id, value: e.value, disabled: e.disabled, labels: [...(e.labels ?? [])].map(l => l.textContent) }))), null, 2));
            journal = { expected, price: await page.getByLabel('価格（表示）').inputValue(), label: await page.getByLabel('お問い合わせ 選択肢名').inputValue(), order: await page.getByLabel('表示順').inputValue(), changedPrice: '¥10,654', changedLabel: '進路相談・安定ID検証', changedOrder: '99', text: 'T4 staged local authoring proof' };
            await writeFile(journalPath, JSON.stringify(journal, null, 2), { flag: 'wx' });
            await open('/lessons/');
            const parent = preview.targets.find(t => t.recordId === 'lessons' && t.nodeId === 'frame');
            assert(parent);
            await selectTarget(parent);
            if (!journal.node) {
                await page.getByRole('region', { name: 'Insert local component', exact: true }).getByRole('combobox').nth(0).selectOption('main');
                await page.getByRole('region', { name: 'Insert local component', exact: true }).getByRole('combobox').nth(1).selectOption('pinsel.paragraph');
                const beforeIds = new Set(preview.targets.map(t => t.renderedNodeId));
                await edit(() => page.getByRole('button', { name: 'Insert at start of slot', exact: true }).click());
                const inserted = preview.targets.find(t => t.recordId === 'lessons' && t.componentId === 'pinsel.paragraph' && !beforeIds.has(t.renderedNodeId));
                assert(inserted, 'Inserted stable node not in preview');
                journal.node = inserted;
                await writeFile(journalPath, JSON.stringify(journal, null, 2));
            }
            const inserted = preview.targets.find(t => t.recordId === 'lessons' && t.nodeId === journal.node.nodeId);
            assert(inserted);
            record('stable-inserted-node', inserted);
            await selectTarget(inserted);
            let writes = 0;
            const count = r => {
                if (r.url().endsWith('/__zudo-native-edit') && r.postDataJSON()?.operation === 'document-edit')
                    writes++;
            };
            page.on('request', count);
            await page.locator('.cms-host-inspector').getByLabel('本文').fill(journal.text);
            await page.getByRole('button', { name: 'Save field', exact: true }).waitFor();
            await page.getByText('The preview still shows saved content.', { exact: false }).waitFor();
            assert.equal(writes, 0);
            assert(!(await frame().locator('body').innerText()).includes(journal.text));
            record('explicit-save-no-autosave', { writes, inputValue: await page.locator('.cms-host-inspector').getByLabel('本文').inputValue() });
            await shot('t4-unsaved-typed-field');
            assert.equal(await page.locator('.cms-host-inspector').getByLabel('本文').inputValue(), journal.text, 'Typed inspector value lost before Save');
            await edit(() => page.getByRole('button', { name: 'Save field', exact: true }).click());
            assert.equal(writes, 1);
            page.off('request', count);
            assert((await frame().locator('body').innerText()).includes(journal.text));
            await page.reload();
            await ready();
            assert(preview.targets.some(t => t.nodeId === journal.node.nodeId && t.props.text === journal.text));
            await shot('t4-local-saved-reloaded');
            record('t4-local-regression-pass', { nodeId: journal.node.nodeId, text: journal.text });
            await contentEntry();
            await saveField('価格（表示）', journal.changedPrice);
            await saveField('お問い合わせ 選択肢名', journal.changedLabel);
            await saveField('表示順', journal.changedOrder);
            record('content-stage-saved', journal);
            for (const visitor of ['/', '/lessons/']) {
                await open(visitor);
                assert((await frame().locator('body').innerText()).includes(journal.changedPrice));
                await shot(visitor === '/' ? 't4-shared-home' : 't4-shared-lessons');
            }
            for (const [query, id] of ([['1', 'consultation'], ['2', 'two-month'], ['3', 'four-month'], ['consultation', 'consultation'], ['two-month', 'two-month'], ['four-month', 'four-month']])) {
                await open('/contact/?course=' + query);
                assert.equal(await frame().locator('select#course option:checked').getAttribute('data-course-id'), id);
                if (id === 'consultation')
                    assert.equal(await frame().locator('select#course').inputValue(), journal.changedLabel);
                record('reordered-query', { query, id });
            }
            const actualOrder = await frame().locator('select#course option[data-course-id]').evaluateAll(options => options.map(o => o.getAttribute('data-course-id')));
            assert(actualOrder.indexOf('consultation') > 0);
            record('changed-dom-order', actualOrder);
            await shot('t4-reordered-contact');
            record('t4-stage-complete', journalPath);
        }
        else {
            journal = JSON.parse(await readFile(journalPath, 'utf8'));
            assert.equal(journal.expected, expected);
            assertHumanAttemptsVerified(journal);
            await open('/lessons/');
            if (journal.node) {
                const node = preview.targets.find(t => t.nodeId === journal.node.nodeId && t.recordId === 'lessons');
                if (!node) {
                    assert(journal.removal?.request?.input?.change?.kind === 'remove', 'Missing node without recorded removal request');
                    for (const key of ['providerId', 'recordId', 'nodeId']) assert.equal(journal.removal.request.input.target[key], journal.node[key]);
                    if (!journal.removal.receipt?.ok) {
                        const recovered = await page.request.post(new URL('/__zudo-native-edit', page.url()).href, { data: journal.removal.request, headers: nativeHeaders });
                        const receipt = await recovered.json();
                        assert(receipt.ok, 'Uncertain removal must recover its exact receipt before continuing');
                        journal.removal.receipt = receipt;
                        await writeFile(journalPath, JSON.stringify(journal, null, 2));
                    }
                } else {
                assert([journal.text, journal.laterText, journal.node.props?.text, ''].includes(node.props.text), 'Inserted node has unexpected intervening text');
                await selectTarget(node);
                await shot('t4-restarted-stable-node');
                await edit(() => page.getByRole('button', { name: 'Remove component', exact: true }).click());
                assert(!preview.targets.some(t => t.nodeId === journal.node.nodeId));
                }
            }
            await contentEntry();
            for (const [label, key, changed] of [['価格（表示）', 'price', 'changedPrice'], ['お問い合わせ 選択肢名', 'label', 'changedLabel'], ['表示順', 'order', 'changedOrder']]) {
                assert([journal[key], journal[changed]].includes(await page.getByLabel(label).inputValue()), 'Intervening Content change');
                if (await page.getByLabel(label).inputValue() !== journal[key]) await saveField(label, journal[key]);
            }
            record('t4-originals-restored', journal);
            await shot('t4-restored-content');
        }
    }
    if (mode === 'recovery') {
        await open('/lessons/');
        await selectConsultation();
        const originalOrder = preview.targets.filter(t => t.recordId === 'lessons').map(t => t.nodeId);
        await writeFile(run + '/placement-original-order.json', JSON.stringify(originalOrder));
        let committed = false, restored = false;
        try {
            let lostResolve;
            const lost = new Promise(resolve => lostResolve = resolve);
            let intercepted = false;
            await page.route('**/__zudo-native-edit', async (route) => {
                const input = route.request().postDataJSON();
                if (intercepted || input.operation !== 'document-edit') {
                    await route.continue();
                    return;
                }
                intercepted = true;
                try {
                    await writeFile(run + '/lost-request.json', JSON.stringify(input, null, 2));
                    const response = await route.fetch();
                    const receipt = await response.json();
                    await writeFile(run + '/lost-receipt.json', JSON.stringify(receipt, null, 2));
                    assert(response.ok() && receipt.ok, 'Mutation refused; no lost committed response');
                    await route.abort('failed');
                    lostResolve({ receipt, input });
                }
                catch (e) {
                    lostResolve({ error: e.message });
                    try {
                        await route.abort();
                    }
                    catch { }
                }
            });
            await page.getByRole('button', { name: 'Move page placement up', exact: true }).click();
            let lossTimer;
            const loss = await Promise.race([lost, new Promise(resolve => { lossTimer = setTimeout(() => resolve({ error: 'Lost-response capture timeout' }), 180000); })]);
            clearTimeout(lossTimer);
            assert(!loss.error, loss.error);
            committed = true;
            record('committed-response-withheld', { operation: loss.input.input.operationId });
            await context.close();
            context = null;
            await launch();
            await open('/lessons/');
            const recover = page.getByRole('button', { name: /Recover pending save.*previous session/ });
            await recover.waitFor({ timeout: 30000 });
            await shot('fresh-browser-pending');
            await recover.click();
            await recover.waitFor({ state: 'detached', timeout: 180000 });
            await ready();
            record('fresh-browser-recovered', loss.input.input.operationId);
            await selectConsultation();
            await move('down');
            assert.deepEqual(preview.targets.filter(t => t.recordId === 'lessons').map(t => t.nodeId), originalOrder);
            restored = true;
            record('placement-restored', originalOrder);
            await shot('recovered-and-restored');
        }
        finally {
            if (committed && !restored) {
                record('recovery-cleanup', 'Attempting exact supported inverse after receipt recovery');
                if (!context) {
                    await launch();
                }
                await open('/lessons/');
                const pending = page.getByRole('button', { name: /Recover pending save/ });
                if (await pending.count()) {
                    await pending.click();
                    await pending.waitFor({ state: 'detached', timeout: 180000 });
                    await ready();
                }
                const actual = preview.targets.filter(t => t.recordId === 'lessons').map(t => t.nodeId);
                if (JSON.stringify(actual) !== JSON.stringify(originalOrder)) {
                    const expected = [...originalOrder];
                    const index = expected.indexOf('consultation');
                    assert(index > 0);
                    [expected[index - 1], expected[index]] = [expected[index], expected[index - 1]];
                    assert.deepEqual(actual, expected, 'Intervening placement change: preserve and report, do not undo');
                    await selectConsultation();
                    await move('down');
                    assert.deepEqual(preview.targets.filter(t => t.recordId === 'lessons').map(t => t.nodeId), originalOrder);
                }
                record('recovery-cleanup-restored', originalOrder);
            }
        }
    }
    if (mode === 'negative') {
        const names = ['shared-field-shadow', 'invalid-local-slot', 'forged-owner', 'shared-reorder', 'child-without-placement', 'forged-slot', 'forged-placement'];
        for (const name of names) {
            await context.close();
            context = null;
            await launch();
            await open('/lessons/');
            const section = await selectConsultation();
            const child = preview.targets.find(t => t.recordId === 'lessons-consultation' && t.nodeId === 'intro' && !t.placement);
            assert(child);
            const coords = t => ({ renderedNodeId: t.renderedNodeId, providerId: t.providerId, recordId: t.recordId, nodeId: t.nodeId });
            const localFrame = preview.targets.find(t => t.recordId === 'lessons' && t.nodeId === 'frame');
            assert(localFrame);
            const cases = {
                'invalid-local-slot': [{ target: coords(localFrame), change: { kind: 'insert', slotId: 'not-a-declared-slot', componentId: 'pinsel.paragraph', nodeId: crypto.randomUUID() } }, 'component-invalid'],
                'forged-owner': [{ target: { ...coords(section), recordId: 'lessons' } }, 'unsupported-target'],
                'shared-field-shadow': [{ change: { kind: 'field', prop: 'title', value: 'FORBIDDEN-SHADOW' } }, 'unsupported-scope'],
                'shared-reorder': [{ change: { kind: 'reorder', direction: 'up' } }, 'unsupported-scope'],
                'child-without-placement': [{ target: coords(child) }, 'unsupported-scope'],
                'forged-slot': [{ change: { kind: 'reorder-placement', direction: 'up', slotId: 'course' } }, 'invalid-request'],
                'forged-placement': [{ change: { kind: 'reorder-placement', direction: 'up', placement: { ...section.placement, slotId: 'course' } } }, 'invalid-request']
            };
            const [patch, code] = cases[name];
            let doneResolve;
            const done = new Promise(resolve => doneResolve = resolve);
            const handler = async (route) => {
                const original = route.request().postDataJSON();
                if (original.operation !== 'document-edit') {
                    await route.continue();
                    return;
                }
                try {
                    const input = { ...original.input, ...patch };
                    const response = await route.fetch({ postData: JSON.stringify({ operation: 'document-edit', input }), timeout: 180000 });
                    const body = await response.json();
                    record('negative-result', { name, operationId: input.operationId, status: response.status(), body });
                    assert.equal(body.ok, false);
                    assert.equal(body.error?.code, code, name);
                    await route.fulfill({ response });
                    doneResolve({ ok: true });
                }
                catch (error) {
                    await route.abort().catch(() => { });
                    doneResolve({ error: error.stack });
                }
            };
            await page.route('**/__zudo-native-edit', handler);
            await page.getByRole('button', { name: 'Move page placement up', exact: true }).click();
            let timeout;
            const result = await Promise.race([done, new Promise(resolve => { timeout = setTimeout(() => resolve({ error: 'Negative endpoint timeout' }), 180000); })]);
            clearTimeout(timeout);
            await page.unroute('**/__zudo-native-edit', handler);
            assert(!result.error, result.error);
        }
        await shot('invalid-owner-slot-placement-refused');
    }
    if (mode.startsWith('assistant:')) {
      const [, caseId, phase] = mode.split(':');
      await runAssistantPhase({ phase, caseId, page, open, getPreview: () => preview, frame, record, shot,
        journalPath: join(artifacts, `assistant-${caseId}.json`),
        before: JSON.parse(await readFile(join(artifacts, 'before.json'), 'utf8')),
        restart: async () => { await context.close(); await launch(); return page; } });
    }
    record('PASS', mode);
}
catch (error) {
    record('FAIL', error.stack ?? String(error));
    if (page && !page.isClosed()) {
        await shot('failure').catch(() => { });
        await writeFile(run + '/failure-body.txt', await page.locator('body').innerText()).catch(() => { });
        if (await page.locator('iframe[title="Host rendered page"]').count())
            await writeFile(run + '/failure-frame.html', await frame().locator('html').innerHTML()).catch(() => { });
    }
    process.exitCode = 1;
}
finally {
    await context?.close().catch(error => { cleanupError = error.message; });
    try {
        process.kill(-server.pid, 'SIGTERM');
    }
    catch { }
    if (server.exitCode === null && server.signalCode === null)
        await new Promise(resolve => server.once('exit', resolve));
    // Wait for the owned process group, including the server's lease drain; never force-kill.
    if (server.pid)
        while (true) {
            try {
                process.kill(-server.pid, 0);
            }
            catch (error) {
                if (error.code === 'ESRCH')
                    break;
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    await assertFreePort(port);
    await writeFile(run + '/server.log', serverLog);
    await writeFile(run + '/evidence.json', JSON.stringify({ mode, expected, notes, cleanupError, serverExit: server.exitCode }, null, 2));
    console.log('EVIDENCE', run);
}
