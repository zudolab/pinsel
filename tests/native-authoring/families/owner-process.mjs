import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertFreePort } from './runtime-preflight.mjs';

export function nativeOwnerOptions(repo, env, port, nonce = randomUUID()) {
  const cwd = join(repo, 'packages/pinsel-content');
  return { command: process.execPath,
    args: ['--import', 'tsx', 'src/site/start-native.ts', '--port', String(port), '--strict-port'],
    options: { cwd, env: { ...env, PINSEL_NATIVE_OWNER_IPC_NONCE: nonce, TSX_TSCONFIG_PATH: join(cwd, 'tsconfig.scripts.json') },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'] } };
}

export async function assertLeaseAbsent(hostRoot) {
  try { await lstat(join(hostRoot, '.zudo-authoring.lock')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw Error('Authoring lease remains; preserve it and reconcile ownership. No capture permitted.');
}

export async function assertOwnedLease(hostRoot, child) {
  assert.equal(child.exitCode, null, 'Owner already exited');
  assert.equal(child.signalCode, null, 'Owner terminated');
  const path = join(hostRoot, '.zudo-authoring.lock');
  const metadata = await lstat(path);
  assert(metadata.isFile() && !metadata.isSymbolicLink(), 'Expected regular owned lease');
  const lease = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(lease.pid, child.pid, 'Ready endpoint lacks exact Node lease ownership');
  assert.equal(lease.owner, 'dev-server');
}

// Only the inherited channel controls shutdown. Signals are never a fallback.
export function ownProcess(child, identity) {
  let logs = '', failure, stopping, ready = false, acknowledged = false, sent = false;
  const trace = [];
  const fail = error => { failure ??= error; };
  child.stdout?.on('data', bytes => { logs += bytes; });
  child.stderr?.on('data', bytes => { logs += bytes; });
  child.once('error', fail);
  child.on('message', message => {
    trace.push({ event: 'message', at: new Date().toISOString(), message });
    if (!message || Object.keys(message).sort().join(',') !== 'hostRoot,nonce,pid,port,protocol,type' || Object.entries(identity).some(([key, value]) => message[key] !== value) || message.pid !== child.pid) { fail(Error('Mismatched native owner acknowledgement')); return; }
    if (message.type === 'ready' && !ready && !sent) ready = true;
    else if (message.type === 'closed' && sent && ready && !acknowledged) acknowledged = true;
    else fail(Error('Unexpected native owner acknowledgement'));
  });
  child.on('disconnect', () => { if (!acknowledged) fail(Error('Native owner channel lost before closed acknowledgement')); });
  let outcome;
  const closed = new Promise(resolve => child.once('close', (code, signal) => {
    outcome = { code, signal };trace.push({ event: 'close', ...outcome });resolve(outcome);
  }));
  return { child, logs: () => logs, trace: () => trace,
    async waitReady(timeoutMs = 180000) { const until = Date.now() + timeoutMs; while (!ready) { if (failure) throw failure; assert(!outcome, 'Owner exited before ready'); assert(Date.now() < until, 'Owner ready timeout'); await new Promise(resolve => setTimeout(resolve, 25)); } this.assertReady(); },
    assertReady() { if (failure) throw failure; assert(ready && !outcome && child.exitCode === null && child.signalCode === null, 'Native owner ready acknowledgement missing'); },
    stop({ hostRoot, port, timeoutMs = 120000, leaseAbsent = assertLeaseAbsent, portFree = assertFreePort } = {}) {
      stopping ??= (async () => {
        if (failure) throw failure;
        assert(ready && !outcome && child.connected, 'Cannot stop without live qualified ready acknowledgement');
        assert(Number.isSafeInteger(child.pid) && child.pid > 0);
        sent = true;
        const message = { ...identity, pid: child.pid, type: 'stop' };
        trace.push({ event: 'stop', at: new Date().toISOString(), message });
        let timer;
        const work = (async () => {
          await new Promise((resolve, reject) => child.send(message, error => error ? reject(error) : resolve()));
          const result = await closed;
          if (failure) throw failure;
          assert(acknowledged, 'Native owner closed acknowledgement missing');
          assert.equal(result.signal, null, 'Owned Node terminated by signal');
          assert.equal(result.code, 0, 'Owned Node did not complete graceful shutdown');
          await leaseAbsent(hostRoot);await portFree(port);
          return { pid: child.pid, ...result, lease: 'absent', port: 'free', protocol: identity.protocol, trace };
        })();
        return await Promise.race([work, new Promise((_, reject) => {
          timer = setTimeout(() => { fail(Error('Owned Node shutdown incomplete; no kill, unlink or capture permitted')); reject(failure); }, timeoutMs);
        })]).finally(() => clearTimeout(timer));
      })();
      return stopping;
    } };
}

export function launchNativeOwner(repo, env, port) {
  const nonce = randomUUID();
  const { command, args, options } = nativeOwnerOptions(repo, env, port, nonce);
  const identity = { protocol: 'pinsel-native-owner-v1', nonce, port, hostRoot: options.cwd };
  return ownProcess(spawn(command, args, options), identity);
}
