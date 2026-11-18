import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { assertFreePort } from './runtime-preflight.mjs';

export function nativeOwnerOptions(repo, env, port) {
  const cwd = join(repo, 'packages/pinsel-content');
  return { command: process.execPath,
    args: ['--import', 'tsx', 'src/site/start-native.ts', '--port', String(port), '--strict-port'],
    options: { cwd, env: { ...env, TSX_TSCONFIG_PATH: join(cwd, 'tsconfig.scripts.json') },
      stdio: ['ignore', 'pipe', 'pipe'] } };
}

export async function assertLeaseAbsent(hostRoot) {
  try { await lstat(join(hostRoot, '.zudo-authoring.lock')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw Error('Authoring lease remains; preserve it and reconcile ownership. No capture permitted.');
}

// The child is the Node lease owner, not a package-manager launcher. Never kill
// the process group or escalate a timeout to SIGKILL/unlink/retry.
export function ownProcess(child) {
  let logs = '', spawnError, stopping;
  child.stdout?.on('data', bytes => { logs += bytes; });
  child.stderr?.on('data', bytes => { logs += bytes; });
  child.once('error', error => { spawnError = error; });
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  return { child, logs: () => logs,
    stop({ hostRoot, port, timeoutMs = 120000, leaseAbsent = assertLeaseAbsent, portFree = assertFreePort } = {}) {
      stopping ??= (async () => {
        if (!spawnError && child.exitCode === null && child.signalCode === null) {
          assert(Number.isSafeInteger(child.pid) && child.pid > 0, 'Actual owned Node PID required');
          assert(child.kill('SIGTERM'), 'Owned Node stop signal was not delivered');
        }
        let timer;
        const outcome = await Promise.race([closed, new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error('Owned Node shutdown incomplete; no kill, unlink or capture permitted')), timeoutMs);
        })]).finally(() => clearTimeout(timer));
        if (spawnError) throw spawnError;
        assert.equal(outcome.signal, null, 'Owned Node terminated by signal');
        assert.equal(outcome.code, 0, 'Owned Node did not complete graceful shutdown');
        await leaseAbsent(hostRoot);
        await portFree(port);
        return { pid: child.pid, ...outcome, lease: 'absent', port: 'free' };
      })();
      return stopping;
    } };
}

export function launchNativeOwner(repo, env, port) {
  const { command, args, options } = nativeOwnerOptions(repo, env, port);
  return ownProcess(spawn(command, args, options));
}
