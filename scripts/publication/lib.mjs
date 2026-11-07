// Shared helpers for the public-output CI check.
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export async function git(...args) {
  const { stdout } = await promisify(execFile)("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

/** @param {string} flag */
export function argument(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
