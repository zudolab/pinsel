import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { currentFamilyInstallation } from './installation-bridge.mjs';
import { assertHistoricalFamilySource } from './installation-supplement-loader.mjs';
import { assertGitModes } from './source-rebind-loader.mjs';
const exec = promisify(execFile);

export const OPERATOR_BOUNDARY_OLD = 'b1eec63bfdb54d545d7f006e63df23fa46541d07';
export const OPERATOR_BOUNDARY_LOCK = '6eb4d870674fde1c169eb8e00c8e1662499676aa7c9d2a2d4ec64fa49f3203c0';
export const OPERATOR_BOUNDARY_COMPOSER = 'c5ffd410f74ba4b3aa003da068efeeae6e663c37';
export const OPERATOR_BOUNDARY_HISTORY = '0ab9eeff4096985df3effc00ce6437699a175b402f22a80cb00b5b774cc6594b';
export const OPERATOR_BOUNDARY_CAPTURE = 'd569d53788eb3164c4d3f33409b69a594cb99636a223f8ebc0716bc0122027a5';
/** The recorded boundary's historical anchors. Only tests pass other anchors, to exercise the checks on synthetic git/evidence. */
export const OPERATOR_BOUNDARY_ANCHORS = Object.freeze({ oldSource: OPERATOR_BOUNDARY_OLD, composer: OPERATOR_BOUNDARY_COMPOSER, lock: OPERATOR_BOUNDARY_LOCK, historySha256: OPERATOR_BOUNDARY_HISTORY, captureDigest: OPERATOR_BOUNDARY_CAPTURE });
const ANCHOR_KEYS = Object.keys(OPERATOR_BOUNDARY_ANCHORS).sort();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = path => path.startsWith('docs/') || path.startsWith('tests/native-authoring/');
const restricted = path => /(^|\/)(package\.json|[^/]*lock[^/]*|[^/]*config[^/]*)$/i.test(path);

export function assertOperatorChangePaths(changes) {
  for (const change of changes) {
    assert(allowed(change.path), `Source change outside docs/ and tests/native-authoring/: ${change.path}`);
    assert(!restricted(change.path), `Source change names a package, lock, or config: ${change.path}`);
  }
}

/** Tracked blob bytes at one commit. Used for a phase's recorded successor, not the current checkout. */
export async function sourceIdentityAt(repo, head) {
  const { stdout } = await exec('git', ['ls-tree', '-r', '-z', head], { cwd: repo, maxBuffer: 16 * 1024 * 1024 });
  const paths = stdout.split('\0').filter(Boolean).map(row => {
    const tab = row.indexOf('\t');
    return { mode: row.slice(0, tab).split(' ')[0], path: row.slice(tab + 1) };
  }).filter(row => row.mode === '100644' || row.mode === '100755');
  const child = spawn('git', ['cat-file', '--batch'], { cwd: repo });
  const chunks = [];
  let err = '';
  child.stdout.on('data', chunk => chunks.push(chunk));
  child.stderr.on('data', chunk => { err += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code ? reject(new Error(err || 'git cat-file failed')) : resolve(Buffer.concat(chunks)));
  });
  for (const row of paths) child.stdin.write(`${head}:${row.path}\n`);
  child.stdin.end();
  const buf = await done;
  const hashes = {};
  let offset = 0;
  for (const row of paths) {
    const nl = buf.indexOf(0x0a, offset);
    const header = buf.subarray(offset, nl).toString();
    const [, type, sizeText] = header.split(' ');
    assert.equal(type, 'blob', row.path);
    const size = Number(sizeText);
    const start = nl + 1;
    hashes[row.path] = sha256(buf.subarray(start, start + size));
    offset = start + size + 1;
  }
  assert.equal(offset, buf.length);
  return { head, hashes };
}

export function operatorSourceDelta(oldSource, liveSource) {
  const names = [...new Set([...Object.keys(oldSource.hashes), ...Object.keys(liveSource.hashes)])].sort();
  return names.filter(path => oldSource.hashes[path] !== liveSource.hashes[path]).map(path => ({ path, before: oldSource.hashes[path] ?? null, after: liveSource.hashes[path] ?? null }));
}

/** One fixed successor of the b1eec63 continuation source. Live head is checked, not substituted. */
export async function resolveContinuationInstallation({ repo, composer, stage, expectedSourceHead, provenancePath, sourceBoundary }) {
  const live = await currentFamilyInstallation(repo, composer, stage);
  if (live.source.head === expectedSourceHead) {
    assert(!sourceBoundary, 'Successor boundary does not apply at the continuation source');
    return { installation: live, sourceBoundary: null, liveSourceHead: live.source.head };
  }
  assert(sourceBoundary, 'Live source head has no successor boundary');
  assert.equal(expectedSourceHead, OPERATOR_BOUNDARY_OLD);
  const historical = JSON.parse(await readFile(provenancePath, 'utf8'));
  await assertHistoricalFamilySource(repo, historical);
  assert.equal(historical.source.head, expectedSourceHead);
  const boundary = await assertOperatorSourceBoundary({ descriptor: sourceBoundary, repo, live, historical });
  assert.deepEqual(live.installed, historical.installed);
  assert.deepEqual(live.identities, historical.identities);
  assert.equal(live.composer, historical.composer);
  assert.equal(live.stage, historical.stage);
  return { installation: historical, sourceBoundary: boundary, liveSourceHead: live.source.head };
}

export async function assertOperatorSourceBoundary({ descriptor, repo, live, historical }) {
  assert.deepEqual(Object.keys(descriptor).sort(), ['freezeManifestPath', 'freezeManifestSha256', 'proofPath']);
  const freezeBytes = await readFile(descriptor.freezeManifestPath);
  assert.equal(sha256(freezeBytes), descriptor.freezeManifestSha256);
  const frozen = JSON.parse(freezeBytes);
  for (const [path, hash] of Object.entries(frozen)) assert.equal(sha256(await readFile(path)), hash);
  const proof = JSON.parse(await readFile(descriptor.proofPath));
  assert.equal(proof.kind, 'family-continuation-source-boundary');
  assert.equal(proof.oldSource, OPERATOR_BOUNDARY_OLD);
  assert.equal(proof.source, live.source.head);
  assert.notEqual(proof.source, proof.oldSource);
  assert.equal(proof.composer, OPERATOR_BOUNDARY_COMPOSER);
  assert.equal(proof.lock, OPERATOR_BOUNDARY_LOCK);
  assert.equal(sha256(await readFile(join(repo, 'pnpm-lock.yaml'))), OPERATOR_BOUNDARY_LOCK);
  assert.equal(live.source.hashes['pnpm-lock.yaml'], historical.source.hashes['pnpm-lock.yaml']);
  assert.equal(proof.historyLength, 27);
  assert.equal(proof.historySha256, OPERATOR_BOUNDARY_HISTORY);
  assert.equal(sha256(await readFile(proof.historyPath)), proof.historySha256);
  assert.equal(JSON.parse(await readFile(proof.historyPath, 'utf8')).length, 27);
  assert.equal(proof.captureDigest, OPERATOR_BOUNDARY_CAPTURE);
  assert.equal(JSON.parse(await readFile(proof.capturePath, 'utf8')).digest, proof.captureDigest);
  const changes = operatorSourceDelta(historical.source, live.source);
  assert.deepEqual(proof.changes, changes);
  assertOperatorChangePaths(changes);
  await assertGitModes(repo, proof.oldSource, proof.source, changes);
  assert.equal(dirname(descriptor.proofPath), dirname(descriptor.freezeManifestPath));
  return { ...proof, descriptor };
}

/** A past phase keeps the successor source sealed in its own intent. Current HEAD is not substituted. */
export async function assertRecordedOperatorBoundary({ descriptor, repo, historical, provenanceSourceHead, anchors = OPERATOR_BOUNDARY_ANCHORS }) {
  assert.deepEqual(Object.keys(anchors).sort(), ANCHOR_KEYS);
  assert.deepEqual(Object.keys(descriptor).sort(), ['freezeManifestPath', 'freezeManifestSha256', 'proofPath']);
  const freezeBytes = await readFile(descriptor.freezeManifestPath);
  assert.equal(sha256(freezeBytes), descriptor.freezeManifestSha256);
  const frozen = JSON.parse(freezeBytes);
  for (const [path, hash] of Object.entries(frozen)) assert.equal(sha256(await readFile(path)), hash);
  const proof = JSON.parse(await readFile(descriptor.proofPath));
  assert.equal(proof.kind, 'family-continuation-source-boundary');
  assert.equal(proof.oldSource, anchors.oldSource);
  assert.equal(proof.oldSource, historical.source.head);
  assert.equal(proof.source, provenanceSourceHead, 'Recorded successor source is not this phase provenance');
  assert.notEqual(proof.source, proof.oldSource);
  assert.equal(proof.composer, anchors.composer);
  assert.equal(proof.composer, historical.composer);
  assert.equal(proof.lock, anchors.lock);
  assert.equal(sha256(await readFile(join(repo, 'pnpm-lock.yaml'))), anchors.lock);
  const recorded = await sourceIdentityAt(repo, proof.source);
  assert.equal(recorded.hashes['pnpm-lock.yaml'], historical.source.hashes['pnpm-lock.yaml']);
  assert.equal(proof.historyLength, 27);
  assert.equal(proof.historySha256, anchors.historySha256);
  assert.equal(sha256(await readFile(proof.historyPath)), proof.historySha256);
  assert.equal(JSON.parse(await readFile(proof.historyPath, 'utf8')).length, 27);
  assert.equal(proof.captureDigest, anchors.captureDigest);
  assert.equal(JSON.parse(await readFile(proof.capturePath, 'utf8')).digest, proof.captureDigest);
  const changes = operatorSourceDelta(historical.source, recorded);
  assert.deepEqual(proof.changes, changes);
  assertOperatorChangePaths(changes);
  await assertGitModes(repo, proof.oldSource, proof.source, changes);
  assert.equal(dirname(descriptor.proofPath), dirname(descriptor.freezeManifestPath));
  return recorded;
}
