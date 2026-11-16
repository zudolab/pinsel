import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const baselineRoutes = ['/', '/404.html', '/about', '/contact', '/faq', '/lessons', '/notes', '/notes/exam-schedule', '/notes/free-tuition', '/notes/german-language', '/notes/online-exam', '/notes/what-is-mappe', '/results', '/voices'];
export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function artifactPath(root, name) {
    assert(typeof name === 'string' && name && !name.includes('\\') && !name.includes('\0') && !name.startsWith('/') && name.split('/').every(p => p && p !== '.' && p !== '..'), 'Unsafe artifact path');
    const path = resolve(root, name);
    assert(!relative(root, path).startsWith('..') && !isAbsolute(relative(root, path)), 'Artifact escaped root');
    return path;
}
export async function assertInstalledPin(root, expected) {
    assert.match(expected ?? '', /^[a-f0-9]{40}$/, 'Expected immutable Composer SHA required');
    for (const path of ['apps/editor', 'apps/authoring-worker', 'packages/pinsel-content', 'packages/pinsel-ui']) {
        const manifest = await readJson(join(root, path, 'package.json'));
        assert.equal(manifest.dependencies['zudo-composer'], `git+https://github.com/Takazudo/zudo-composer.git#${expected}`, `Unexpected ${path} Composer pin`);
    }
    const lock = await readFile(join(root, 'pnpm-lock.yaml'), 'utf8');
    assert(lock.includes(expected), 'Lockfile does not contain expected immutable revision');
}
export async function assertFreePort(port) {
    assert(Number.isInteger(port) && port > 1023 && port <= 65535, 'Choose a loopback port between 1024 and 65535');
    const server = createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
function withoutRecordTimes(record) {
    const { createdAt: _created, updatedAt: _updated, ...rest } = record;
    return rest;
}
/** Compare canonical authored values; keep Content fields named updatedAt intact. */
export function canonicalProject(snapshot) {
    const project = structuredClone(snapshot.project);
    for (const domain of ['compositions', 'mappings', 'sitemaps']) {
        for (const provider of project.providers[domain])
            provider.records = provider.records.map(withoutRecordTimes);
    }
    for (const provider of project.providers.content) {
        provider.models = provider.models.map(withoutRecordTimes);
        provider.entries = provider.entries.map(withoutRecordTimes);
    }
    return project;
}
export function assertRestored(before, after) {
    assert.deepEqual(canonicalProject(after), canonicalProject(before), 'Authored workspace differs after supported inverses');
    assert.deepEqual(after.assets, before.assets, 'Assets changed');
    assert.deepEqual(after.publicFiles, before.publicFiles, 'Public bytes changed');
}
export function savedNode(snapshot, owner) {
    const provider = snapshot.project.providers.compositions.find(p => p.id === owner.providerId);
    const record = provider?.records.find(r => r.id === owner.recordId);
    function find(nodes) {
        for (const node of nodes) {
            if (node.id === owner.nodeId)
                return node;
            for (const children of Object.values(node.slots)) {
                const result = find(children);
                if (result)
                    return result;
            }
        }
    }
    const node = record && find(record.document.root);
    assert(node, 'Saved owner-qualified node missing');
    return node;
}
export async function verifyBuild(snapshot, output, journal) {
    const evidence = await readJson(join(output, 'build-evidence.json'));
    assert.equal(evidence.snapshotDigest, snapshot.digest);
    // T6 may legitimately add routes. Historical exact-14 proof remains separate.
    for (const route of baselineRoutes)
        assert(evidence.routes.includes(route), `Missing baseline route ${route}`);
    for (const route of evidence.routes) {
        assert(route.startsWith('/'));
        const name = route.endsWith('.html') ? route.slice(1) : `${route.slice(1).replace(/\/$/, '')}${route === '/' ? '' : '/'}index.html`;
        await readFile(artifactPath(output, name));
    }
    const node = savedNode(snapshot, journal.node);
    assert.equal(node.props.text, journal.text, 'Captured node contains stale text');
    const home = await readFile(join(output, 'index.html'), 'utf8');
    const lessons = await readFile(join(output, 'lessons/index.html'), 'utf8');
    const contact = await readFile(join(output, 'contact/index.html'), 'utf8');
    assert(home.includes(journal.changedPrice) && lessons.includes(journal.changedPrice), 'Shared price absent from static output');
    assert(contact.includes(journal.changedLabel), 'Contact option label absent');
    assert(lessons.includes(journal.text) && !lessons.includes(journal.laterText), 'Build did not retain exact captured A text');
    const files = [];
    for (const file of [...snapshot.publicFiles, ...snapshot.assets.files]) {
        const bytes = await readFile(artifactPath(output, file.fileName));
        assert.equal(bytes.toString('base64'), file.base64);
        assert.equal(bytes.length, file.byteLength);
        assert.equal(sha256(bytes), file.checksum);
        files.push({ fileName: file.fileName, checksum: file.checksum, byteLength: file.byteLength });
    }
    return { snapshotDigest: snapshot.digest, savedNode: node, owner: journal.node.nodeId, routes: evidence.routes, files, lessonsHtmlSha256: sha256(lessons) };
}
/** Supplemental byte audit only; snapshots are always produced by the public capture command. */
export async function hashTree(root) {
    const { readdir, lstat } = await import('node:fs/promises');
    const result = {};
    async function walk(directory) {
        for (const entry of await readdir(directory)) {
            const path = join(directory, entry);
            const stat = await lstat(path);
            assert(!stat.isSymbolicLink(), 'Canonical audit root must not contain symlinks');
            if (stat.isDirectory())
                await walk(path);
            else if (stat.isFile())
                result[relative(root, path)] = sha256(await readFile(path));
        }
    }
    await walk(root);
    return result;
}
