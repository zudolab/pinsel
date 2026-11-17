import { assertAssistantRunHumanSettled, assertAssistantHumanCapture } from "./assistant-human-save.mjs";
import { fullHumanGenerationChanges } from "./human-content-proof.mjs";
import { assertCompositionOwnership } from "./ownership-assertions.mjs";
import { assistantCases } from './assistant-scenarios.mjs';
import { assertContentOwnership, assertProposalReadOnly } from './assistant-ui.mjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { repoRoot, readJson, assertInstalledPin, assertRestored, verifyBuild, hashTree, contentOwner, scopeIdentity, assertRunScope } from './support.mjs';
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
assert(['full', 'inspect', 'negative', 'recovery', 'assistant'].includes(scenario));
if (scenario === 'negative')
    assert(options['--audit-data-root'], 'Negative proof requires explicit --audit-data-root for receipt-inclusive byte audit');
if(options['--audit-data-root'])assert.equal(resolve(options['--audit-data-root']),join(repoRoot,'packages/pinsel-content',`.native-authoring-${options['--stage']}`),'Audit root must be the explicitly selected Pinsel stage, never another directory');
const run = options['--restore'] ? resolve(options['--restore']) : options['--artifacts'] ? resolve(options['--artifacts']) : await mkdtemp(join(tmpdir(), 'pinsel-native-acceptance-'));
if (options['--artifacts'] && !options['--restore'])
    await mkdir(run); // Exclusive destination: never overwrite a prior run.
const journalPath = join(run, 'beforeimages.json');
const env = { ...process.env, EXPECTED_COMPOSER_SHA: options['--composer'], PINSEL_AUTHORING_STAGE: options['--stage'], NATIVE_ACCEPTANCE_PORT: options['--port'] ?? '4173', NATIVE_ACCEPTANCE_ARTIFACTS: run, NATIVE_ACCEPTANCE_JOURNAL: journalPath };
if (scenario === 'assistant') { assert.equal(options['--stage'], 'notes-v1'); env.PINSEL_ASSISTANT_PROVIDER = 'fake'; }
console.log(`Artifacts: ${run}`);
async function command(args, overrides = {}) {
    console.log('COMMAND', JSON.stringify(args));
    await new Promise((resolve, reject) => {
        const child = spawn(args[0], args.slice(1), { cwd: repoRoot, env: { ...env, ...overrides }, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code ?? signal}`)));
    });
}
const capture = name => command(['pnpm', '--filter', '@pinsel/content', 'authoring:capture', '--', join(run, name)]);
const browser = (mode, overrides) => command([process.execPath, join(repoRoot, 'tests/native-authoring/browser.mjs'), mode], overrides);
async function generationsFromJournals(baseline, after) {
    await assertAssistantRunHumanSettled(run);
    const byOwner = new Map(); let latestToken = baseline.tokens.content;
    for (const spec of [...assistantCases, { id: 'course-stale' }, { id: 'course-guard' }]) {
        const path = join(run, `assistant-${spec.id}.json`);
        if (!await exists(path)) continue;
        const journal = await readJson(path);
        if (journal.spec.domain !== 'content') continue;
        const ref = { providerId: journal.providerId, modelId: journal.spec.modelId, entryId: journal.entryId };
        const add = (generation, evidence) => {
            assert(Number.isSafeInteger(generation) && generation > 0); latestToken = Math.max(latestToken, generation);
            const key = JSON.stringify(ref), prior = byOwner.get(key);
            if (!prior || prior.generation < generation) byOwner.set(key, { ...ref, generation, evidence });
        };
        for (const result of [journal.apply, journal.recovery, journal.undo, journal.recoveredDuringRestore]) {
            if (!result?.body?.ok) continue;
            const receipt = result.body.result.receipt;
            assert.deepEqual(receipt.entry, { providerId: ref.providerId, modelId: ref.modelId, recordId: ref.entryId });
            assert(receipt.operationKey && receipt.revisionId);
            add(Number(receipt.expected), `receipt:${receipt.operationKey}:${receipt.revisionId}`);
        }
        for (const write of journal.humanContentWrites ?? []) add(write.generation, `human-ui-public-read:${write.beforeToken}:${write.generation}:${write.phase}`);
    }
    assert.equal(after.tokens.content, latestToken, 'Final Content token differs from successful Assistant/human evidence');
    return [...byOwner.values()].filter(change => change.generation > contentOwner(baseline.project, change).generation);
}
async function humanBrowser(id, phase) {
    await assertAssistantRunHumanSettled(run);
    const name = `assistant-${id}-${phase}-before-${Date.now()}.json`;
    await capture(name);
    const prior = await readJson(join(run, name));
    await browser(`assistant:${id}:${phase}`, { NATIVE_ACCEPTANCE_BEFORE_CAPTURE: name });
    const afterName = name.replace('-before-', '-after-'); await capture(afterName);
    assertAssistantHumanCapture(prior, await readJson(join(run, afterName)), await readJson(join(run, `assistant-${id}.json`)), name);
}

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
let scopeVerified = false;
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
    else await writeFile(join(run, 'run-manifest.json'), JSON.stringify({ scope, scenario, installation, beforeDigest: before.digest }, null, 2), { flag: 'wx' });
    scopeVerified = true;
    if (options['--audit-data-root'])
        fileHashes = await hashTree(resolve(options['--audit-data-root']));
    if (options['--restore']) {
        assert.equal((await readJson(join(run, 'run-manifest.json'))).scenario, scenario, 'Restore requires original --scenario');
        if (scenario !== 'assistant') await browser('restore');
    }
    else if (scenario === 'assistant') {
      for (const spec of assistantCases) {
        if (spec.id === 'local') await browser(`assistant:${spec.id}:setup`);
        await capture(`assistant-${spec.id}-before.json`);
        const caseBefore = await readJson(join(run, `assistant-${spec.id}-before.json`));
        await browser(`assistant:${spec.id}:propose`);
        await capture(`assistant-${spec.id}-proposed.json`);
        assertProposalReadOnly(caseBefore, await readJson(join(run, `assistant-${spec.id}-proposed.json`)));
        await browser(`assistant:${spec.id}:apply`);
        await capture(`assistant-${spec.id}-applied.json`);
        if (spec.domain === 'content') assertContentOwnership(caseBefore, await readJson(join(run, `assistant-${spec.id}-applied.json`)), await readJson(join(run, `assistant-${spec.id}.json`)));
        else assertCompositionOwnership(caseBefore, await readJson(join(run, `assistant-${spec.id}-applied.json`)), await readJson(join(run, `assistant-${spec.id}.json`)));
        await browser(`assistant:${spec.id}:undo`);
        await capture(`assistant-${spec.id}-undone.json`);
        assertRestored(caseBefore, await readJson(join(run, `assistant-${spec.id}-undone.json`)), await generationsFromJournals(caseBefore, await readJson(join(run, `assistant-${spec.id}-undone.json`))));
        if (spec.id === 'local') await browser(`assistant:${spec.id}:cleanup`);
      }
      for (const id of ['course-stale', 'course-guard']) {
        await browser(`assistant:${id}:propose`);
        await capture(`assistant-${id}-proposed.json`);
        assertRestored(before, await readJson(join(run, `assistant-${id}-proposed.json`)), await generationsFromJournals(before, await readJson(join(run, `assistant-${id}-proposed.json`))));
        if (id === 'course-guard') await browser(`assistant:${id}:apply`);
        await humanBrowser(id, 'intervene');
        await capture(`assistant-${id}-intervened.json`);
        await browser(`assistant:${id}:${id === 'course-stale' ? 'stale-refuse' : 'guard-refuse'}`);
        await capture(`assistant-${id}-refused.json`);
        assert.deepEqual(await readJson(join(run, `assistant-${id}-intervened.json`)), await readJson(join(run, `assistant-${id}-refused.json`)), 'Refused stale/Undo operation wrote canonical state');
        await humanBrowser(id, 'human-inverse');
        await capture(`assistant-${id}-restored.json`);
        assertRestored(before, await readJson(join(run, `assistant-${id}-restored.json`)), await generationsFromJournals(before, await readJson(join(run, `assistant-${id}-restored.json`))));
      }
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
    if (scopeVerified && before && scenario === 'assistant') {
      try {
      await assertAssistantRunHumanSettled(run);
      for (const id of ['course-stale', 'course-guard']) {
        const path = join(run, `assistant-${id}.json`);
        if (!await exists(path)) continue;
        try { const journal = await readJson(path); if (journal.humanContentAttempts?.length || journal.apply) await humanBrowser(id, 'human-inverse'); }
        catch (error) { errors.push(`Assistant ${id} human inverse held: ${error.stack ?? error}`); }
        await assertAssistantRunHumanSettled(run);
      }
      for (const spec of [...assistantCases].reverse()) {
        const path = join(run, `assistant-${spec.id}.json`);
        if (!await exists(path)) continue;
        try {
          const journal = await readJson(path);
          if (journal.conversationId) await browser(`assistant:${spec.id}:restore`);
          if (journal.fixture && !journal.cleanup) await browser(`assistant:${spec.id}:cleanup`);
        } catch (error) { errors.push(`Assistant ${spec.id} restoration held: ${error.stack ?? error}`); }
        await assertAssistantRunHumanSettled(run);
      }
      } catch (error) { errors.push(`ALL automatic Assistant restoration held; reconcile human Save evidence first: ${error.stack ?? error}`); }
    }
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
                { const generationChanges = assertRestored(before, after, scenario === 'assistant' ? await generationsFromJournals(before, after) : scenario === 'full' && await exists(journalPath) ? fullHumanGenerationChanges(before, after, await readJson(journalPath)) : []); await writeFile(join(run, `generation-audit-${Date.now()}.json`), JSON.stringify(generationChanges, null, 2)); }
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
