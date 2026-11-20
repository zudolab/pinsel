/**
 * Synthetic git repositories for proof-validator tests. Nothing here is historical evidence:
 * every commit is created on the fly in a temporary directory, so the tests need neither the
 * old VM's /workspace tree nor a full (non-shallow) clone of this repository.
 */
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const isolated = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };

export function syntheticGit(dir) {
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Synthetic Fixture', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env: isolated }).toString().trim();
  return {
    git,
    init: () => git('init', '-q', '-b', 'synthetic-main'),
    /** Writes files (string content or { content, mode }) on top of `from` and returns the new commit. */
    async commit(files, { from = null, message = 'synthetic' } = {}) {
      if (from) git('checkout', '-q', '--detach', from);
      for (const [path, value] of Object.entries(files)) {
        const target = join(dir, path);
        await mkdir(dirname(target), { recursive: true });
        const { content, mode } = typeof value === 'string' ? { content: value, mode: 0o644 } : value;
        if (content !== undefined) await writeFile(target, content);
        await chmod(target, mode ?? 0o644);
      }
      git('add', '-A');
      git('commit', '-q', '--allow-empty', '-m', message);
      return git('rev-parse', 'HEAD');
    },
    checkout: head => git('checkout', '-q', '--detach', head),
  };
}
