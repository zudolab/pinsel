// The editor has one page. Structural authoring surfaces (schema, models,
// templates, mapping, sitemap, asset upload) do not exist here; any other path
// or hash route under /editor/ shows 利用できません instead of mounting. The
// Worker refuses the same surfaces at its own routes.

const EDITOR_PATHS = new Set(["/editor/", "/editor/index.html"]);

const STRUCTURAL = /(^|\/)(composer|mapping|sitemapper|sitemap|schema|models?|templates?|assets|upload)(\/|$)/i;

export function isForbiddenLocation(location: { pathname: string; hash: string }): boolean {
  if (!EDITOR_PATHS.has(location.pathname)) return true;
  const hash = location.hash.replace(/^#!?/, "");
  return hash !== "" && STRUCTURAL.test(hash.startsWith("/") ? hash : `/${hash}`);
}
