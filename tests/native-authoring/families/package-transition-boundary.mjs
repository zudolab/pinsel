/**
 * History41 package-transition boundary. The source-only successor boundary and
 * the boundary12 installation bridge stay unchanged. sequence.mjs still accepts
 * only the source-boundary argument. This verifier is what admits a later pin.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OPERATOR_BOUNDARY_COMPOSER, OPERATOR_BOUNDARY_LOCK } from './continuation-source-boundary.mjs';
import { repoRoot } from './config.mjs';

const exec = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const PACKAGE_TRANSITION_BOUNDARY = 41;
export const HISTORY41_LENGTH = 41;
export const HISTORY41_SHA256 = 'c6983a93c26e8dd7fec1ad384021e70a16f824a9cf67d29b15641f7f19219970';
export const HISTORY41_CAPTURE_DIGEST = '40a76427d5e40955abe4917c10009999b68e2952765051d6a3bf9052cb46378e';
export const OLD_COMPOSER = OPERATOR_BOUNDARY_COMPOSER;
export const OLD_LOCK = OPERATOR_BOUNDARY_LOCK;
const CONSUMERS = ['apps/authoring-worker', 'apps/editor', 'packages/pinsel-content', 'packages/pinsel-ui'];
const IDENTITY_PATHS = new Set(['digest', 'componentPack.digest', 'componentPack.compiler', 'renderer.digest']);
const RECOVERY_STATUS = {
  22: 'MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED',
  23: 'SAVED_FAMILY_OPERATION_CAPTURE_RECOVERY_VERIFIED',
  26: 'MAPPING_OPERATOR_RELOAD_SNAPSHOT_RECOVERY_VERIFIED',
  31: 'COMPOSITION_PROP_FILL_RECOVERY_VERIFIED',
  33: 'TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED',
};

function isPlain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Identity-only public-capture delta. Saved data and unknown fields are unexpected. */
export function captureIdentityDelta(before, after) {
  const changes = [];
  const walk = (left, right, path) => {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    if (IDENTITY_PATHS.has(path)) {
      changes.push({ path, before: left, after: right });
      return;
    }
    if (isPlain(left) && isPlain(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        walk(left[key], right[key], path ? `${path}.${key}` : key);
      }
      return;
    }
    changes.push({ path: path || '$', before: left, after: right, unexpected: true });
  };
  walk(before, after, '');
  return changes;
}

/** A digest or identity change is admitted only by an explicit boundary41 proof. */
export function assertCapturePreservation(before, after, boundary) {
  const changes = captureIdentityDelta(before, after);
  const unexpected = changes.filter(change => change.unexpected);
  assert.equal(unexpected.length, 0, `Saved or unknown capture field changed: ${unexpected[0]?.path ?? ''}`);
  const identity = changes.map(({ path, before: from, after: to }) => ({ path, before: from, after: to }));
  if (identity.length === 0) return identity;
  assert.equal(boundary?.kind, 'family-package-transition-boundary', 'Digest switch requires boundary41');
  assert.equal(boundary?.boundary, PACKAGE_TRANSITION_BOUNDARY);
  assert.deepEqual(boundary.preserved.identityChanges, identity);
  assert.equal(boundary.preserved.captureDigest, after.digest);
  assert.equal(boundary.old.captureDigest, before.digest);
  return identity;
}

async function lockHashAt(repo, head) {
  const { stdout } = await exec('git', ['show', `${head}:pnpm-lock.yaml`], { cwd: repo, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return sha256(stdout);
}

export async function assertHistory41Proofs(paths, { read = readFile, nextComposer } = {}) {
  assert.equal(paths.length, HISTORY41_LENGTH, 'history41 length');
  assert.equal(new Set(paths).size, HISTORY41_LENGTH, 'history41 references');
  const proofs = [];
  for (const [index, path] of paths.entries()) {
    assert.equal(typeof path, 'string');
    assert.equal(path.startsWith('/'), true, 'Unpinned history reference');
    const proof = JSON.parse(await read(path, 'utf8'));
    assert.equal(proof.intent.sequence.index, index, 'history index mismatch');
    assert.equal(proof.intent.sequence.total, 45);
    if (index >= 24) assert.equal(proof.beforeDigest, proofs[index - 1].afterDigest, 'history digest chain mismatch');
    if (RECOVERY_STATUS[index]) assert.equal(proof.status, RECOVERY_STATUS[index], 'Recovery qualification changed');
    if (proof.composer !== undefined) assert.equal(proof.composer, OLD_COMPOSER);
    assert.equal(JSON.stringify(proof).includes(nextComposer), false, 'Old proof re-attributed to the new package');
    proofs.push(proof);
  }
  assert.equal(proofs[40].intent.sequence.step, 'body-group');
  assert.equal(proofs[40].afterDigest, HISTORY41_CAPTURE_DIGEST);
  return proofs;
}

async function assertInstallRoots(next, read) {
  assert.deepEqual(next.installRoots.map(row => row.consumer).sort(), CONSUMERS);
  for (const row of next.installRoots) {
    assert.equal(typeof row.root, 'string');
    assert.equal(row.root.startsWith('/'), true, 'Unpinned install root');
    const manifest = await read(join(row.root, 'package.json'));
    assert.equal(sha256(manifest), row.manifestHash, 'Install root manifest mismatch');
    const pkg = JSON.parse(manifest);
    const pin = pkg.dependencies?.['zudo-composer'] ?? pkg.devDependencies?.['zudo-composer'];
    assert.equal(pin, `git+https://github.com/Takazudo/zudo-composer.git#${next.composer}`, 'Install root package pin mismatch');
  }
}

export async function assertPackageTransition({ descriptor, repo, read = readFile }) {
  assert.deepEqual(Object.keys(descriptor).sort(), ['freezeManifestPath', 'freezeManifestSha256', 'proofPath']);
  const freezeBytes = await read(descriptor.freezeManifestPath);
  assert.equal(sha256(freezeBytes), descriptor.freezeManifestSha256);
  const frozen = JSON.parse(freezeBytes);
  for (const [path, hash] of Object.entries(frozen)) assert.equal(sha256(await read(path)), hash, `Tampered reference ${path}`);
  const proof = JSON.parse(await read(descriptor.proofPath));
  assert.equal(proof.kind, 'family-package-transition-boundary');
  assert.equal(proof.boundary, PACKAGE_TRANSITION_BOUNDARY);
  const { old, next, preserved } = proof;
  assert.equal(old.composer, OLD_COMPOSER);
  assert.equal(old.lock, OLD_LOCK);
  assert.equal(await lockHashAt(repo, old.source), old.lock, 'Historical lock bytes are not the recorded source lock');
  assert.equal(old.stage, 'notes-v1');
  assert.equal(next.stage, 'notes-v1');
  assert.notEqual(next.composer, old.composer, 'Package mixup');
  assert.match(next.composer, /^[a-f0-9]{40}$/);
  assert.match(next.source, /^[a-f0-9]{40}$/);
  assert.match(old.source, /^[a-f0-9]{40}$/);
  assert.notEqual(next.lock, old.lock, 'Lock mixup');
  assert.equal(sha256(await read(next.lockPath)), next.lock, 'New lock bytes mismatch');
  assert.equal(sha256(await read(next.payloadPath)), next.payloadSha256, 'Payload mismatch');
  assert.equal(old.historyLength, HISTORY41_LENGTH);
  const historyBytes = await read(old.historyPath);
  assert.equal(sha256(historyBytes), old.historySha256);
  assert.equal(old.historySha256, HISTORY41_SHA256);
  const paths = JSON.parse(historyBytes);
  const proofs = await assertHistory41Proofs(paths, { read, nextComposer: next.composer });
  for (const path of paths) assert.equal(typeof frozen[path], 'string', 'Unpinned history proof');
  const captureBytes = await read(old.capturePath);
  assert.equal(sha256(captureBytes), old.captureFileSha256);
  const oldCapture = JSON.parse(captureBytes);
  assert.equal(oldCapture.digest, old.captureDigest);
  assert.equal(old.captureDigest, proofs[40].afterDigest);
  assert.equal(old.capturePath, proofs[40].afterCapture);
  const preservedCapture = JSON.parse(await read(preserved.capturePath));
  assertCapturePreservation(oldCapture, preservedCapture, proof);
  assert.equal(preserved.captureDigest, preservedCapture.digest);
  if (preserved.raw) {
    const raw = await read(preserved.raw.path);
    const info = await stat(preserved.raw.path);
    assert.equal(info.size, preserved.raw.size, 'Raw storage size changed');
    assert.equal(info.mode, preserved.raw.mode, 'Raw storage mode changed');
    assert.equal(sha256(raw), preserved.raw.sha256, 'Raw storage bytes changed');
  }
  await assertInstallRoots(next, read);
  assert.equal(dirname(descriptor.proofPath), dirname(descriptor.freezeManifestPath));
  return proof;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const descriptorPath = process.argv[2];
  assert.equal(process.argv.length, 3, 'Package transition descriptor is the only argument');
  assert.equal(descriptorPath.startsWith('/'), true, 'Unpinned package transition');
  const descriptor = JSON.parse(await readFile(descriptorPath, 'utf8'));
  await assertPackageTransition({ descriptor, repo: repoRoot });
  console.log('PACKAGE_TRANSITION_BOUNDARY41_VERIFIED');
}
