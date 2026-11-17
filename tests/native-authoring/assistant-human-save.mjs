import { continueContentRequest, readBrowserContent, contentReadOperations, contentRequestDiagnostic } from './content-browser-transport.mjs';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalProject, contentOwner } from './support.mjs';
import { courseOwner, assertHumanSaveRequest, proveHumanContentSave, assertHumanAttemptsVerified, createHumanSaveAdmission } from './human-content-proof.mjs';
const endpoint = '**/__zudo_composer_content_provider';
const operationHeader = 'x-zudo-composer-operation';
const fieldId = 'course-price';
function contentSnapshot(capture) {
  const providers = capture.project.providers.content.filter(item => item.id === courseOwner.providerId);
  assert.equal(providers.length, 1);
  assert(Number.isSafeInteger(capture.tokens.content) && capture.tokens.content >= 0);
  return { providerId: courseOwner.providerId, mutationToken: capture.tokens.content, models: providers[0].models, entries: providers[0].entries };
}
export function assertAssistantHumanJournalSettled(journal) {
  assert(!(journal.humanWrites?.length), 'Legacy predicted human Save evidence requires explicit reconciliation');
  assertHumanAttemptsVerified(journal);
}
/** Scope-wide fence used by runner cleanup and direct browser inverse/restore phases. */
export async function assertAssistantRunHumanSettled(root) {
  const files = (await readdir(root)).filter(name => /^assistant-(course|faq|note|local|insert|course-stale|course-guard)\.json$/.test(name));
  const journals = [];
  for (const file of files) { const journal = JSON.parse(await readFile(join(root, file), 'utf8')); assertAssistantHumanJournalSettled(journal); journals.push(journal); }
  return journals;
}
/** One actual UI Save plus read-only public Content proof. No receipt or token is invented. */
export async function observeAssistantHumanSave(page, { journal, prior, priorContent, beforeCapture, phase, current, value, persist, action, waitSaved, dispatchTimeoutMs = 120000, requestTimeoutMs = 120000 }) {
  assertAssistantHumanJournalSettled(journal);
  assert(['intervene', 'human-inverse'].includes(phase));
  assert.deepEqual({ providerId: journal.providerId, modelId: journal.spec.modelId, entryId: journal.entryId }, courseOwner);
  assert(Boolean(prior) !== Boolean(priorContent), 'Require exactly one public workspace or Content baseline');
  if (priorContent) {
    assert.equal(phase, 'human-inverse', 'Live Content baseline is only for same-server inverse');
    const previous = journal.humanContentAttempts?.at(-1);
    assert.equal(previous?.status, 'verified');
    assert.deepEqual(priorContent, previous.after, 'Live inverse must use the last verified public Content read');
  }
  const expected = prior ? contentSnapshot(prior) : structuredClone(priorContent);
  const original = contentOwner({ providers: { content: [{ id: expected.providerId, models: expected.models, entries: expected.entries }] } }, courseOwner);
  assert.equal(current, original.values[fieldId], 'UI value differs from immediately preceding public capture');
  const intended = phase === 'intervene' ? `${journal.marker} human intervening` : journal.old;
  assert.equal(value, intended); assert([journal.old, journal.value, `${journal.marker} human intervening`].includes(current));
  if (current === value) {
    journal.humanContentNoops ??= []; journal.humanContentNoops.push({ phase, beforeCapture, beforeDigest: prior?.digest ?? null, evidenceKind: prior ? 'workspace-capture' : 'public-content-read', value }); await persist(); return null;
  }
  const attempt = { phase, fieldId, beforeCapture, beforeDigest: prior?.digest ?? null, evidenceKind: prior ? 'workspace-capture' : 'public-content-read', before: expected, status: 'awaiting-dispatch' };
  journal.humanContentAttempts ??= []; journal.humanContentAttempts.push(attempt); await persist();
  const admission = createHumanSaveAdmission();
  let stopped = false, completed = false, timer, settle;
  const outcome = new Promise(resolve => { settle = resolve; });
  const active = new Set();
  const handle = async route => {
    const request = route.request(), operation = request.headers()[operationHeader];
    if (contentReadOperations.has(operation)) { await route.continue(); return; }
    const refusal = stopped ? 'already-held' : operation !== 'put-entry' ? 'operation-not-admitted' : !admission.admit() ? 'additional-write' : null;
    if (refusal) {
      attempt.diagnostics ??= []; attempt.diagnostics.push({ event: 'refused', reason: refusal, expectedOwner: courseOwner, ...contentRequestDiagnostic(request) });
      stopped = true; attempt.status = 'uncertain'; attempt.error ??= `Content request refused: ${refusal} (${operation ?? 'missing operation'})`;
      try { await persist(); } finally { await route.abort(); }
      if (!admission.started) { clearTimeout(timer); settle({ error: Error(attempt.error) }); }
      return;
    }
    clearTimeout(timer);
    try {
      attempt.diagnostics ??= []; attempt.diagnostics.push({ event: 'admitted', expectedOwner: courseOwner, ...contentRequestDiagnostic(request) });
      attempt.request = request.postDataJSON(); attempt.status = 'admitted'; await persist();
      const read = () => readBrowserContent(page, request, requestTimeoutMs);
      const observedBefore = await read(); attempt.observedBefore = observedBefore; await persist();
      assert.deepEqual(observedBefore, expected, 'Content changed since preceding public capture; Save refused');
      assertHumanSaveRequest(observedBefore, attempt.request, fieldId, value);
      assert(!stopped && !admission.unexpected, 'Human Save was interrupted before dispatch');
      attempt.status = 'dispatching'; await persist();
      const response = await continueContentRequest(page, route, requestTimeoutMs); const body = await response.json();
      attempt.response = { status: response.status(), body }; attempt.status = 'responded'; await persist();
      assert(response.ok() && body.ok, 'Human Save was not acknowledged successfully');
      attempt.after = await read(); await persist();
      assert(!stopped && !admission.unexpected, 'Unexpected mutation refused; preserve successful Save evidence');
      const proof = proveHumanContentSave(observedBefore, attempt.after, { request: attempt.request, status: response.status(), response: body, fieldId, value, phase });
      journal.humanContentWrites ??= []; journal.humanContentWrites.push(proof); attempt.status = 'verified'; await persist();
      assert(!stopped && !admission.unexpected, 'Extra mutation interrupted verified Save');
      settle({ proof });
    } catch (error) {
      attempt.diagnostics ??= []; attempt.diagnostics.push({ event: 'observer-failed', during: attempt.status, errorName: error instanceof Error ? error.name : 'UnknownError' });
      stopped = true; attempt.status = 'uncertain'; attempt.error ??= String(error);
      try { await persist(); } catch (journalError) { error = new AggregateError([error, journalError], 'Human Save and journal require reconciliation'); }
      await route.abort().catch(() => {}); settle({ error });
    }
  };
  const handler = route => { const pending = handle(route); active.add(pending); pending.finally(() => active.delete(pending)).catch(() => {}); return pending; };
  await page.route(endpoint, handler);
  try {
    timer = setTimeout(() => { if (admission.started) return; stopped = true; attempt.status = 'uncertain'; attempt.error = 'Human Save dispatch timed out'; void persist().then(() => settle({ error: Error(attempt.error) }), error => settle({ error })); }, dispatchTimeoutMs);
    let actionError;
    try { await action(); } catch (error) { actionError = error; if (!admission.started) { stopped = true; clearTimeout(timer); attempt.status = 'uncertain'; attempt.error = String(error); await persist(); settle({ error }); } }
    const result = await outcome; await Promise.allSettled([...active]);
    if (result.error) throw result.error;
    assertAssistantHumanJournalSettled(journal);
    if (actionError) throw actionError;
    await waitSaved();
    assert(!stopped && !admission.unexpected, 'Unexpected mutation refused');
    completed = true; return result.proof;
  } catch (error) {
    // A verified read-back remains valid evidence even if the subsequent UI badge fails.
    if (attempt.status === 'verified') { attempt.uiError = String(error); await persist(); }
    throw error;
  } finally { clearTimeout(timer); if (completed) await page.unroute(endpoint, handler); }
}
/** Match actual public post-save capture, including every non-Content domain. */
export function assertAssistantHumanCapture(prior, after, journal, beforeCapture) {
  assertAssistantHumanJournalSettled(journal);
  const matches = (journal.humanContentAttempts ?? []).filter(item => item.beforeCapture === beforeCapture);
  if (!matches.length) { assert(journal.humanContentNoops?.some(item => item.beforeCapture === beforeCapture)); assert.deepEqual(after, prior, 'Noop human phase changed public capture'); return; }
  assert.equal(matches.length, 1);
  const attempt = matches[0]; assert.equal(attempt.beforeDigest, prior.digest);
  assert.deepEqual(attempt.before, contentSnapshot(prior)); assert.deepEqual(attempt.after, contentSnapshot(after));
  const a = canonicalProject(prior), b = canonicalProject(after), old = contentOwner(a, courseOwner), next = contentOwner(b, courseOwner);
  next.values[fieldId] = old.values[fieldId]; next.generation = old.generation;
  assert.deepEqual(b, a, 'Human phase changed unrelated authored state');
  assert.deepEqual(after.assets, prior.assets); assert.deepEqual(after.publicFiles, prior.publicFiles);
}
