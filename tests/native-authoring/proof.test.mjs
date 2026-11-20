import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { artifactPath, assertRestored, baselineRoutes, canonicalProject, savedNode, verifyBuild, sha256, assertRunScope } from './support.mjs';
const fixture = () => ({ digest: 'a'.repeat(64), tokens: { content: 3 }, assets: { files: [] }, publicFiles: [], project: { providers: {
            compositions: [{ id: 'files', records: [{ id: 'lessons', updatedAt: 'old', document: { root: [{ id: 'frame', slots: { main: [{ id: 'owned', props: { text: 'saved A' }, slots: {} }] } }] } }] }],
            content: [{ id: 'content-filesystem', models: [], entries: [{ id: 'consultation', modelId: 'course', generation: 1, updatedAt: 'old', values: { price: 'price A', updatedAt: 'authored date' } }] }], mappings: [], sitemaps: []
        } } });
test('restoration ignores store timestamps but detects changed authored fields and node state', () => {
    const before = fixture();
    const after = structuredClone(before);
    after.project.providers.content[0].entries[0].updatedAt = 'new';
    after.project.providers.compositions[0].records[0].updatedAt = 'new';
    assertRestored(before, after);
    after.project.providers.content[0].entries[0].values.updatedAt = 'lost authored value';
    assert.throws(() => assertRestored(before, after));
    assert.equal(canonicalProject(before).providers.content[0].entries[0].values.updatedAt, 'authored date');
});
test('saved owner lookup cannot accept another provider or record with matching node id', () => {
    const snapshot = fixture();
    assert.equal(savedNode(snapshot, { providerId: 'files', recordId: 'lessons', nodeId: 'owned' }).props.text, 'saved A');
    assert.throws(() => savedNode(snapshot, { providerId: 'other', recordId: 'lessons', nodeId: 'owned' }));
});
test('build artifact paths cannot escape their output directory', () => {
    for (const path of ['/etc/passwd', '../outside', 'a/../outside', 'a\\outside', 'a//outside', ''])
        assert.throws(() => artifactPath('/tmp/output', path));
    assert.equal(artifactPath('/tmp/output', 'assets/site.css'), '/tmp/output/assets/site.css');
});
test('exact A proof allows authored extra routes, checks actual saved text, and rejects B/asset drift', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pinsel-native-proof-'));
    try {
        const snapshot = fixture();
        const bytes = Buffer.from('captured css');
        snapshot.publicFiles = [{ fileName: 'assets/site.css', base64: bytes.toString('base64'), byteLength: bytes.length, checksum: sha256(bytes) }];
        const routes = [...baselineRoutes, '/authored-new-page'];
        for (const route of routes) {
            const file = route === '/' ? 'index.html' : route.endsWith('.html') ? route.slice(1) : `${route.slice(1)}/index.html`;
            await mkdir(join(root, file, '..'), { recursive: true });
            await writeFile(join(root, file), 'saved A price A label A');
        }
        await mkdir(join(root, 'assets'));
        await writeFile(join(root, 'assets/site.css'), bytes);
        await writeFile(join(root, 'build-evidence.json'), JSON.stringify({ snapshotDigest: snapshot.digest, routes }));
        const journal = { node: { providerId: 'files', recordId: 'lessons', nodeId: 'owned' }, text: 'saved A', laterText: 'saved B', changedPrice: 'price A', changedLabel: 'label A' };
        assert.equal((await verifyBuild(snapshot, root, journal)).routes.length, baselineRoutes.length + 1);
        await writeFile(join(root, 'lessons/index.html'), 'saved B price A label A');
        await assert.rejects(verifyBuild(snapshot, root, journal));
        await writeFile(join(root, 'lessons/index.html'), 'saved A price A label A');
        await writeFile(join(root, 'assets/site.css'), 'wrong css');
        await assert.rejects(verifyBuild(snapshot, root, journal));
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('restore scope refuses another repository, stage, pin, workspace or renderer', () => {
    const scope = { canonicalRepoRoot: '/repo', stage: 'notes-v1', composer: 'a'.repeat(40), workspaceId: 'pinsel', schemaVersion: 1, renderer: { digest: 'original' } };
    assertRunScope({ scope }, structuredClone(scope));
    for (const key of Object.keys(scope)) {
        const altered = structuredClone(scope); altered[key] = 'different';
        assert.throws(() => assertRunScope({ scope }, altered));
    }
});

test('Content ownership proof rejects shadows and unrelated authored changes', async () => {
    const { assertContentOwnership, assertProposalReadOnly } = await import('./assistant-ui.mjs');
    const before = fixture(), after = structuredClone(before);
    after.project.providers.content[0].entries[0].values.price = 'new';
    after.tokens.content = 4; after.project.providers.content[0].entries[0].generation = 4;
    const change = { providerId: 'content-filesystem', entryId: 'consultation', fieldId: 'price', value: 'new', spec: { modelId: 'course' }, apply: { body: { ok: true, result: { receipt: { entry: { providerId: 'content-filesystem', modelId: 'course', recordId: 'consultation' }, expected: '4', operationKey: 'apply-test', revisionId: 'revision-test' } } } } };
    assertContentOwnership(before, after, change);
    assert.throws(() => assertProposalReadOnly(before, after));
    after.project.providers.compositions[0].records[0].document.root[0].slots.main[0].props.price = 'new';
    assert.throws(() => assertContentOwnership(before, after, change));
});

test('generation restoration is qualified, evidence-bound and does not strip authored generation', () => {
    const before = fixture();
    before.project.providers.content[0].entries[0].values.generation = 'authored';
    before.project.providers.content[0].entries.push({ id: 'consultation', modelId: 'other', generation: 2, values: { generation: 'other authored' } });
    const after = structuredClone(before); after.tokens.content = 5; after.project.providers.content[0].entries[0].generation = 5;
    const proof = { providerId: 'content-filesystem', modelId: 'course', entryId: 'consultation', generation: 5, evidence: 'receipt:undo:revision' };
    assert.equal(assertRestored(before, after, [proof])[0].beforeGeneration, 1);
    assert.throws(() => assertRestored(before, after));
    for (const generation of [0, 1, 4, 6, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => assertRestored(before, after, [{ ...proof, generation }]));
    assert.throws(() => assertRestored(before, after, [{ ...proof, modelId: 'other' }]));
    after.project.providers.content[0].entries[1].generation = 5;
    assert.throws(() => assertRestored(before, after, [proof]));
    after.project.providers.content[0].entries[1].generation = 2;
    after.project.providers.content[0].entries[0].values.generation = 'shadowed';
    assert.throws(() => assertRestored(before, after, [proof]));
});
test('Content Apply uses global token rather than old entry generation and rejects wrong owner/metadata', async () => {
    const { assertContentOwnership } = await import('./assistant-ui.mjs');
    const before = fixture();
    before.project.providers.content[0].entries.unshift({ id: 'consultation', modelId: 'other', generation: 2, values: { price: 'other', generation: 'authored' } });
    const after = structuredClone(before); after.tokens.content = 4;
    const entry = after.project.providers.content[0].entries[1]; entry.generation = 4; entry.values.price = 'new';
    const journal = { providerId: 'content-filesystem', entryId: 'consultation', fieldId: 'price', value: 'new', spec: { modelId: 'course' }, apply: { body: { ok: true, result: { receipt: { entry: { providerId: 'content-filesystem', modelId: 'course', recordId: 'consultation' }, expected: '4', operationKey: 'apply', revisionId: 'rev' } } } } };
    assertContentOwnership(before, after, journal); // entry 1 -> global 4
    for (const generation of [1, 2, 3, 5, 4.5, Number.MAX_SAFE_INTEGER + 1]) {
        const wrong = structuredClone(after); wrong.project.providers.content[0].entries[1].generation = generation;
        assert.throws(() => assertContentOwnership(before, wrong, journal));
    }
    const unrelated = structuredClone(after); unrelated.project.providers.content[0].entries[0].generation = 4;
    assert.throws(() => assertContentOwnership(before, unrelated, journal));
    const wrongReceipt = structuredClone(journal); wrongReceipt.apply.body.result.receipt.entry.modelId = 'other';
    assert.throws(() => assertContentOwnership(before, after, wrongReceipt));
    const unsafeBefore = structuredClone(before), unsafeAfter = structuredClone(after);
    unsafeBefore.tokens.content = Number.MAX_SAFE_INTEGER; unsafeAfter.tokens.content = Number.MAX_SAFE_INTEGER + 1;
    unsafeAfter.project.providers.content[0].entries[1].generation = unsafeAfter.tokens.content;
    assert.throws(() => assertContentOwnership(unsafeBefore, unsafeAfter, journal));
});
