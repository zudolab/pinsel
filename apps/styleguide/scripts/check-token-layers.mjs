// Asserts that built CSS keeps every Pinsel token custom property in the
// approved cascade: the plain `:root` token files must land in a `tokens`
// layer (`tokens` on the site, `pinsel.tokens` in the styleguide preview), no
// token may be declared unlayered (unlayered CSS beats every layer, so the
// `responsive` overrides would never apply), and the Pinsel layers must keep
// the order `tokens, reset, layout, components, responsive`.
// Usage: node apps/styleguide/scripts/check-token-layers.mjs [css-file-or-dir ...]
// With no arguments it checks apps/styleguide/dist/_zudo-sg/preview.css and every CSS file under apps/site/dist.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const tokenFiles = ["packages/pinsel-ui/styles/tokens.css", "packages/pinsel-ui/styles/colors.css"];
const defaultTargets = ["apps/styleguide/dist/_zudo-sg/preview.css", "apps/site/dist"];
const layerOrder = ["tokens", "reset", "layout", "components", "responsive"];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Walks blocks and statements, reporting each custom-property declaration with its effective layer name ("" when unlayered) and every layer name in first-declaration order.
function scan(css) {
  const declarations = [];
  const layers = [];
  const declareLayer = (name) => {
    if (!layers.includes(name)) layers.push(name);
  };
  const stack = [];
  const currentLayer = () => stack.filter((frame) => frame.layer !== undefined).map((frame) => frame.layer).filter(Boolean).join(".");
  const layered = () => stack.some((frame) => frame.layer !== undefined);
  const qualify = (name) => [currentLayer(), name].filter(Boolean).join(".");
  const declareQualified = (name) => {
    const parts = qualify(name).split(".");
    parts.forEach((_, index) => declareLayer(parts.slice(0, index + 1).join(".")));
  };
  const statement = (text) => {
    const trimmed = text.trim();
    const layerStatement = /^@layer\s+([^{]+)$/i.exec(trimmed);
    if (layerStatement) {
      for (const name of layerStatement[1].split(",").map((n) => n.trim()).filter(Boolean)) declareQualified(name);
      return;
    }
    const declaration = /^(--[\w-]+)\s*:/.exec(trimmed);
    if (declaration) declarations.push({ name: declaration[1], layer: layered() ? currentLayer() : null });
  };
  let buffer = "";
  let quote = "";
  let parens = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      buffer += c;
      if (c === "\\") buffer += css[++i] ?? "";
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(") parens++;
    else if (c === ")") parens--;
    else if (parens === 0 && c === "{") {
      const prelude = buffer.trim();
      buffer = "";
      const block = /^@layer\b\s*(.*)$/i.exec(prelude);
      if (block) {
        const name = block[1].trim();
        if (name) declareQualified(name);
        stack.push({ layer: name });
      } else stack.push({});
      continue;
    } else if (parens === 0 && c === ";") {
      statement(buffer);
      buffer = "";
      continue;
    } else if (parens === 0 && c === "}") {
      statement(buffer);
      buffer = "";
      stack.pop();
      continue;
    }
    buffer += c;
  }
  return { declarations, layers };
}

async function cssFiles(target) {
  const info = await stat(target).catch(() => null);
  if (!info) throw new Error(`${path.relative(root, target)} does not exist; build it first`);
  if (info.isFile()) return [target];
  const found = [];
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) found.push(...(await cssFiles(full)));
    else if (entry.name.endsWith(".css")) found.push(full);
  }
  return found.sort();
}

function checkFile(css, tokens) {
  const problems = [];
  const { declarations, layers } = scan(stripComments(css));
  const relevant = declarations.filter((d) => tokens.has(d.name));
  if (relevant.length === 0) return { problems, relevant: false };
  for (const d of relevant) {
    if (d.layer === null) problems.push(`${d.name} is declared outside any @layer`);
  }
  const tokenLayers = new Set(relevant.map((d) => d.layer).filter((layer) => layer === "tokens" || layer?.endsWith(".tokens")));
  if (tokenLayers.size !== 1) problems.push(`expected the tokens in exactly one tokens layer, found ${tokenLayers.size ? [...tokenLayers].join(", ") : "none"}`);
  const prefix = [...tokenLayers][0]?.slice(0, -"tokens".length) ?? "";
  for (const name of tokens) {
    if (!relevant.some((d) => d.name === name && d.layer === `${prefix}tokens`)) problems.push(`${name} has no declaration in @layer ${prefix}tokens`);
  }
  const positions = layerOrder.map((name) => layers.indexOf(`${prefix}${name}`));
  if (positions.some((p) => p < 0) || positions.some((p, i) => i > 0 && p < positions[i - 1])) {
    problems.push(`layer order is ${layers.filter((l) => layerOrder.some((n) => l === `${prefix}${n}`)).join(", ") || "missing"}; expected ${layerOrder.map((n) => `${prefix}${n}`).join(", ")}`);
  }
  return { problems, relevant: true };
}

const tokens = new Set();
for (const file of tokenFiles) {
  for (const { name } of scan(stripComments(await readFile(path.join(root, file), "utf8"))).declarations) tokens.add(name);
}
if (tokens.size === 0) throw new Error("no token custom properties found in the pinsel-ui token files");

const targets = process.argv.length > 2 ? process.argv.slice(2).map((t) => path.resolve(t)) : defaultTargets.map((t) => path.join(root, t));
let failed = false;
for (const target of targets) {
  const label = path.relative(root, target) || target;
  let files;
  try {
    files = await cssFiles(target);
  } catch (error) {
    console.error(`check-token-layers: ${error.message}`);
    failed = true;
    continue;
  }
  let checked = 0;
  let targetFailed = false;
  for (const file of files) {
    const { problems, relevant } = checkFile(await readFile(file, "utf8"), tokens);
    if (!relevant) continue;
    checked++;
    for (const problem of problems) console.error(`check-token-layers: ${path.relative(root, file)}: ${problem}`);
    if (problems.length) targetFailed = true;
  }
  if (checked === 0) {
    console.error(`check-token-layers: ${label} contains no CSS declaring the Pinsel tokens`);
    targetFailed = true;
  }
  if (targetFailed) failed = true;
  else console.log(`check-token-layers: ${label}: ${checked} file(s), ${tokens.size} tokens layered`);
}
process.exit(failed ? 1 : 0);
