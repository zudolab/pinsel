// Optional inherited parent channel only; no HTTP endpoint or private Composer API.
export const OWNER_PROTOCOL = 'pinsel-native-owner-v1';
export function installNativeOwnerIpc({ server, nonce, port, hostRoot, proc = process }) {
  if (!/^[a-f0-9-]{36}$/.test(nonce ?? '') || typeof proc.send !== 'function') {
    throw Error('Native owner IPC requires an explicit nonce and inherited connected channel');
  }
  const identity = { protocol: OWNER_PROTOCOL, nonce, pid: proc.pid, port, hostRoot };
  let closing, stopped = false, failed = false;
  const send = message => new Promise((resolve, reject) => {
    if (!proc.connected) { reject(Error('Native owner IPC disconnected')); return; }
    proc.send({ ...identity, ...message }, error => error ? reject(error) : resolve());
  });
  function close() {
    closing ??= (async () => {
      const keepAlive = setInterval(() => {}, 1000);
      try { await server.close(); } finally { clearInterval(keepAlive); }
    })();
    return closing;
  }
  async function finish(error) {
    if (error) { failed = true; proc.stderr.write(`${error.stack ?? error}\n`); }
    if (stopped) return;
    stopped = true;
    try {
      await close();
      if (failed) throw Error('Native owner IPC protocol failed');
      await send({ type: 'closed' }); // Completion is delivered before exit0.
      if (failed) throw Error('Native owner IPC failed during acknowledgement');
      proc.exit(0);
    } catch (cause) {
      proc.stderr.write(`${cause.stack ?? cause}\n`);
      try { await send({ type: 'failed', message: String(cause.message ?? cause) }); } catch {}
      proc.exit(1);
    }
  }
  proc.on('message', message => {
    const valid = message && Object.keys(message).sort().join(',') === 'hostRoot,nonce,pid,port,protocol,type' &&
      message.type === 'stop' && Object.entries(identity).every(([key, value]) => message[key] === value);
    if (!valid) {
      const shape = message && typeof message === 'object' ? `type=${JSON.stringify(String(message.type))} keys=${Object.keys(message).sort().join(',')}` : `value of type ${typeof message}`;
      proc.stderr.write(`Warning: malformed native owner IPC message (${shape}); shutting down the authoring server.\n`);
    }
    void finish(valid ? undefined : Error('Unexpected native owner IPC request'));
  });
  proc.on('disconnect', () => { void finish(Error('Native owner IPC channel lost')); });
  return { close, ready: () => send({ type: 'ready' }).catch(error => finish(error)) };
}
