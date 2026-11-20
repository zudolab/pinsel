import { test } from 'vitest';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  OPERATOR_BOUNDARY_ANCHORS, OPERATOR_BOUNDARY_CAPTURE, OPERATOR_BOUNDARY_COMPOSER, OPERATOR_BOUNDARY_HISTORY, OPERATOR_BOUNDARY_LOCK, OPERATOR_BOUNDARY_OLD,
  assertOperatorChangePaths, assertRecordedOperatorBoundary, operatorSourceDelta, sourceIdentityAt,
} from './continuation-source-boundary.mjs';
import { syntheticGit } from './fixtures/synthetic-git.mjs';

// Every input below is synthetic: a throwaway git repository, a fake lock, a 27-entry history of fake
// paths and an obviously fake capture digest. The historical originals are only checked by
// historical-evidence.test.mjs when PINSEL_HISTORICAL_EVIDENCE_ROOT is set.
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const LOCK = 'synthetic-lock: not a pnpm lockfile\n';
const COMPOSER = 'feed'.repeat(10);
const CAPTURE = 'synthetic-capture-digest-for-history27';
const HISTORY = JSON.stringify(Array.from({ length: 27 }, (_, index) => `/synthetic-evidence/history27/proof-${String(index).padStart(2, '0')}.json`));

async function syntheticRepository() {
  const dir = await mkdtemp(join(tmpdir(), 'synthetic-operator-boundary-'));
  const repo = join(dir, 'repo');
  await mkdir(repo);
  const g = syntheticGit(repo);
  g.init();
  const base = { 'pnpm-lock.yaml': LOCK, 'docs/handoff/synthetic.md': 'v1\n', 'tests/native-authoring/families/sequence.mjs': 'export const v = 1;\n', 'apps/site/page.mjs': 'export const page = 1;\n' };
  const old = await g.commit(base, { message: 'synthetic old source' });
  const unrelated = await g.commit({ 'docs/unrelated.md': 'other\n' }, { from: old, message: 'synthetic unrelated head' });
  const outside = await g.commit({ 'apps/site/page.mjs': 'export const page = 2;\n' }, { from: old });
  const restrictedHead = await g.commit({ 'tests/native-authoring/families/package.json': '{}\n' }, { from: old });
  const lockChange = await g.commit({ 'pnpm-lock.yaml': 'synthetic-lock: changed\n', 'docs/handoff/synthetic.md': 'v2\n' }, { from: old });
  const modeChange = await g.commit({ 'docs/handoff/synthetic.md': 'v2\n', 'tests/native-authoring/families/sequence.mjs': { mode: 0o755 } }, { from: old });
  const successor = await g.commit({ 'docs/handoff/synthetic.md': 'v2\n', 'tests/native-authoring/families/sequence.mjs': 'export const v = 2;\n' }, { from: old, message: 'synthetic sealed successor' });
  const oldIdentity = await sourceIdentityAt(repo, old);
  return { dir, repo, heads: { old, unrelated, outside, restrictedHead, lockChange, modeChange, successor }, historical: { source: oldIdentity, composer: COMPOSER } };
}

let counter = 0;
async function materialize(ctx, { source = ctx.heads.successor, history = HISTORY, capture = { digest: CAPTURE }, proof: patchProof, freeze: patchFreeze, anchors: patchAnchors } = {}) {
  const dir = join(ctx.dir, `evidence-${counter++}`);
  await mkdir(dir);
  const historyPath = join(dir, 'history27.json');
  const capturePath = join(dir, 'capture.json');
  await writeFile(historyPath, history);
  await writeFile(capturePath, JSON.stringify(capture));
  const anchors = { oldSource: ctx.heads.old, composer: COMPOSER, lock: sha256(LOCK), historySha256: sha256(HISTORY), captureDigest: CAPTURE };
  patchAnchors?.(anchors);
  const recorded = await sourceIdentityAt(ctx.repo, source);
  const proof = {
    kind: 'family-continuation-source-boundary', oldSource: ctx.heads.old, source, composer: COMPOSER, lock: sha256(LOCK),
    historyLength: 27, historySha256: sha256(HISTORY), historyPath, captureDigest: CAPTURE, capturePath,
    changes: operatorSourceDelta(ctx.historical.source, recorded),
  };
  patchProof?.(proof);
  const proofPath = join(dir, 'proof.json');
  await writeFile(proofPath, JSON.stringify(proof));
  const frozen = { [proofPath]: sha256(await readFile(proofPath)), [historyPath]: sha256(await readFile(historyPath)), [capturePath]: sha256(await readFile(capturePath)) };
  patchFreeze?.(frozen);
  const freezePath = join(dir, 'freeze.json');
  await writeFile(freezePath, JSON.stringify(frozen));
  const descriptor = { proofPath, freezeManifestPath: freezePath, freezeManifestSha256: sha256(await readFile(freezePath)) };
  return { descriptor, anchors, proof, paths: { proofPath, historyPath, capturePath, freezePath, dir } };
}

const check = (ctx, built, extra = {}) => assertRecordedOperatorBoundary({ descriptor: built.descriptor, repo: ctx.repo, historical: ctx.historical, provenanceSourceHead: ctx.heads.successor, anchors: built.anchors, ...extra });

test('operator change paths stay inside docs and native authoring', () => {
  assert.doesNotThrow(() => assertOperatorChangePaths([{ path: 'docs/handoff/2026-11-18.md' }, { path: 'tests/native-authoring/families/sequence.mjs' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'package.json' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'apps/site/src/page.mjs' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'tests/native-authoring/families/vitest.config.ts' }]));
});

test('the recorded boundary keeps the historical originals as its default anchors', () => {
  assert.deepEqual(OPERATOR_BOUNDARY_ANCHORS, { oldSource: OPERATOR_BOUNDARY_OLD, composer: OPERATOR_BOUNDARY_COMPOSER, lock: OPERATOR_BOUNDARY_LOCK, historySha256: OPERATOR_BOUNDARY_HISTORY, captureDigest: OPERATOR_BOUNDARY_CAPTURE });
  assert(Object.isFrozen(OPERATOR_BOUNDARY_ANCHORS));
});

test('a synthetic recorded successor source is accepted only at its sealed head', async () => {
  const ctx = await syntheticRepository();
  const built = await materialize(ctx);
  const recorded = await check(ctx, built);
  assert.equal(recorded.head, ctx.heads.successor);
  assert.deepEqual(operatorSourceDelta(ctx.historical.source, recorded).map(change => change.path), ['docs/handoff/synthetic.md', 'tests/native-authoring/families/sequence.mjs']);
  // The old source and an unrelated head are not the sealed successor.
  await assert.rejects(check(ctx, built, { provenanceSourceHead: ctx.heads.old }));
  await assert.rejects(check(ctx, built, { provenanceSourceHead: ctx.heads.unrelated }));
  // A tampered change list, even when the freeze manifest is re-sealed around it.
  const tampered = await materialize(ctx, { proof: proof => { proof.changes[0].path = 'package.json'; } });
  await assert.rejects(check(ctx, tampered));
  // Without injected anchors the historical originals are required, and synthetic input is refused.
  await assert.rejects(assertRecordedOperatorBoundary({ descriptor: built.descriptor, repo: ctx.repo, historical: ctx.historical, provenanceSourceHead: ctx.heads.successor }));
  await assert.rejects(check(ctx, built, { anchors: { ...built.anchors, extra: 'x' } }));
});

test('freeze, hash, count and descriptor tampering are refused', async () => {
  const ctx = await syntheticRepository();
  const wrongSeal = await materialize(ctx);
  wrongSeal.descriptor.freezeManifestSha256 = '0'.repeat(64);
  await assert.rejects(check(ctx, wrongSeal));
  const extraKey = await materialize(ctx);
  await assert.rejects(check(ctx, { ...extraKey, descriptor: { ...extraKey.descriptor, note: 'x' } }));
  const editedAfterSeal = await materialize(ctx);
  await writeFile(editedAfterSeal.paths.capturePath, JSON.stringify({ digest: CAPTURE, extra: true }));
  await assert.rejects(check(ctx, editedAfterSeal));
  const historyHash = await materialize(ctx, { anchors: anchors => { anchors.historySha256 = 'f'.repeat(64); } });
  await assert.rejects(check(ctx, historyHash));
  const shortHistory = JSON.stringify(JSON.parse(HISTORY).slice(0, 26));
  const short = await materialize(ctx, { history: shortHistory, proof: proof => { proof.historySha256 = sha256(shortHistory); }, anchors: anchors => { anchors.historySha256 = sha256(shortHistory); } });
  await assert.rejects(check(ctx, short));
  const wrongLength = await materialize(ctx, { proof: proof => { proof.historyLength = 28; } });
  await assert.rejects(check(ctx, wrongLength));
  const capture = await materialize(ctx, { capture: { digest: 'synthetic-other-capture' } });
  await assert.rejects(check(ctx, capture));
  const split = await materialize(ctx);
  const elsewhere = join(ctx.dir, 'elsewhere');
  await mkdir(elsewhere);
  const movedProof = join(elsewhere, 'proof.json');
  await writeFile(movedProof, await readFile(split.paths.proofPath));
  const movedFreeze = JSON.parse(await readFile(split.paths.freezePath, 'utf8'));
  movedFreeze[movedProof] = movedFreeze[split.paths.proofPath];
  await writeFile(split.paths.freezePath, JSON.stringify(movedFreeze));
  await assert.rejects(check(ctx, { ...split, descriptor: { proofPath: movedProof, freezeManifestPath: split.paths.freezePath, freezeManifestSha256: sha256(await readFile(split.paths.freezePath)) } }));
});

test('package, lock, composer, ownership and mode changes are refused', async () => {
  const ctx = await syntheticRepository();
  const composer = await materialize(ctx, { proof: proof => { proof.composer = 'beef'.repeat(10); } });
  await assert.rejects(check(ctx, composer));
  const otherHistorical = await materialize(ctx);
  await assert.rejects(check(ctx, otherHistorical, { historical: { ...ctx.historical, composer: 'beef'.repeat(10) } }));
  await assert.rejects(check(ctx, otherHistorical, { historical: { ...ctx.historical, source: { ...ctx.historical.source, head: ctx.heads.unrelated } } }));
  const lockValue = await materialize(ctx, { proof: proof => { proof.lock = 'f'.repeat(64); } });
  await assert.rejects(check(ctx, lockValue));
  const omitted = await materialize(ctx, { proof: proof => { proof.changes = proof.changes.slice(1); } });
  await assert.rejects(check(ctx, omitted));
  for (const head of ['outside', 'restrictedHead', 'lockChange', 'modeChange']) {
    const built = await materialize(ctx, { source: ctx.heads[head] });
    await assert.rejects(check(ctx, built, { provenanceSourceHead: ctx.heads[head] }), undefined, head);
  }
  const live = await materialize(ctx);
  await writeFile(join(ctx.repo, 'pnpm-lock.yaml'), 'synthetic-lock: edited working tree\n');
  await assert.rejects(check(ctx, live));
  await writeFile(join(ctx.repo, 'pnpm-lock.yaml'), LOCK);
  await chmod(join(ctx.repo, 'pnpm-lock.yaml'), 0o644);
  await check(ctx, live);
});
