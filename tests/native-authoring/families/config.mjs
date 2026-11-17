import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { dirname, basename, resolve, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export function parseRuntimeArgs(argv, cwd = process.cwd()) {
  const allowed = new Set(['--composer', '--stage', '--intent', '--artifacts', '--port']);
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    assert(allowed.has(flag) && !Object.hasOwn(flags, flag), `Unknown or duplicate option: ${flag}`);
    assert(value && !value.startsWith('--'), `Missing value: ${flag}`);
    flags[flag] = value;
  }
  for (const flag of allowed) assert(flags[flag], `Required option: ${flag}`);
  assert(/^[a-f0-9]{40}$/.test(flags['--composer']), 'An explicit immutable Composer SHA is required');
  assert(/^[a-z][a-z0-9-]{0,63}$/.test(flags['--stage']), 'Explicit named existing stage required');
  assert(/^\d+$/.test(flags['--port']), 'Port must be an integer');
  const port = Number(flags['--port']);
  assert(port > 1023 && port <= 65535);
  const intentPath = resolve(cwd, flags['--intent']), artifacts = resolve(cwd, flags['--artifacts']);
  const fromRepo = relative(repoRoot, artifacts);
  assert(!(!isAbsolute(fromRepo) && !fromRepo.startsWith('..') && fromRepo.startsWith('packages/pinsel-content/.native')), 'Artifacts cannot overwrite a native stage or build');
  return { composer: flags['--composer'], stage: flags['--stage'], intentPath, artifacts, port, base: `http://127.0.0.1:${port}` };
}

export async function assertArtifactLocation(artifacts) {
  const target = resolve(await realpath(dirname(artifacts)), basename(artifacts));
  const root = await realpath(repoRoot);
  const fromRepo = relative(root, target);
  assert(!(!isAbsolute(fromRepo) && !fromRepo.startsWith('..') && fromRepo.startsWith('packages/pinsel-content/.native')), 'Artifact parent resolves inside a native stage or build');
}
