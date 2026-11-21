import { test } from 'vitest';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { expectedFreshDigest } from './sequence-core.mjs';
import {
  OLD_COMPOSER, OLD_LOCK, HISTORY41_ANCHORS, HISTORY41_CAPTURE_DIGEST, HISTORY41_SHA256,
  assertCapturePreservation, assertHistory41Proofs, assertPackageTransition, captureIdentityDelta,
} from './package-transition-boundary.mjs';
import { syntheticGit } from './fixtures/synthetic-git.mjs';

// Every input below is synthetic: a throwaway git repository with a fake lock, 41 generated proof
// files, a generated capture and obviously fake digests. The historical history41 originals are only
// checked by historical-evidence.test.mjs when PINSEL_HISTORICAL_EVIDENCE_ROOT is set.
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const consumers = ['packages/pinsel-content', 'packages/pinsel-ui'];
const OLD_LOCK_BYTES = 'synthetic-lock: old, not a pnpm lockfile\n';
const SYNTHETIC_OLD_COMPOSER = 'feed'.repeat(10);
const SYNTHETIC_CAPTURE_DIGEST = 'synthetic-history41-capture-digest';
const nextComposer = 'ab'.repeat(20);
// Values the validator requires at these indexes; the proofs carrying them are generated here.
const RECOVERY_STATUS = { 22: 'MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED', 23: 'SAVED_FAMILY_OPERATION_CAPTURE_RECOVERY_VERIFIED', 26: 'MAPPING_OPERATOR_RELOAD_SNAPSHOT_RECOVERY_VERIFIED', 31: 'COMPOSITION_PROP_FILL_RECOVERY_VERIFIED', 33: 'TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED' };
const syntheticCapture = () => ({ digest: SYNTHETIC_CAPTURE_DIGEST, componentPack: { digest: 'synthetic-pack-old', compiler: 'synthetic-compiler-old' }, renderer: { digest: 'synthetic-renderer-old' }, project: { saved: 1 }, tokens: { compositions: 1 }, assets: [], publicFiles: ['synthetic.html'], schemaVersion: 1 });

/** One synthetic old-source repository and a 41-entry synthetic history, shared by a test. */
async function syntheticWorld() {
  const dir = await mkdtemp(join(tmpdir(), 'synthetic-boundary41-'));
  const repo = join(dir, 'repo');
  await mkdir(repo);
  const g = syntheticGit(repo);
  g.init();
  const oldSource = await g.commit({ 'pnpm-lock.yaml': OLD_LOCK_BYTES }, { message: 'synthetic old source' });
  const otherLockSource = await g.commit({ 'pnpm-lock.yaml': 'synthetic-lock: some other lock\n' }, { message: 'synthetic other lock' });
  const evidence = join(dir, 'history41');
  await mkdir(evidence);
  const capturePath = join(evidence, 'capture.json');
  await writeFile(capturePath, JSON.stringify(syntheticCapture()));
  const paths = [];
  for (let index = 0; index < 41; index += 1) {
    const proof = {
      status: RECOVERY_STATUS[index] ?? 'SYNTHETIC_PHASE_VERIFIED',
      intent: { sequence: { index, total: 45, step: index === 40 ? 'body-group' : `synthetic-step-${index}` } },
      beforeDigest: `synthetic-digest-${index - 1}`,
      afterDigest: index === 40 ? SYNTHETIC_CAPTURE_DIGEST : `synthetic-digest-${index}`,
      ...(index === 40 ? { afterCapture: capturePath } : {}),
      ...(index % 10 === 0 ? { composer: SYNTHETIC_OLD_COMPOSER } : {}),
    };
    const path = join(evidence, `proof-${String(index).padStart(2, '0')}.json`);
    await writeFile(path, JSON.stringify(proof));
    paths.push(path);
  }
  const historyPath = join(evidence, 'history41.json');
  await writeFile(historyPath, JSON.stringify(paths));
  const anchors = { historySha256: sha256(await readFile(historyPath)), captureDigest: SYNTHETIC_CAPTURE_DIGEST, composer: SYNTHETIC_OLD_COMPOSER, lock: sha256(OLD_LOCK_BYTES) };
  return { dir, repo, oldSource, otherLockSource, historyPath, capturePath, paths, anchors };
}

async function materialize(world, name, patch = {}) {
  const dir = join(world.dir, name);
  await mkdir(dir, { recursive: true });
  const history = JSON.parse(await readFile(world.historyPath, 'utf8'));
  const capture = JSON.parse(await readFile(world.capturePath, 'utf8'));
  const preservedCapture = structuredClone(capture);
  patch.capture?.(preservedCapture);
  const preservedPath = join(dir, 'preserved.json');
  await writeFile(preservedPath, JSON.stringify(preservedCapture));
  const rawPath = join(dir, 'raw.bin');
  await writeFile(rawPath, 'synthetic-raw-storage');
  const rawStat = await stat(rawPath);
  const lockPath = join(dir, 'pnpm-lock.yaml');
  await writeFile(lockPath, 'synthetic-lock: new\n');
  const lockHash = sha256(await readFile(lockPath));
  const payloadPath = join(dir, 'payload.tar');
  await writeFile(payloadPath, 'synthetic-payload');
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
      source: world.oldSource,
      composer: world.anchors.composer,
      lock: world.anchors.lock,
      stage: 'notes-v1',
      historyPath: world.historyPath,
      historySha256: world.anchors.historySha256,
      historyLength: 41,
      capturePath: world.capturePath,
      captureDigest: world.anchors.captureDigest,
      captureFileSha256: sha256(await readFile(world.capturePath)),
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
      identityChanges: captureIdentityDelta(capture, preservedCapture).filter(change => !change.unexpected).map(({ path, before, after }) => ({ path, before, after })),
      raw: { path: rawPath, size: rawStat.size, mode: rawStat.mode, sha256: sha256(await readFile(rawPath)) },
    },
  };
  patch.proof?.(proof, { history, capture });
  const proofPath = join(dir, 'proof.json');
  await writeFile(proofPath, JSON.stringify(proof));
  const frozen = { [proofPath]: sha256(await readFile(proofPath)), [world.historyPath]: world.anchors.historySha256, [world.capturePath]: proof.old.captureFileSha256, [preservedPath]: sha256(await readFile(preservedPath)), [lockPath]: proof.next.lock, [payloadPath]: proof.next.payloadSha256, [rawPath]: sha256(await readFile(rawPath)) };
  for (const path of history) frozen[path] = sha256(await readFile(path));
  for (const { root } of roots) frozen[join(root, 'package.json')] = sha256(await readFile(join(root, 'package.json')));
  patch.freeze?.(frozen, { payloadPath, payloadHash, lockPath, lockHash, history });
  const freezePath = join(dir, 'freeze.json');
  await writeFile(freezePath, JSON.stringify(frozen));
  return { proofPath, freezeManifestPath: freezePath, freezeManifestSha256: sha256(await readFile(freezePath)), rawPath };
}

const descriptorOf = ({ proofPath, freezeManifestPath, freezeManifestSha256 }) => ({ proofPath, freezeManifestPath, freezeManifestSha256 });
const transition = (world, built, extra = {}) => assertPackageTransition({ descriptor: descriptorOf(built), repo: world.repo, anchors: world.anchors, ...extra });

test('boundary41 keeps the historical history41 originals as its default anchors', () => {
  assert.deepEqual(HISTORY41_ANCHORS, { historySha256: HISTORY41_SHA256, captureDigest: HISTORY41_CAPTURE_DIGEST, composer: OLD_COMPOSER, lock: OLD_LOCK });
  assert(Object.isFrozen(HISTORY41_ANCHORS));
});

test('an untouched synthetic history41 is accepted through boundary41', async () => {
  const world = await syntheticWorld();
  const built = await materialize(world, 'intact');
  const proof = await transition(world, built);
  assert.equal(proof.old.historySha256, world.anchors.historySha256);
  assert.equal(proof.old.captureDigest, SYNTHETIC_CAPTURE_DIGEST);
  assert.equal(proof.preserved.identityChanges.length, 0);
  assert.notEqual(proof.next.composer, world.anchors.composer);
  // Without injected anchors the historical originals are required, and synthetic input is refused.
  await assert.rejects(assertPackageTransition({ descriptor: descriptorOf(built), repo: world.repo }));
  await assert.rejects(assertHistory41Proofs(world.paths, { nextComposer }));
  await assert.rejects(transition(world, built, { anchors: { ...world.anchors, extra: 'x' } }));
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

test('identity-only changes are admitted through a full synthetic boundary41 and saved changes are not', async () => {
  const world = await syntheticWorld();
  const identity = capture => { capture.digest = 'synthetic-digest-after-switch'; capture.componentPack.digest = 'synthetic-pack-new'; capture.componentPack.compiler = 'synthetic-compiler-new'; capture.renderer.digest = 'synthetic-renderer-new'; };
  const proof = await transition(world, await materialize(world, 'identity', { capture: identity }));
  assert.deepEqual(proof.preserved.identityChanges.map(change => change.path).sort(), ['componentPack.compiler', 'componentPack.digest', 'digest', 'renderer.digest']);
  await assert.rejects(transition(world, await materialize(world, 'unexplained', { capture: identity, proof: proof => { proof.preserved.identityChanges.pop(); } })));
  await assert.rejects(transition(world, await materialize(world, 'saved', { capture: capture => { identity(capture); capture.project.saved = 2; } })), /Saved or unknown capture field changed: project/);
  await assert.rejects(transition(world, await materialize(world, 'tokens', { capture: capture => { capture.tokens.compositions = 2; } })), /tokens/);
  await assert.rejects(transition(world, await materialize(world, 'preserved-digest', { capture: identity, proof: proof => { proof.preserved.captureDigest = 'synthetic-other'; } })));
});

test('package, lock, root, payload and stage mixups are refused', async () => {
  const world = await syntheticWorld();
  const old = world.anchors.composer;
  await assert.rejects(transition(world, await materialize(world, 'pkg', { composer: old, rootPin: old })), /Package mixup|pin mismatch|Lock mixup/);
  await assert.rejects(transition(world, await materialize(world, 'stage', { stage: 'other' })));
  await assert.rejects(transition(world, await materialize(world, 'old-stage', { proof: proof => { proof.old.stage = 'other'; } })));
  await assert.rejects(transition(world, await materialize(world, 'payload', { proof: proof => { proof.next.payloadSha256 = 'ab'.repeat(32); }, freeze: (frozen, ctx) => { frozen[ctx.payloadPath] = ctx.payloadHash; } })), /Payload/);
  await assert.rejects(transition(world, await materialize(world, 'root', { rootPin: 'cd'.repeat(20) })), /pin mismatch/);
  await assert.rejects(transition(world, await materialize(world, 'lock', { proof: proof => { proof.next.lock = world.anchors.lock; }, freeze: (frozen, ctx) => { frozen[ctx.lockPath] = ctx.lockHash; } })), /Lock mixup/);
  await assert.rejects(transition(world, await materialize(world, 'old-source-lock', { proof: proof => { proof.old.source = world.otherLockSource; } })), /Historical lock bytes/);
  await assert.rejects(transition(world, await materialize(world, 'old-composer', { proof: proof => { proof.old.composer = 'beef'.repeat(10); } })));
  await assert.rejects(transition(world, await materialize(world, 'old-lock', { proof: proof => { proof.old.lock = 'f'.repeat(64); } })));
  await assert.rejects(transition(world, await materialize(world, 'manifest', { proof: proof => { proof.next.installRoots[0].manifestHash = 'f'.repeat(64); } })), /Install root manifest mismatch/);
  await assert.rejects(transition(world, await materialize(world, 'consumer', { proof: proof => { proof.next.installRoots.pop(); } })));
});

test('old proof rewrites, hash mismatches and bad indexes are refused', async () => {
  const world = await syntheticWorld();
  const paths = JSON.parse(await readFile(world.historyPath, 'utf8'));
  await assertHistory41Proofs(paths, { nextComposer, anchors: world.anchors });
  const check = list => assertHistory41Proofs(list, { nextComposer, anchors: world.anchors });
  const dir = join(world.dir, 'rewrites');
  await mkdir(dir);
  const write = async (name, value) => { const path = join(dir, name); await writeFile(path, JSON.stringify(value)); return path; };
  const replace = (index, path) => { const list = paths.slice(); list[index] = path; return list; };
  const rewritten = JSON.parse(await readFile(paths[40], 'utf8'));
  rewritten.intent.sequence.index = 40;
  rewritten.intent.note = nextComposer;
  await assert.rejects(check(replace(40, await write('rewritten.json', rewritten))), /re-attributed/);
  const reindexed = structuredClone(rewritten);
  delete reindexed.intent.note;
  reindexed.intent.sequence.index = 39;
  await assert.rejects(check(replace(40, await write('reindexed.json', reindexed))), /index mismatch/);
  await assert.rejects(check(paths.slice(0, 40)), /length/);
  await assert.rejects(check(replace(39, paths[38])), /references/);
  const chain = JSON.parse(await readFile(paths[30], 'utf8'));
  chain.beforeDigest = 'synthetic-broken-chain';
  await assert.rejects(check(replace(30, await write('chain.json', chain))), /digest chain/);
  const status = JSON.parse(await readFile(paths[31], 'utf8'));
  status.status = 'SYNTHETIC_PHASE_VERIFIED';
  await assert.rejects(check(replace(31, await write('status.json', status))), /Recovery qualification/);
  const composer = JSON.parse(await readFile(paths[10], 'utf8'));
  composer.composer = 'beef'.repeat(10);
  await assert.rejects(check(replace(10, await write('composer.json', composer))));
  const step = JSON.parse(await readFile(paths[40], 'utf8'));
  step.intent.sequence.step = 'synthetic-other-step';
  await assert.rejects(check(replace(40, await write('step.json', step))));
  const total = JSON.parse(await readFile(paths[5], 'utf8'));
  total.intent.sequence.total = 44;
  await assert.rejects(check(replace(5, await write('total.json', total))));
  await assert.rejects(check(replace(7, 'relative/proof.json')), /Unpinned history reference/);
  await assert.rejects(transition(world, await materialize(world, 'tampered', { freeze: frozen => { frozen[world.historyPath] = 'f'.repeat(64); } })), /Tampered reference/);
  await assert.rejects(transition(world, await materialize(world, 'unpinned', { freeze: (frozen, ctx) => { delete frozen[ctx.history[12]]; } })), /Unpinned history proof/);
  await assert.rejects(transition(world, await materialize(world, 'history-hash', { proof: proof => { proof.old.historySha256 = 'f'.repeat(64); } })));
  await assert.rejects(transition(world, await materialize(world, 'capture-file', { proof: proof => { proof.old.captureFileSha256 = 'f'.repeat(64); }, freeze: frozen => { frozen[world.capturePath] = sha256(JSON.stringify(syntheticCapture())); } })));
  const wrongSeal = await materialize(world, 'seal');
  await assert.rejects(transition(world, { ...wrongSeal, freezeManifestSha256: '0'.repeat(64) }));
});

test('raw storage size, mode and byte changes are refused', async () => {
  const world = await syntheticWorld();
  await assert.rejects(transition(world, await materialize(world, 'size', { proof: proof => { proof.preserved.raw.size += 1; } })), /Raw storage size changed/);
  const mode = await materialize(world, 'mode');
  await chmod(mode.rawPath, 0o600);
  await assert.rejects(transition(world, mode), /Raw storage mode changed/);
  await assert.rejects(transition(world, await materialize(world, 'bytes', { proof: proof => { proof.preserved.raw.sha256 = 'f'.repeat(64); } })), /Raw storage bytes changed/);
  const edited = await materialize(world, 'edited');
  await writeFile(edited.rawPath, 'synthetic-raw-storage!');
  await assert.rejects(transition(world, edited), /Tampered reference/);
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
