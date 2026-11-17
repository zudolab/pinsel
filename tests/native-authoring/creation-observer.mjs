import { continueContentRequest, contentReadOperations } from './content-browser-transport.mjs';
import assert from 'node:assert/strict';
import { assertNewRecord } from './routes-proof.mjs';
const endpoint = '**/__zudo_composer_content_provider';
/** Admit one actual UI create; retain a refusing interceptor on every uncertain outcome. */
export async function observeContentCreation(page, { before, modelId, persist, action, dispatchTimeoutMs = 180000, requestTimeoutMs = 180000 }) {
  let admitted = false, stopped = false, unexpected = false, completed = false, timer, settle;
  const outcome = new Promise(resolve => { settle = resolve; });
  const active = new Set();
  const handle = async route => {
    const request = route.request(), operation = request.headers()['x-zudo-composer-operation'];
    if (contentReadOperations.has(operation)) { await route.continue(); return; }
    if (stopped || admitted || operation !== 'put-entry') {
      unexpected = true;
      try { await persist({ phase: 'create-unexpected-write', operation, admitted, stopped }); }
      finally { await route.abort(); }
      if (!admitted) { stopped = true; clearTimeout(timer); settle({ error: Error('Unexpected Content mutation refused before creation') }); }
      return;
    }
    admitted = true; clearTimeout(timer);
    let ref;
    try {
      const input = request.postDataJSON(); ref = assertNewRecord(before, modelId, input.record);
      await persist({ phase: 'create-request', ref, input });
      if (unexpected || stopped) throw Error('Creation interrupted before dispatch');
      const response = await continueContentRequest(page, route, requestTimeoutMs);
      const body = await response.json();
      await persist({ phase: 'create-response', ref, status: response.status(), body });
      assert(response.status() === 200 && body?.ok === true, 'Creation was not acknowledged successfully');
      if (unexpected || stopped) throw Error('Unexpected mutation refused; retain creation evidence for reconciliation');
      settle({ ref, status: response.status(), body });
    } catch (error) {
      stopped = true;
      try { await persist({ phase: 'create-uncertain', ...(ref ? { ref } : {}), admitted, error: String(error) }); }
      catch (journalError) { error = new AggregateError([error, journalError], 'Creation outcome/journal need reconciliation'); }
      await route.abort().catch(() => {}); settle({ error });
    }
  };
  const handler = route => {
    const pending = handle(route); active.add(pending);
    pending.finally(() => active.delete(pending)).catch(() => {});
    return pending;
  };
  await page.route(endpoint, handler);
  try {
    timer = setTimeout(() => {
      if (admitted) return;
      stopped = true;
      void persist({ phase: 'create-dispatch-timeout', admitted: false }).then(
        () => settle({ error: Error('Creation dispatch timed out; late mutations remain blocked') }),
        error => settle({ error }),
      );
    }, dispatchTimeoutMs);
    // Action can reject after its request was admitted. Do not abandon that request.
    let actionError;
    try { await action(); } catch (error) { actionError = error; if (!admitted) { stopped = true; clearTimeout(timer); await persist({ phase: 'create-action-failed', admitted: false, error: String(error) }); settle({ error }); } }
    const result = await outcome;
    await Promise.allSettled([...active]);
    if (result.error) throw result.error;
    if (actionError || unexpected || stopped) {
      await persist({ phase: 'create-held', ref: result.ref, error: String(actionError ?? 'Unexpected or stopped creation') });
      throw actionError ?? Error('Creation needs reconciliation after a refused extra mutation');
    }
    completed = true; return result.ref;
  } finally {
    clearTimeout(timer);
    // Never unroute a timed-out/uncertain create and thereby allow a late or repeated write.
    if (completed) await page.unroute(endpoint, handler);
  }
}
