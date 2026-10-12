// Mirrors packages/pinsel-ui/public/ into apps/site/public/ (gitignored) for ZFB's publicDir.
import { rm } from "node:fs/promises";
import path from "node:path";
import { copyTree, paths, repoRoot } from "./lib.mjs";

await rm(paths.sitePublic, { recursive: true, force: true });
const files = await copyTree(paths.uiPublic, paths.sitePublic, { overwrite: false });
console.log(`assets:sync copied ${files.length} files to ${path.relative(repoRoot, paths.sitePublic)}`);
