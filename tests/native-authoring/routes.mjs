import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { assertNewRecord, refKey } from './routes-proof.mjs';

/** persist must durably write the journal; the create request waits for it. */
export async function createContentEntry(page, { base, before, modelId, persist }) {
  await page.goto(`${base}/content?provider=content-filesystem&model=${encodeURIComponent(modelId)}`);
  let resolveRequest;
  const pending = new Promise(resolve => { resolveRequest = resolve; });
  let intercepted = false;
  const handler = async route => {
    const request = route.request();
    if (intercepted || request.headers()['x-zudo-composer-operation'] !== 'put-entry') return route.continue();
    intercepted = true;
    try {
      const input = request.postDataJSON();
      const ref = assertNewRecord(before, modelId, input.record);
      await persist({ phase: 'create-request', ref, input });
      const response = await route.fetch({ timeout: 180000 });
      const body = await response.json();
      await persist({ phase: 'create-response', ref, status: response.status(), body });
      await route.fulfill({ response });
      resolveRequest({ ref, status: response.status(), body });
    } catch (error) { await route.abort().catch(() => {}); resolveRequest({ error }); }
  };
  await page.route('**/__zudo_composer_content_provider', handler);
  let timer;
  try {
    await page.getByRole('button', { name: 'New Entry', exact: true }).click();
    const result = await Promise.race([pending, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Creation outcome uncertain; inspect journal before retrying')), 180000); })]);
    if (result.error) throw result.error;
    assert(result.status === 200 && result.body.ok, JSON.stringify(result));
    return result.ref;
  } finally { clearTimeout(timer); await page.unroute('**/__zudo_composer_content_provider', handler); }
}

export async function fillContentFields(page, fields) {
  for (const [label, value] of Object.entries(fields)) {
    const control = page.getByLabel(label, { exact: true });
    if (typeof value === 'boolean') await control.setChecked(value);
    else await control.fill(String(value)); // Includes CodeMirror's labelled contenteditable.
  }
  const save = page.getByRole('button', { name: 'Save', exact: true });
  if (await save.isEnabled()) await save.click();
  await expect(page.getByTitle('All changes saved', { exact: true })).toBeVisible({ timeout: 180000 });
}

/** Select exact qualified references, refusing missing choices and every accidental selection. */
export async function releaseContent(page, { base, refs, persist }) {
  await page.goto(`${base}/review`);
  await page.getByRole('button', { name: 'Inspect current state', exact: true }).click();
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Select Content changes', exact: true }) });
  const desired = new Map(refs.map(ref => [refKey(ref), ref]));
  await persist({ phase: 'release-selection', refs });
  const boxes = section.getByRole('checkbox');
  await expect.poll(() => boxes.count(), { timeout: 180000 }).toBeGreaterThan(0);
  for (const box of await boxes.all()) {
    const label = await box.getAttribute('aria-label') ?? await box.evaluate(el => [...(el.labels ?? [])].map(label => label.textContent).join(' '));
    const match = /^(?:new|changed|deleted|unpublish): ([^ ]+) \/ ([^ ]+) \/ ([^ ]+)$/.exec(label.trim());
    assert(match, `Unexpected release choice label: ${label}`);
    const key = refKey({ providerId: match[1], modelId: match[2], recordId: match[3] });
    await box.setChecked(desired.has(key));
    desired.delete(key);
  }
  assert.equal(desired.size, 0, `Requested release choices missing: ${JSON.stringify([...desired.values()])}`);
  for (const name of ['Run release checks', 'Approve reviewed candidate', 'Apply / stage exact candidate', 'Build staged candidate', 'Activate locally']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toBeEnabled({ timeout: 180000 });
    await persist({ phase: 'release-before', action: name });
    await button.click();
  }
  await expect(page.getByText(/Activated locally\. Publication reconciliation:/)).toBeVisible({ timeout: 180000 });
  await persist({ phase: 'release-activated', text: await page.locator('main').innerText() });
}
