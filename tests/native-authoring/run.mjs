import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { repoRoot, readJson, assertInstalledPin, assertRestored, verifyBuild, hashTree, scopeIdentity, assertRunScope } from './support.mjs';
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
    const flag = process.argv[i];
    assert(['--composer', '--stage', '--port', '--artifacts', '--scenario', '--restore', '--audit-data-root'].includes(flag), `Unknown option ${flag}`);
    assert(process.argv[i + 1] && !options[flag], `Missing or duplicate ${flag}`);
    options[flag] = process.argv[i + 1];
}
assert.match(options['--stage'] ?? '', /^[a-z0-9][a-z0-9-]+$/, 'Explicit --stage required; default authority is never a test target');
const installation = await assertInstalledPin(repoRoot, options['--composer']);
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use repository Node24 contract');
const scenario = options['--scenario'] ?? 'full';
assert(['full', 'inspect', 'negative', 'recovery'].includes(scenario));
if (scenario === 'negative')
    assert(options['--audit-data-root'], 'Negative proof requires explicit --audit-data-root for receipt-inclusive byte audit');
if(options['--audit-data-root'])assert.equal(resolve(options['--audit-data-root']),join(repoRoot,'packages/pinsel-content',`.native-authoring-${options['--stage']}`),'Audit root must be the explicitly selected Pinsel stage, never another directory');
const run = options['--restore'] ? resolve(options['--restore']) : options['--artifacts'] ? resolve(options['--artifacts']) : await mkdtemp(join(tmpdir(), 'pinsel-native-acceptance-'));
if (options['--artifacts'] && !options['--restore'])
    await mkdir(run); // Exclusive destination: never overwrite a prior run.
const journalPath = join(run, 'beforeimages.json');
const env = { ...process.env, EXPECTED_COMPOSER_SHA: options['--composer'], PINSEL_AUTHORING_STAGE: options['--stage'], NATIVE_ACCEPTANCE_PORT: options['--port'] ?? '4173', NATIVE_ACCEPTANCE_ARTIFACTS: run, NATIVE_ACCEPTANCE_JOURNAL: journalPath };
console.log(`Artifacts: ${run}`);
async function command(args) {
    console.log('COMMAND', JSON.stringify(args));
    await new Promise((resolve, reject) => {
        const child = spawn(args[0], args.slice(1), { cwd: repoRoot, env, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code ?? signal}`)));
    });
}
const capture = name => command(['pnpm', '--filter', '@pinsel/content', 'authoring:capture', '--', join(run, name)]);
const browser = mode => command([process.execPath, join(repoRoot, 'tests/native-authoring/browser.mjs'), mode]);
const exists = async (path) => { try {
    await access(path);
    return true;
}
catch {
    return false;
} };
const errors = [];
let before;
let fileHashes;
try {
    before = options['--restore'] ? await readJson(join(run, 'before.json')) : (await capture('before.json'), await readJson(join(run, 'before.json')));
    const scopeSnapshot = options['--restore'] ? null : before;
    let currentSnapshot = scopeSnapshot;
    if (!currentSnapshot) {
        // A fixed preflight filename is separate from immutable before evidence.
        const currentName = `restore-current-${Date.now()}.json`;
        await capture(currentName);
        currentSnapshot = await readJson(join(run, currentName));
    }
    const scope = { canonicalRepoRoot: await realpath(repoRoot), stage: options['--stage'], composer: options['--composer'], ...scopeIdentity(currentSnapshot) };
    if (options['--restore']) assertRunScope(await readJson(join(run, 'run-manifest.json')), scope);
    else await writeFile(join(run, 'run-manifest.json'), JSON.stringify({ scope, installation, beforeDigest: before.digest }, null, 2), { flag: 'wx' });
    if (options['--audit-data-root'])
        fileHashes = await hashTree(resolve(options['--audit-data-root']));
    if (options['--restore']) {
        await browser('restore');
    }
    else if (scenario === 'full') {
        await browser('inspect');
        await browser('stage');
        await capture('snapshot-A.json');
        await browser('later');
        await capture('snapshot-B.json');
        await command(['pnpm', '--filter', '@pinsel/content', 'authoring:build', '--', join(run, 'snapshot-A.json')]);
        const a = await readJson(join(run, 'snapshot-A.json'));
        const proof = await verifyBuild(a, join(repoRoot, 'packages/pinsel-content/.native-builds', a.digest), await readJson(journalPath));
        await capture('after-build-B.json');
        assert.deepEqual(await readJson(join(run, 'after-build-B.json')), await readJson(join(run, 'snapshot-B.json')), 'Building old A changed later saved B');
        await writeFile(join(run, 'exact-A-after-B-proof.json'), JSON.stringify({ ...proof, laterStateUnchanged: true }, null, 2));
    }
    else {
        await browser(scenario);
    }
}
catch (error) {
    errors.push(String(error.stack ?? error));
}
finally {
    if (!options['--restore'] && scenario === 'full' && await exists(journalPath)) {
        try {
            await browser('restore');
        }
        catch (error) {
            errors.push(`Supported inverse failed; retain journal and state: ${error.stack ?? error}`);
        }
    }
    if (before) {
        try {
            const name = `after-${Date.now()}.json`;
            await capture(name);
            const after = await readJson(join(run, name));
            if (scenario === 'negative' || scenario === 'inspect') {
                assert.deepEqual(after, before, 'Read-only/refused scenario changed public capture');
                if (fileHashes) {
                    const afterFiles = await hashTree(resolve(options['--audit-data-root']));
                    assert.deepEqual(afterFiles, fileHashes, 'Canonical files or receipt set changed');
                    await writeFile(join(run, 'no-write-file-audit.json'), JSON.stringify({ files: afterFiles, beforeAndAfterEqual: true }, null, 2));
                }
            }
            else
                assertRestored(before, after);
            await writeFile(join(run, 'restoration-proof.json'), JSON.stringify({ before: before.digest, after: after.digest, canonicalValuesRestored: true, metadataAndHistoryRetained: true }, null, 2));
        }
        catch (error) {
            errors.push(`Final public capture/audit failed: ${error.stack ?? error}`);
        }
    }
    await writeFile(join(run, `result-${Date.now()}.json`), JSON.stringify({ scenario, composer: options['--composer'], stage: options['--stage'], status: errors.length ? 'FAIL' : 'PASS', errors }, null, 2));
}
if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
}
