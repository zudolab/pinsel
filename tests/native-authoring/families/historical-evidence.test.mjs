import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { repoRoot } from './config.mjs';
import { assertRecordedOperatorBoundary } from './continuation-source-boundary.mjs';
import { RECOVERY31, validateOperatorRecovery31 } from './operator-recovery31.mjs';
import { RECOVERY33, validateOperatorRecovery33 } from './operator-recovery33.mjs';
import { HISTORY41_CAPTURE_DIGEST, HISTORY41_SHA256, assertHistory41Proofs } from './package-transition-boundary.mjs';

/**
 * Opt-in checks against the authentic historical originals, never synthetic stand-ins. They run only
 * when PINSEL_HISTORICAL_EVIDENCE_ROOT names the original composer-adoption-notes directory (the
 * recorded proofs embed absolute paths under /workspace/composer-adoption-notes, so a copy must sit at
 * that recorded location) and the checkout has full git history. Ordinary CI uses the synthetic tests.
 */
const root = process.env.PINSEL_HISTORICAL_EVIDENCE_ROOT;
const reason = 'PINSEL_HISTORICAL_EVIDENCE_ROOT is not set; historical originals are not available here';
const recordedHead = '46a0e0a6805120d03600b975a2c96b8b8e8d2c4a';

function recoveryEvidence(phase) {
  const dir = join(root ?? '', `results-continuation24-phase${phase}-01/artifacts`);
  return {
    originalBefore: `${dir}/before.json`, originalAfter: `${dir}/after.json`,
    readbackCapture: join(root ?? '', `results-continuation24-phase${phase}-readback-01/capture.json`),
    originalEvents: `${dir}/events.ndjson`, originalBundle: `${dir}/accepted-inputs.json`,
    originalShutdown: `${dir}/server-shutdown.json`, originalTrace: `${dir}/server-ipc-trace.json`,
  };
}

async function recoveryProof(phase, { status, originalFailure, recoveryKind, domain, writePhase }) {
  const evidence = recoveryEvidence(phase);
  const read = path => readFile(path);
  const json = async path => JSON.parse(await read(path));
  const before = await json(evidence.originalBefore);
  const intent = (await json(evidence.originalBundle)).intent;
  const events = (await read(evidence.originalEvents)).toString().trim().split('\n').map(line => JSON.parse(line));
  const record = events.find(event => event.phase === writePhase).input.record;
  const proof = {
    status, originalScenario: 'FAIL', originalProof: 'ABSENT', originalUiResult: 'ABSENT', originalFailure: originalFailure(events),
    recoveryKind, domain, beforeDigest: before.digest, afterDigest: (await json(evidence.readbackCapture)).digest,
    afterCapture: evidence.readbackCapture, intent, result: { record }, evidence,
  };
  const history = Array.from({ length: phase }, () => ({ afterDigest: '0'.repeat(64) }));
  history[phase - 1] = { afterDigest: before.digest };
  return { proof, previous: before, history, loaded: { continuation: { descriptor: intent.familyContinuation } }, read, json };
}

describe.skipIf(!root)(`historical originals (${root ? 'PINSEL_HISTORICAL_EVIDENCE_ROOT set' : reason})`, () => {
  test('the recorded successor source is accepted only at its sealed head', async () => {
    const phase27 = join(root, 'results-continuation24-phase27-01/artifacts');
    const proof = JSON.parse(await readFile(join(phase27, 'proof.json'), 'utf8'));
    const historical = JSON.parse(await readFile(join(root, 'results-continuation24-prepared-b1e-01/provenance.json'), 'utf8'));
    const provenance = JSON.parse(await readFile(join(phase27, 'runtime-provenance.json'), 'utf8'));
    const descriptor = proof.intent.familyOperatorSourceBoundary;
    const recorded = await assertRecordedOperatorBoundary({ descriptor, repo: repoRoot, historical, provenanceSourceHead: provenance.sourceHead });
    assert.equal(recorded.head, recordedHead);
    assert.equal(provenance.sourceHead, recordedHead);
    await assert.rejects(assertRecordedOperatorBoundary({ descriptor, repo: repoRoot, historical, provenanceSourceHead: 'b1eec63bfdb54d545d7f006e63df23fa46541d07' }));
  });

  test('the original index 31 recovery is accepted', async () => {
    const built = await recoveryProof(31, {
      status: RECOVERY31, recoveryKind: 'saved-composition-fill-separate-public-capture', domain: 'compositions', writePhase: 'composition-put-before-dispatch',
      originalFailure: events => events.find(event => event.phase === 'held')?.error,
    });
    await validateOperatorRecovery31(built);
  });

  test('the original index 33 recovery is accepted', async () => {
    const built = await recoveryProof(33, {
      status: RECOVERY33, recoveryKind: 'saved-binding-separate-public-capture', domain: 'mappings', writePhase: 'request-before-dispatch',
      originalFailure: () => 'Original request outcome uncertain; no further writes',
    });
    await validateOperatorRecovery33(built);
  });

  test('the original history41 is accepted under its default historical anchors', async () => {
    const historyPath = join(root, 'results-continuation24-phase40-02/history41.json');
    const bytes = await readFile(historyPath);
    assert.equal((await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'), HISTORY41_SHA256);
    const proofs = await assertHistory41Proofs(JSON.parse(bytes), { nextComposer: 'ab'.repeat(20) });
    assert.equal(proofs[40].afterDigest, HISTORY41_CAPTURE_DIGEST);
  });
});
