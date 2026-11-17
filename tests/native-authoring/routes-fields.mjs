import assert from 'node:assert/strict';
import { contentReadOperations } from './content-browser-transport.mjs';

/** Resolve the captured schema before any edit; labels are never broad selectors. */
export function contentFieldPlan(model, values) {
  return Object.entries(values).map(([label, value]) => {
    const matches = model.fields.filter(field => field.label === label);
    assert.equal(matches.length, 1, `Ambiguous or missing field: ${label}`);
    const field = matches[0];
    assert(['text', 'long-text', 'slug', 'url', 'markdown', 'number', 'boolean'].includes(field.kind), `Unsupported field kind: ${field.kind}`);
    assert.equal(typeof value, field.kind === 'number' ? 'number' : field.kind === 'boolean' ? 'boolean' : 'string');
    return { field, value, ...(field.kind === 'markdown'
      ? { name: new RegExp('^' + RegExp.escape(label) + ' *[*]?$') }
      : { id: `content-entry-${field.id}` }) };
  });
}

/** CodeMirror uses one element per line; textContent discards the separators. */
export function markdownLinesText(lines) {
  assert(Array.isArray(lines) && lines.length > 0 && lines.every(line => typeof line === 'string'));
  return lines.join('\n');
}

export function createDraftSettlement() {
  const active = new Set();
  let held;
  const hold = reason => { held ??= reason instanceof Error ? reason : Error(reason); };
  async function drain() { while (active.size) await Promise.allSettled([...active]); }
  return {
    hold,
    get held() { return held; },
    track(promise) {
      const tracked = Promise.resolve(promise).catch(error => { hold(error); throw error; });
      active.add(tracked);
      tracked.finally(() => active.delete(tracked)).catch(() => {});
      return tracked;
    },
    drain,
    async beforeAdvance() { await drain(); if (held) throw held; },
  };
}

export function isAdmittedDraftSave(input, refs) {
  const record = input?.record;
  return !!record && record.lifecycle === 'draft' && refs.some(ref =>
    ref.providerId === 'content-filesystem' && ref.modelId === record.modelId && ref.recordId === record.id);
}

const providerReads = new Map([
  ['/__zudo_composer_content_provider', contentReadOperations],
  ['/__zudo_composer_file_provider', new Set(['snapshot', 'list', 'get'])],
  ['/__zudo_composer_mapping_provider', new Set(['initialize', 'snapshot', 'list', 'read-all', 'get'])],
  ['/__zudo_composer_sitemapper_provider', new Set(['initialize', 'snapshot', 'list', 'read-all', 'get'])],
  ['/__zudo_composer_workspace_provider', new Set(['list', 'selection', 'generation', 'open', 'find-seeding', 'missing-directories'])],
  ['/__zudo_composer_asset_file_provider', new Set(['initialize', 'snapshot', 'list', 'get', 'resolve-version'])],
]);
/** Unknown operations are denied, including non-prefix writes such as editorial-apply. */
export function isProviderRead(pathname, operation) { return providerReads.get(pathname)?.has(operation) === true; }

/** An unchecked unset field is not the authored value false. Never double-toggle it. */
export function booleanContentAction({ value, checked, unsetChoices }) {
  assert.equal(typeof value, 'boolean'); assert.equal(typeof checked, 'boolean');
  assert(unsetChoices === 0 || unsetChoices === 1, 'Unset boolean action must be unambiguous');
  assert(!(unsetChoices && checked), 'Unset boolean cannot already be checked');
  if (!value && unsetChoices === 1) return 'set-no';
  return checked === value ? 'none' : 'toggle';
}

/** Pass the exact `Set ${field.label} to No` button; caller verifies saved state. */
export async function editContentBoolean(control, unsetNo, value) {
  const action = booleanContentAction({ value, checked: await control.isChecked(), unsetChoices: await unsetNo.count() });
  if (action === 'set-no') {
    assert(await unsetNo.isVisible() && await unsetNo.isEnabled(), 'Explicit unset boolean action is unavailable');
    await unsetNo.click();
  } else if (action === 'toggle') await control.press('Space');
  return action;
}
