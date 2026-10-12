// Fails when any package.json script or GitHub workflow could deploy or promote
// a Worker. Only `wrangler deploy --dry-run` is allowed.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { exists, repoRoot } from "./assets/lib.mjs";

const FORBIDDEN = [
  { pattern: /\bwrangler(?:@\S+)?\s+publish\b/, reason: "wrangler publish" },
  { pattern: /\bwrangler(?:@\S+)?\s+versions\s+deploy\b/, reason: "wrangler versions deploy" },
  { pattern: /\bwrangler(?:@\S+)?\s+(?:pages\s+)?deploy\b(?![^\n]*--dry-run)/, reason: "wrangler deploy without --dry-run" },
];

/**
 * Splits a shell-ish command into the segments that run independently.
 * @param {string} command
 */
function segments(command) {
  return command.split(/&&|\|\||[;|\n]/).map((segment) => segment.trim()).filter(Boolean);
}

/**
 * @param {string} command
 * @returns {string[]} reasons the command is forbidden
 */
export function findDeployCommands(command) {
  const reasons = [];
  for (const segment of segments(command)) {
    for (const { pattern, reason } of FORBIDDEN) if (pattern.test(segment)) reasons.push(`${reason}: ${segment}`);
  }
  return reasons;
}

async function packageJsonFiles() {
  const files = [path.join(repoRoot, "package.json")];
  for (const group of ["apps", "packages"]) {
    const dir = path.join(repoRoot, group);
    if (!(await exists(dir))) continue;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name, "package.json");
      if (entry.isDirectory() && (await exists(file))) files.push(file);
    }
  }
  return files;
}

async function workflowFiles() {
  const dir = path.join(repoRoot, ".github/workflows");
  if (!(await exists(dir))) return [];
  return (await readdir(dir)).filter((name) => /\.ya?ml$/.test(name)).map((name) => path.join(dir, name));
}

export async function scan() {
  const findings = [];
  for (const file of await packageJsonFiles()) {
    const { scripts = {} } = JSON.parse(await readFile(file, "utf8"));
    for (const [name, command] of Object.entries(scripts)) {
      for (const reason of findDeployCommands(String(command))) findings.push(`${path.relative(repoRoot, file)} scripts.${name}: ${reason}`);
    }
  }
  for (const file of await workflowFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      for (const reason of findDeployCommands(line)) findings.push(`${path.relative(repoRoot, file)}:${index + 1}: ${reason}`);
    });
  }
  return findings;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const findings = await scan();
  if (findings.length > 0) {
    for (const finding of findings) console.error(`no-deploy:check FAIL ${finding}`);
    process.exit(1);
  }
  console.log("no-deploy:check ok (no deploy, promote or publish commands)");
}
