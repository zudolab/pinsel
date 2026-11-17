import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export async function runtimeProvenance({ repo, installed, composer, stage, port, intentPath, capturePath, digest }) {
  const directory = dirname(fileURLToPath(import.meta.url));
  const sourceHashes = {};
  for (const name of (await readdir(directory)).sort()) {
    if (name.endsWith('.mjs') && !name.endsWith('.test.mjs')) sourceHashes[name] = sha256(await readFile(join(directory, name)));
  }
  const { stdout: head } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repo });
  const { stdout: status } = await exec('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: repo });
  return {
    schemaVersion: 1, sourceHead: head.trim(), sourceStatus: status.trim(), composer, stage, port,
    node: process.version, packageManager: JSON.parse(await readFile(join(repo, 'package.json'), 'utf8')).packageManager,
    intentSha256: sha256(await readFile(intentPath)), baselineFileSha256: sha256(await readFile(capturePath)),
    baselineDigest: digest, installed, sourceHashes,
    qualification: 'Recorded before server/browser mutation; installed lock/root checks are not a cryptographic source-byte attestation.',
  };
}
