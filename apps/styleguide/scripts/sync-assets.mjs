// Mirrors packages/pinsel-ui/public/ into apps/styleguide/public/ (gitignored) so
// story previews resolve /assets/fonts and /assets/*.jpg like the public site does.
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(app, "../../packages/pinsel-ui/public");
const target = path.join(app, "public");

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
console.log(`sync-assets mirrored ${path.relative(process.cwd(), source) || source} to ${path.relative(process.cwd(), target) || target}`);
