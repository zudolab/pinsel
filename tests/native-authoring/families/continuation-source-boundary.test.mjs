import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { repoRoot } from './config.mjs';
import { assertOperatorChangePaths, assertRecordedOperatorBoundary } from './continuation-source-boundary.mjs';

const phase27 = '/workspace/composer-adoption-notes/results-continuation24-phase27-01/artifacts/proof.json';
const historicalPath = '/workspace/composer-adoption-notes/results-continuation24-prepared-b1e-01/provenance.json';
const recordedHead = '46a0e0a6805120d03600b975a2c96b8b8e8d2c4a';

test('operator change paths stay inside docs and native authoring', () => {
  assert.doesNotThrow(() => assertOperatorChangePaths([{ path: 'docs/handoff/2026-11-18.md' }, { path: 'tests/native-authoring/families/sequence.mjs' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'package.json' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'apps/site/src/page.mjs' }]));
  assert.throws(() => assertOperatorChangePaths([{ path: 'tests/native-authoring/families/vitest.config.ts' }]));
});

test('a recorded successor source is accepted only at its sealed head', async () => {
  const proof = JSON.parse(await readFile(phase27, 'utf8'));
  const historical = JSON.parse(await readFile(historicalPath, 'utf8'));
  const provenance = JSON.parse(await readFile('/workspace/composer-adoption-notes/results-continuation24-phase27-01/artifacts/runtime-provenance.json', 'utf8'));
  const descriptor = proof.intent.familyOperatorSourceBoundary;
  const recorded = await assertRecordedOperatorBoundary({ descriptor, repo: repoRoot, historical, provenanceSourceHead: provenance.sourceHead });
  assert.equal(recorded.head, recordedHead);
  assert.equal(provenance.sourceHead, recordedHead);
  await assert.rejects(assertRecordedOperatorBoundary({ descriptor, repo: repoRoot, historical, provenanceSourceHead: 'b1eec63bfdb54d545d7f006e63df23fa46541d07' }));
  await assert.rejects(assertRecordedOperatorBoundary({ descriptor, repo: repoRoot, historical, provenanceSourceHead: '33e0b4a10bb9cbb9dac158243bf21278fb0b79a2' }));
  const dir = await mkdtemp(join(tmpdir(), 'recorded-boundary-'));
  const tampered = structuredClone(JSON.parse(await readFile(descriptor.proofPath, 'utf8')));
  tampered.changes[0].path = 'package.json';
  const proofPath = join(dir, 'proof.json');
  const freezePath = join(dir, 'freeze.json');
  await writeFile(proofPath, JSON.stringify(tampered));
  const freeze = { [proofPath]: createHash('sha256').update(await readFile(proofPath)).digest('hex') };
  await writeFile(freezePath, JSON.stringify(freeze));
  const bad = { proofPath, freezeManifestPath: freezePath, freezeManifestSha256: createHash('sha256').update(await readFile(freezePath)).digest('hex') };
  await assert.rejects(assertRecordedOperatorBoundary({ descriptor: bad, repo: repoRoot, historical, provenanceSourceHead: recordedHead }));
});
