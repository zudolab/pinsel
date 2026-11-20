import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseRuntimeArgs, repoRoot } from './config.mjs';
const args = ['--composer', 'a'.repeat(40), '--stage', 'known-stage', '--intent', 'intent.json', '--artifacts', 'proof', '--port', '4198'];
test('runtime inputs are explicit and paths follow caller/checkout, never a cloud workspace', () => {
  const value = parseRuntimeArgs(args, '/tmp/family-test');
  assert.equal(value.intentPath, '/tmp/family-test/intent.json');
  assert.equal(value.artifacts, '/tmp/family-test/proof');
  assert.equal(value.base, 'http://127.0.0.1:4198');
});
test('missing pins/stage, duplicate flags, remote URLs and native output destinations refuse', () => {
  assert.throws(() => parseRuntimeArgs(args.slice(2)));
  assert.throws(() => parseRuntimeArgs([...args, '--stage', 'another']));
  for (const [flag, bad] of [['--composer', 'main'], ['--stage', '../owner'], ['--port', 'https://example.com']]) {
    const changed = [...args]; changed[changed.indexOf(flag) + 1] = bad;
    assert.throws(() => parseRuntimeArgs(changed));
  }
  const changed = [...args]; changed[changed.indexOf('--artifacts') + 1] = `${repoRoot}/packages/pinsel-content/.native-authoring-known-stage`;
  assert.throws(() => parseRuntimeArgs(changed));
});
import { mkdtemp, symlink, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertArtifactLocation } from './config.mjs';
test('symlink artifact parent cannot redirect output into native paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'family-path-proof-'));
  const link = join(directory, 'content');
  try {
    await symlink(join(repoRoot, 'packages/pinsel-content'), link, 'dir');
    await assert.rejects(assertArtifactLocation(join(link, '.native-authoring-test-output')));
    await assert.doesNotReject(assertArtifactLocation(join(directory, 'ordinary-artifacts')));
  } finally {
    await unlink(link);
    await rmdir(directory);
  }
});
