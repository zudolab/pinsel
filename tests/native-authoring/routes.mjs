import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { refKey } from './routes-proof.mjs';
import { observeContentCreation } from './creation-observer.mjs';
import { continueContentRequest } from './content-browser-transport.mjs';
import { contentFieldPlan, markdownLinesText, createDraftSettlement, isAdmittedDraftSave, isProviderRead, editContentBoolean } from './routes-fields.mjs';

/** persist must durably write the journal; the create request waits for it. */
export async function createContentEntry(page, { base, before, modelId, persist, settlement }) {
  await settlement.beforeAdvance();
  await page.goto(`${base}/content?provider=content-filesystem&model=${encodeURIComponent(modelId)}`);
  const button = page.getByRole('button', { name: 'New Entry', exact: true });
  await expect(button).toBeVisible({ timeout: 180000 });
  await expect(button).toBeEnabled({ timeout: 180000 });
  await settlement.beforeAdvance();
  const ref = await observeContentCreation(page, { before, modelId, persist,
    action: () => button.click(),
  });
  await settlement.beforeAdvance();
  return ref;
}

/** Fence filesystem-provider operations until browser close. Native/Assistant/release
 * channels are outside this helper: scenarios using them need their own scoped fences.
 * Unknown provider operations are denied, not inferred safe from their name. */
export async function installDraftWriteGuard(page, { getRefs, persist, requestTimeoutMs = 180000 }) {
  const settlement = createDraftSettlement();
  let closing = false;
  await page.route('**/__zudo_composer_*', route => {
    const request = route.request();
    let input; try { input = request.postDataJSON(); } catch {}
    const operation = request.headers()['x-zudo-composer-operation'] ?? request.headers()['x-zudo-composer-asset-operation'] ?? input?.operation ?? '';
    if (isProviderRead(new URL(request.url()).pathname, operation)) return route.continue();
    return settlement.track((async () => {
      if (closing || settlement.held || new URL(request.url()).pathname !== '/__zudo_composer_content_provider' || operation !== 'put-entry' || !isAdmittedDraftSave(input, getRefs())) {
        settlement.hold('Unexpected canonical write refused');
        try { await persist({ phase: 'draft-write-refused', operation }); } finally { await route.abort(); }
        return;
      }
      await persist({ phase: 'draft-save-before', operation, input });
      try {
        const response = await continueContentRequest(page, route, requestTimeoutMs);
        const body = await response.json();
        await persist({ phase: 'draft-save-after', operation, status: response.status(), body });
        assert(response.status() === 200 && body?.ok === true, 'Draft save not acknowledged');
      } catch (error) {
        settlement.hold(error);
        await persist({ phase: 'draft-save-uncertain', operation, error: String(error) });
        throw error;
      }
    })());
  });
  return { ...settlement, get held() { return settlement.held; },
    // Call even after an observational failure. Mark completion only after this returns.
    async close(context) { closing = true; await settlement.drain(); await context.close(); await settlement.beforeAdvance(); },
  };
}

const fieldControl = (page, plan) => plan.name
  ? page.getByRole('textbox', { name: plan.name }) : page.locator(`[id="${plan.id}"]`);

/** Uses captured schema IDs, required-marker-aware Markdown names and real keyboard switches. */
export async function fillContentFields(page, fields, { model, settlement }) {
  const plans = contentFieldPlan(model, fields); // Compile every selector before writes.
  await settlement.beforeAdvance();
  for (const plan of plans) {
    await expect(fieldControl(page, plan)).toHaveCount(1, { timeout: 180000 });
    await expect(fieldControl(page, plan)).toBeVisible({ timeout: 180000 });
    if (plan.field.kind === 'url') await expect(fieldControl(page, plan)).toHaveAttribute('type', 'url');
  }
  for (const plan of plans) {
    await settlement.beforeAdvance();
    const control = fieldControl(page, plan);
    if (plan.field.kind === 'slug') {
      const automatic = page.locator(`[id="${plan.id}-auto"]`);
      if (await automatic.count()) {
        if (await automatic.isChecked()) await automatic.press('Space');
        await expect(automatic).not.toBeChecked();
      }
    }
    if (typeof plan.value === 'boolean') {
      const unsetNo = page.getByRole('button', { name: `Set ${plan.field.label} to No`, exact: true });
      await editContentBoolean(control, unsetNo, plan.value);
      await expect(control).toBeChecked({ checked: plan.value });
      await expect(unsetNo).toHaveCount(0);
    } else await control.fill(String(plan.value));
  }
  const save = page.getByRole('button', { name: 'Save', exact: true });
  if (await save.isEnabled()) await save.click();
  await expect(page.getByTitle('All changes saved', { exact: true })).toBeVisible({ timeout: 180000 });
  await settlement.beforeAdvance();
}

export async function verifyContentFields(page, fields, { model, settlement }) {
  await settlement.beforeAdvance();
  for (const plan of contentFieldPlan(model, fields)) {
    const control = fieldControl(page, plan);
    await expect(control).toHaveCount(1, { timeout: 180000 });
    if (plan.field.kind === 'url') await expect(control).toHaveAttribute('type', 'url');
    if (typeof plan.value === 'boolean') await expect(control).toBeChecked({ checked: plan.value });
    else if (plan.field.kind === 'markdown') {
      await expect.poll(async () => markdownLinesText(await control.locator('.cm-line').allTextContents()), { timeout: 180000 }).toBe(plan.value);
    } else await expect(control).toHaveValue(String(plan.value), { timeout: 180000 });
  }
  await settlement.beforeAdvance();
}

export async function saveAndReloadContentFields(page, fields, options) {
  await fillContentFields(page, fields, options);
  await page.reload();
  await verifyContentFields(page, fields, options);
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
