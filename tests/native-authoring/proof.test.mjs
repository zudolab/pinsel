import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { artifactPath, assertRestored, baselineRoutes, canonicalProject, savedNode, verifyBuild, sha256 } from './support.mjs';
const fixture = () => ({ digest: 'a'.repeat(64), assets: { files: [] }, publicFiles: [], project: { providers: {
            compositions: [{ id: 'files', records: [{ id: 'lessons', updatedAt: 'old', document: { root: [{ id: 'frame', slots: { main: [{ id: 'owned', props: { text: 'saved A' }, slots: {} }] } }] } }] }],
            content: [{ id: 'content-filesystem', models: [], entries: [{ id: 'consultation', modelId: 'course', updatedAt: 'old', values: { price: 'price A', updatedAt: 'authored date' } }] }], mappings: [], sitemaps: []
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
