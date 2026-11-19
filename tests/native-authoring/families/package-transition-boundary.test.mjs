import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { repoRoot } from './config.mjs';
import { expectedFreshDigest } from './sequence-core.mjs';
import { OLD_COMPOSER, OLD_LOCK, HISTORY41_CAPTURE_DIGEST, HISTORY41_SHA256, assertCapturePreservation, assertHistory41Proofs, assertPackageTransition } from './package-transition-boundary.mjs';

const historyPath = '/workspace/composer-adoption-notes/results-continuation24-phase40-02/history41.json';
const capturePath = '/workspace/composer-adoption-notes/results-continuation24-phase40-02/artifacts/after.json';
const oldSource = '1ab3f474e4bcfc3babf57ff40f0359b2819806f7';
const nextComposer = 'ab'.repeat(20);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const consumers = ['apps/authoring-worker', 'apps/editor', 'packages/pinsel-content', 'packages/pinsel-ui'];

async function materialize(dir, patch = {}) {
  await mkdir(dir, { recursive: true });
  const history = JSON.parse(await readFile(historyPath, 'utf8'));
  const capture = JSON.parse(await readFile(capturePath, 'utf8'));
  const preservedCapture = structuredClone(capture);
  patch.capture?.(preservedCapture);
  const preservedPath = join(dir, 'preserved.json');
  await writeFile(preservedPath, JSON.stringify(preservedCapture));
  const rawPath = join(dir, 'raw.bin');
  await writeFile(rawPath, 'raw-storage');
  const rawStat = await stat(rawPath);
  const lockPath = join(dir, 'pnpm-lock.yaml');
  await writeFile(lockPath, 'new-lock\n');
  const lockHash = sha256(await readFile(lockPath));
  const payloadPath = join(dir, 'payload.tar');
  await writeFile(payloadPath, 'payload-s');
  const payloadHash = sha256(await readFile(payloadPath));
  const roots = [];
  for (const consumer of consumers) {
    const root = join(dir, consumer);
    await mkdir(root, { recursive: true });
    const pin = patch.rootPin ?? nextComposer;
    const manifest = JSON.stringify({ dependencies: { 'zudo-composer': `git+https://github.com/Takazudo/zudo-composer.git#${pin}` } });
    await writeFile(join(root, 'package.json'), manifest);
    roots.push({ consumer, root, manifestHash: sha256(manifest) });
  }
  const proof = {
    kind: 'family-package-transition-boundary',
    boundary: 41,
    old: {
      source: oldSource,
      composer: OLD_COMPOSER,
      lock: OLD_LOCK,
      stage: 'notes-v1',
      historyPath,
      historySha256: HISTORY41_SHA256,
      historyLength: 41,
      capturePath,
      captureDigest: HISTORY41_CAPTURE_DIGEST,
      captureFileSha256: sha256(await readFile(capturePath)),
    },
    next: {
      source: 'cd'.repeat(20),
      composer: patch.composer ?? nextComposer,
      lock: lockHash,
      lockPath,
      stage: patch.stage ?? 'notes-v1',
      payloadPath,
      payloadSha256: payloadHash,
      installRoots: roots,
    },
    preserved: {
      capturePath: preservedPath,
      captureDigest: preservedCapture.digest,
      identityChanges: [],
      raw: { path: rawPath, size: rawStat.size, mode: rawStat.mode, sha256: sha256(await readFile(rawPath)) },
    },
  };
  proof.preserved.identityChanges = (await import('./package-transition-boundary.mjs')).captureIdentityDelta(capture, preservedCapture).filter(change => !change.unexpected).map(({ path, before, after }) => ({ path, before, after }));
  patch.proof?.(proof, { history, capture });
  const proofPath = join(dir, 'proof.json');
  await writeFile(proofPath, JSON.stringify(proof));
  const frozen = { [proofPath]: sha256(await readFile(proofPath)), [historyPath]: HISTORY41_SHA256, [capturePath]: proof.old.captureFileSha256, [preservedPath]: sha256(await readFile(preservedPath)), [lockPath]: proof.next.lock, [payloadPath]: proof.next.payloadSha256, [rawPath]: proof.preserved.raw.sha256 };
  for (const path of history) frozen[path] = sha256(await readFile(path));
  for (const row of roots) frozen[join(row.root, 'package.json')] = row.manifestHash;
  patch.freeze?.(frozen, { payloadPath, payloadHash, lockPath, lockHash });
  const freezePath = join(dir, 'freeze.json');
  await writeFile(freezePath, JSON.stringify(frozen));
  return { proofPath, freezeManifestPath: freezePath, freezeManifestSha256: sha256(await readFile(freezePath)) };
}

test('untouched history41 is accepted through boundary41', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'boundary41-'));
  const descriptor = await materialize(dir);
  const proof = await assertPackageTransition({ descriptor, repo: repoRoot });
  assert.equal(proof.old.historySha256, HISTORY41_SHA256);
  assert.equal(proof.old.captureDigest, HISTORY41_CAPTURE_DIGEST);
  assert.equal(proof.preserved.identityChanges.length, 0);
  assert.notEqual(proof.next.composer, OLD_COMPOSER);
});

test('identity-only capture changes are explained and other fields are refused', async () => {
  const before = { digest: 'a', componentPack: { digest: 'p', compiler: 'old' }, renderer: { digest: 'r' }, project: { saved: 1 }, tokens: { compositions: 1 }, assets: [], publicFiles: ['a'], schemaVersion: 1 };
  const identical = structuredClone(before);
  assert.deepEqual(assertCapturePreservation(before, identical, null), []);
  const changed = structuredClone(before);
  changed.digest = 'b';
  changed.componentPack.digest = 'q';
  const boundary = { kind: 'family-package-transition-boundary', boundary: 41, old: { captureDigest: 'a' }, preserved: { captureDigest: 'b', identityChanges: [{ path: 'componentPack.digest', before: 'p', after: 'q' }, { path: 'digest', before: 'a', after: 'b' }] } };
  assert.equal(assertCapturePreservation(before, changed, boundary).length, 2);
  assert.throws(() => assertCapturePreservation(before, changed, null), /boundary41/);
  const saved = structuredClone(changed);
  saved.tokens.compositions = 2;
  assert.throws(() => assertCapturePreservation(before, saved, boundary), /tokens/);
  const project = structuredClone(changed);
  project.project.saved = 2;
  assert.throws(() => assertCapturePreservation(before, project, boundary), /project/);
  const files = structuredClone(changed);
  files.publicFiles.push('b');
  assert.throws(() => assertCapturePreservation(before, files, boundary), /publicFiles/);
  const assets = structuredClone(changed);
  assets.assets.push('x');
  assert.throws(() => assertCapturePreservation(before, assets, boundary), /assets/);
  const unknown = structuredClone(changed);
  unknown.schemaVersion = 2;
  assert.throws(() => assertCapturePreservation(before, unknown, boundary), /schemaVersion/);
});

test('package, lock, root, payload and stage mixups are refused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'boundary41-mix-'));
  await assert.rejects(assertPackageTransition({ descriptor: await materialize(join(dir, 'pkg'), { composer: OLD_COMPOSER, rootPin: OLD_COMPOSER }), repo: repoRoot }), /Package mixup|pin mismatch|Lock mixup/);
  await assert.rejects(assertPackageTransition({ descriptor: await materialize(join(dir, 'stage'), { stage: 'other' }), repo: repoRoot }));
  await assert.rejects(assertPackageTransition({ descriptor: await materialize(join(dir, 'payload'), { proof: proof => { proof.next.payloadSha256 = 'ab'.repeat(32); }, freeze: (frozen, ctx) => { frozen[ctx.payloadPath] = ctx.payloadHash; } }), repo: repoRoot }), /Payload/);
  await assert.rejects(assertPackageTransition({ descriptor: await materialize(join(dir, 'root'), { rootPin: 'cd'.repeat(20) }), repo: repoRoot }), /pin mismatch/);
  await assert.rejects(assertPackageTransition({ descriptor: await materialize(join(dir, 'lock'), { proof: proof => { proof.next.lock = OLD_LOCK; }, freeze: (frozen, ctx) => { frozen[ctx.lockPath] = ctx.lockHash; } }), repo: repoRoot }), /Lock mixup/);
});

test('old proof rewrites, hash mismatches and bad indexes are refused', async () => {
  const paths = JSON.parse(await readFile(historyPath, 'utf8'));
  await assertHistory41Proofs(paths, { nextComposer });
  const dir = await mkdtemp(join(tmpdir(), 'boundary41-proof-'));
  const rewritten = JSON.parse(await readFile(paths[40], 'utf8'));
  rewritten.intent.sequence.index = 40;
  rewritten.intent.note = nextComposer;
  const rewrittenPath = join(dir, 'rewritten.json');
  await writeFile(rewrittenPath, JSON.stringify(rewritten));
  const badPaths = paths.slice();
  badPaths[40] = rewrittenPath;
  await assert.rejects(assertHistory41Proofs(badPaths, { nextComposer }), /re-attributed/);
  const reindexed = structuredClone(rewritten);
  delete reindexed.intent.note;
  reindexed.intent.sequence.index = 39;
  const reindexedPath = join(dir, 'reindexed.json');
  await writeFile(reindexedPath, JSON.stringify(reindexed));
  const indexPaths = paths.slice();
  indexPaths[40] = reindexedPath;
  await assert.rejects(assertHistory41Proofs(indexPaths, { nextComposer }), /index mismatch/);
  await assert.rejects(assertHistory41Proofs(paths.slice(0, 40), { nextComposer }), /length/);
  const descriptor = await materialize(dir, { freeze: frozen => { frozen[historyPath] = 'f'.repeat(64); } });
  await assert.rejects(assertPackageTransition({ descriptor, repo: repoRoot }), /Tampered reference/);
});

test('a digest switch is refused without boundary41 and phase40 is not the resume index', () => {
  const history = [{ afterDigest: 'old' }];
  assert.equal(expectedFreshDigest(history, null, null, null), 'old');
  const boundary = { kind: 'family-package-transition-boundary', boundary: 41, old: { historyLength: 41, captureDigest: HISTORY41_CAPTURE_DIGEST, composer: OLD_COMPOSER, stage: 'notes-v1' }, next: { composer: nextComposer, stage: 'notes-v1' }, preserved: { captureDigest: 'new' } };
  const history41 = Array.from({ length: 41 }, () => ({ afterDigest: 'x' }));
  history41[40] = { afterDigest: HISTORY41_CAPTURE_DIGEST };
  assert.equal(expectedFreshDigest(history41, null, null, boundary), 'new');
  assert.throws(() => expectedFreshDigest(history41, null, null, { ...boundary, kind: 'other' }));
  assert.throws(() => expectedFreshDigest([{ afterDigest: HISTORY41_CAPTURE_DIGEST }], null, null, boundary));
});
