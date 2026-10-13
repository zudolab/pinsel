import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const paths = {
  uiPublic: path.join(repoRoot, "packages/pinsel-ui/public"),
  uiArt: path.join(repoRoot, "packages/pinsel-ui/src/art"),
  sitePublic: path.join(repoRoot, "apps/site/public"),
  editorDist: path.join(repoRoot, "apps/editor/dist"),
  workerAssets: path.join(repoRoot, "apps/authoring-worker/dist-assets"),
  approvedManifest: path.join(repoRoot, "tests/fixtures/approved-seed/asset-manifest.json"),
};

/** @param {string} target */
export async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Relative POSIX paths of every file under `root`, sorted.
 * @param {string} root
 */
export async function listFiles(root) {
  /** @type {string[]} */
  const out = [];
  async function walk(/** @type {string} */ dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join("/"));
      else throw new Error(`unsupported entry (not a regular file or directory): ${full}`);
    }
  }
  await walk(root);
  return out.sort();
}

/** @param {string} file */
export async function sha256File(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

/**
 * Copies every file of `from` into `to`. With `overwrite: false`, a file that
 * already exists in `to` is an error instead of being replaced.
 * @param {string} from
 * @param {string} to
 * @param {{ overwrite: boolean }} options
 * @returns {Promise<string[]>} the copied relative paths
 */
export async function copyTree(from, to, { overwrite }) {
  const files = await listFiles(from);
  for (const rel of files) {
    const dest = path.join(to, rel);
    if (!overwrite && (await exists(dest))) {
      throw new Error(`refusing to overwrite ${path.relative(repoRoot, dest)} (copied from ${path.relative(repoRoot, from)})`);
    }
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(path.join(from, rel), dest);
  }
  return files;
}
