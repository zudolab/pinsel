// Read-only preflight copied from accepted consumer support; no mutable helper import.
import assert from 'node:assert/strict';import{readFile,realpath}from'node:fs/promises';import{createHash}from'node:crypto';import{createServer}from'node:net';import{join}from'node:path';const readJson=async p=>JSON.parse(await readFile(p,'utf8'));const sha256=b=>createHash('sha256').update(b).digest('hex');
export async function assertInstalledPin(root, expected) {
    assert.match(expected ?? '', /^[a-f0-9]{40}$/, 'Expected immutable Composer SHA required');
    for (const path of ['apps/editor', 'apps/authoring-worker', 'packages/pinsel-content', 'packages/pinsel-ui']) {
        const manifest = await readJson(join(root, path, 'package.json'));
        assert.equal(manifest.dependencies['zudo-composer'], `git+https://github.com/Takazudo/zudo-composer.git#${expected}`, `Unexpected ${path} Composer pin`);
    }
    const installedRoots = [];
    for (const path of ['apps/editor', 'apps/authoring-worker', 'packages/pinsel-content', 'packages/pinsel-ui']) {
        const installedRoot = await realpath(join(root, path, 'node_modules/zudo-composer'));
        assert(installedRoot.includes('/node_modules/.pnpm/zudo-composer@'), 'Installed Composer is not an independent pnpm package');
        const manifest = await readJson(join(installedRoot, 'package.json'));
        assert.equal(manifest.name, 'zudo-composer');
        installedRoots.push({ consumer: path, installedRoot, packageManifestSha256: sha256(await readFile(join(installedRoot, 'package.json'))) });
    }
    const installedLock = await readFile(join(root, 'node_modules/.pnpm/lock.yaml'), 'utf8');
    assert(installedLock.includes(`https://codeload.github.com/Takazudo/zudo-composer/tar.gz/${expected}`), 'Installed lock lacks expected revision');
    const lock = await readFile(join(root, 'pnpm-lock.yaml'), 'utf8');
    assert(lock.includes(expected), 'Lockfile does not contain expected immutable revision');
    return { installedRoots, installedLockSha256: sha256(installedLock), qualification: 'Resolved installed package roots and installed lock; frozen install remains required. This is not a cryptographic source-byte attestation.' };
}
export async function assertFreePort(port) {
    assert(Number.isInteger(port) && port > 1023 && port <= 65535, 'Choose a loopback port between 1024 and 65535');
    const server = createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
