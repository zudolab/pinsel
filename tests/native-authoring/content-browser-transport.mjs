import assert from 'node:assert/strict';
export const contentReadOperations = new Set(['initialize', 'read-all', 'list-models', 'get-model', 'get-entry', 'count-entries', 'page-entries', 'scan-entries', 'editorial-read', 'editorial-fields', 'editorial-revisions', 'editorial-revision', 'editorial-compare', 'editorial-publication', 'editorial-operation', 'content-ai-status', 'content-ai-scope', 'content-ai-read', 'content-ai-operation']);
const endpoint = '/__zudo_composer_content_provider';
const authHeaders = ['x-zudo-composer-capability', 'x-zudo-composer-workspace', 'x-zudo-native-client', 'x-zudo-native-epoch'];
export function assertContentRequestOrigin(page, request) {
  const url = new URL(request.url()), origin = new URL(page.url()).origin;
  assert(['http:', 'https:'].includes(url.protocol) && url.origin === origin && url.pathname === endpoint && !url.search && !url.hash && !url.username && !url.password, 'Content request must use the exact same-origin endpoint');
  assert.equal(request.method(), 'POST');
  assert.equal(request.headers().origin, origin, 'Observed Content Origin must match the page');
  return url.href;
}
async function bounded(action, timeout) {
  let timer;
  try { return await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Browser Content response timed out; reconciliation required')), timeout); })]); }
  finally { clearTimeout(timer); }
}
/** Let Chromium send its one original request; never replay a canonical mutation. */
export async function continueContentRequest(page, route, timeout) {
  const request = route.request(), url = assertContentRequestOrigin(page, request);
  return bounded(async () => {
    await route.continue();
    const response = await request.response();
    assert(response && response.request() === request && response.url() === url && !request.redirectedFrom() && !request.redirectedTo(), 'Original Content response missing or redirected');
    assert.equal(await response.finished(), null, 'Browser Content request failed');
    return response;
  }, timeout);
}
/** Supplemental read only; browser supplies Origin/Sec-Fetch, secrets remain in memory. */
export async function readBrowserContent(page, request, timeout) {
  const url = assertContentRequestOrigin(page, request), observed = request.headers();
  const headers = { 'content-type': 'application/json', 'x-zudo-composer-operation': 'read-all' };
  for (const name of authHeaders) { assert(typeof observed[name] === 'string' && observed[name], `Observed ${name} is required`); headers[name] = observed[name]; }
  const result = await page.evaluate(async ({ url, headers, timeout }) => {
    if (new URL(url).origin !== location.origin) throw Error('Content origin changed');
    const response = await fetch(url, { method: 'POST', headers, body: '', credentials: 'same-origin', mode: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(timeout) });
    return { ok: response.ok, body: await response.json() };
  }, { url, headers, timeout });
  assert(result.ok && result.body.ok, 'Public Content read failed'); return result.body.result;
}

/** Safe observability only: never copy headers, field values or query strings. */
export function contentRequestDiagnostic(request) {
  let body; try { body = request.postDataJSON(); } catch {}
  const record = body?.record, entry = body?.entry;
  const ref = typeof entry?.providerId === 'string' && typeof entry?.modelId === 'string' && typeof entry?.recordId === 'string' ? { providerId: entry.providerId, modelId: entry.modelId, recordId: entry.recordId } : null;
  return { operation: request.headers()['x-zudo-composer-operation'] ?? null, method: request.method(), path: new URL(request.url()).pathname,
    ...(ref ? { entry: ref } : {}),
    ...(typeof record?.modelId === 'string' && typeof record?.id === 'string' ? { record: { modelId: record.modelId, recordId: record.id } } : {}) };
}
