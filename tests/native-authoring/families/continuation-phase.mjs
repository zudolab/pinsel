import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { inputHash } from './expected-hashes.mjs';
import { assertContinuationAuthority, assertContinuationShutdown, assertWholeContinuationDelta } from './continuation-core.mjs';
import { assertSuccessorProvenance } from './source-successor-history.mjs';
import { auditBoundaryContinuation } from './boundary23-continuation.mjs';
import { nextFamilyIntent, continuationIntentPlain } from './sequence-core.mjs';
import { RECOVERY26, validateOperatorRecovery26 } from './operator-recovery26.mjs';
import { RECOVERY31, validateOperatorRecovery31 } from './operator-recovery31.mjs';
import { RECOVERY33, validateOperatorRecovery33 } from './operator-recovery33.mjs';
import { assertRecordedOperatorBoundary } from './continuation-source-boundary.mjs';
import { repoRoot } from './config.mjs';

async function absent(path, read) {
  try { await read(path); } catch (error) { assert.equal(error.code, 'ENOENT'); return; }
  assert.fail('Shutdown error artifact present: ' + path);
}

export async function assertIndex26PhaseGuards({ proof, before, after, bundle, bundlePath, provenance, loaded, read, json, dir, historyPaths, index }) {
  const recordedBoundary = proof.intent.familyOperatorSourceBoundary ?? null;
  let installation = loaded.installation;
  let sourceHead = installation.source.head;
  if (recordedBoundary) {
    const recorded = await assertRecordedOperatorBoundary({ descriptor: recordedBoundary, repo: repoRoot, historical: installation, provenanceSourceHead: provenance.sourceHead });
    sourceHead = recorded.head;
    installation = { ...installation, source: recorded };
  } else if (loaded.sourceBoundary) assert.equal(loaded.sourceBoundary.oldSource, sourceHead);
  assert.equal(provenance.sourceHead, sourceHead, 'Provenance source head is not the accepted phase source');
  assert.equal(bundle.authority.sourceHead, sourceHead);
  if (!recordedBoundary) assert.equal(sourceHead, loaded.installation.source.head);
  assertContinuationAuthority(bundle, { composer: loaded.installation.composer, stage: loaded.installation.stage, sourceHead });
  assert.equal((await json(join(dir, 'accepted-input-sha256.json'))).sha256, inputHash(await read(bundlePath)));
  for (const [path, hash] of Object.entries(bundle.hashes)) assert.equal(inputHash(await read(path)), hash);
  assertSuccessorProvenance(provenance, bundle, before, installation);
  const ref = proof.intent.familyBoundaryHistory;
  assert.equal(inputHash(await read(ref.path)), ref.sha256);
  assert.deepEqual(await json(ref.path), historyPaths.slice(0, index));
  const domain = proof.intent.kind === 'attachment' ? 'workspace' : proof.intent.domain;
  assertWholeContinuationDelta(before, after, domain);
  const priorEvidence = proof.status === RECOVERY26 || proof.status === RECOVERY31 || proof.status === RECOVERY33;
  const shutdown = await json(priorEvidence ? proof.evidence.originalShutdown : join(dir, 'server-shutdown.json'));
  const trace = await json(priorEvidence ? proof.evidence.originalTrace : join(dir, 'server-ipc-trace.json'));
  assertContinuationShutdown(shutdown, trace, { hostRoot: '/workspace/pinsel-baseline-publication/packages/pinsel-content', port: 4208 });
  assert.equal(provenance.port, 4208);
  await read(join(dir, 'server.log'));
  await absent(join(dir, 'server-shutdown-errors.json'), read);
}

/** Normal-path evidence checks, then the index-26 or index-31 recovery predicate when that status is present. */
export async function validateContinuationPhaseEvidence({ index, proof, proofPath, previous, loaded, read, json, historyPaths, historyPrefix, phaseOptions }) {
  const recovery26 = proof.status === RECOVERY26;
  const recovery31 = proof.status === RECOVERY31;
  const recovery33 = proof.status === RECOVERY33;
  const recovery = recovery26 || recovery31 || recovery33;
  if (recovery26) assert.equal(index, 26, 'Operator recovery belongs only at index 26');
  else if (recovery31) assert.equal(index, 31, 'Composition fill recovery belongs only at index 31');
  else if (recovery33) assert.equal(index, 33, 'TOC binding recovery belongs only at index 33');
  else { assert.notEqual(proof.status, RECOVERY26); assert.notEqual(proof.status, RECOVERY31); assert.notEqual(proof.status, RECOVERY33); }
  const dir = recovery ? dirname(proof.evidence.originalBundle) : dirname(proofPath);
  if (!recovery) assert.equal(proof.afterCapture, join(dir, 'after.json'));
  const before = await json(recovery ? proof.evidence.originalBefore : join(dir, 'before.json'));
  const after = await json(proof.afterCapture);
  if (recovery) assert.deepEqual(after, await json(join(dir, 'after.json')));
  const bundlePath = recovery ? proof.evidence.originalBundle : join(dir, 'accepted-inputs.json');
  const bundle = await json(bundlePath);
  const provenance = await json(join(dir, 'runtime-provenance.json'));
  assert.deepEqual(before, previous);
  assert.deepEqual(bundle.snapshot, before);
  assert.deepEqual(bundle.intent, proof.intent);
  await assertIndex26PhaseGuards({ proof, before, after, bundle, bundlePath, provenance, loaded, read, json, dir, historyPaths, index });
  assert.deepEqual(continuationIntentPlain(proof.intent), nextFamilyIntent({ ...phaseOptions, snapshot: before, history: historyPrefix, capturePath: continuationIntentPlain(proof.intent).capturePath }));
  if (recovery26) await validateOperatorRecovery26({ proof, previous, history: historyPrefix, loaded, read, json });
  else if (recovery31) await validateOperatorRecovery31({ proof, previous, history: historyPrefix, loaded, read, json });
  else if (recovery33) await validateOperatorRecovery33({ proof, previous, history: historyPrefix, loaded, read, json });
  else auditBoundaryContinuation({ before, after, proof, events: (await read(join(dir, 'events.ndjson'))).toString().trim().split('\n').map(line => JSON.parse(line)) });
  return after;
}
