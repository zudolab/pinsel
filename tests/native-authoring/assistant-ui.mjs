import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { canonicalProject, contentOwner } from './support.mjs';

/** Real DOM driver for the supported fake provider. It never fabricates an acknowledgement. */
export async function proposeFromSelection(page, { prop, prompt, domain }) {
    assert(['content', 'composition'].includes(domain));
    const property = page.getByRole('region', { name: 'Assistant selection', exact: true }).getByRole('combobox');
    await expect(property).toHaveCount(1);
    await property.selectOption(prop ?? '');
    await page.getByRole('link', { name: 'Ask Assistant', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).click();
    await page.getByLabel('Request', { exact: true }).fill(prompt);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const card = page.getByRole('region', { name: `${domain} review`, exact: true });
    await expect(card).toHaveCount(1, { timeout: 180000 });
    await expect(card.getByRole('button', { name: `Apply ${domain}`, exact: true })).toBeDisabled();
    return card;
}
export async function renderExactCandidate(card, { pathname, text }) {
    const choices = card.getByRole('combobox');
    await expect(choices).toHaveCount(1);
    const values = await choices.locator('option').evaluateAll(options => options.map(option => option.value));
    const value = values.find(value => value && value.replace(/\/$/, '') === pathname.replace(/\/$/, ''));
    assert(value, `Candidate route unavailable: ${pathname}`);
    await choices.selectOption(value);
    await expect(card.getByText('Exact candidate rendered. Review the changes before Apply.', { exact: true })).toBeVisible({ timeout: 180000 });
    if (text) await expect(card.frameLocator('iframe[title="Host candidate review"]').locator('body')).toContainText(text);
}
/** Observe the real request and receipt before delivery; do not mistake CDP observer loss for response loss. */
export async function observeAssistantOperation(page, operation, action, { loseResponse = false, onRequest } = {}) {
    let settle;
    const result = new Promise(resolve => { settle = resolve; });
    let captured = false;
    const handler = async route => {
        let request;
        try { request = route.request().postDataJSON(); } catch { await route.continue(); return; }
        if (captured || request?.operation !== operation) { await route.continue(); return; }
        captured = true;
        try {
            if (onRequest) await onRequest(request);
            const response = await route.fetch({ timeout: 180000 });
            const body = await response.json();
            if (loseResponse) {
                assert(response.ok() && body.ok, 'Cannot drop a refused response and call it committed response loss');
                await route.abort();
            } else await route.fulfill({ response });
            settle({ request, status: response.status(), body });
        } catch (error) { await route.abort().catch(() => {}); settle({ error }); }
    };
    await page.route('**/*', handler);
    let timeout;
    try {
        await action();
        const evidence = await Promise.race([result, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`No ${operation} request`)), 180000); })]);
        if (evidence.error) throw evidence.error;
        return evidence;
    } finally { clearTimeout(timeout); await page.unroute('**/*', handler); }
}
export async function applyReviewed(page, card, domain, options) {
    const evidence = await observeAssistantOperation(page, 'applyHostReview', () => card.getByRole('button', { name: `Apply ${domain}`, exact: true }).click(), options);
    assert(evidence.body.ok, JSON.stringify(evidence.body));
    const rendered = evidence.request.input.rendered;
    assert.equal(rendered.reviewId, evidence.request.input.reviewId);
    assert(rendered.frameId && rendered.identity && rendered.candidateDigest && rendered.baseDigest, 'Apply omitted exact candidate identity');
    return evidence;
}
export async function recoverRetainedApply(page, card, committed) {
    const recovered = await observeAssistantOperation(page, 'applyHostReview', () => card.getByRole('button', { name: 'Recover retained Apply', exact: true }).click());
    assert.deepEqual(recovered.request, committed.request, 'Recovery changed retained request');
    assert(recovered.body.ok && recovered.body.result.recovered, 'Expected durable owning-domain receipt recovery');
    assert.deepEqual(recovered.body.result.receipt, committed.body.result.receipt);
    return recovered;
}
export async function undoReviewed(page, card, domain, { refused = false } = {}) {
    const evidence = await observeAssistantOperation(page, 'undoHostReview', () => card.getByRole('button', { name: `Undo ${domain}`, exact: true }).click());
    assert.equal(evidence.body.ok, !refused, 'Guarded Undo outcome differed');
    return evidence;
}
export function assertProposalReadOnly(before, after) {
    assert.deepEqual(after, before, 'Proposal/candidate changed canonical public capture');
}
/** Content Apply must never copy bound values into Composition props, Mapping or Sitemap. */
export function assertContentOwnership(before, after, { providerId, entryId, fieldId, value, spec, apply }) {
    const a = canonicalProject(before), b = canonicalProject(after);
    for (const domain of ['compositions', 'mappings', 'sitemaps']) assert.deepEqual(b.providers[domain], a.providers[domain], `${domain} changed during Content Apply`);
    const ref = { providerId, modelId: spec.modelId, entryId };
    const entry = contentOwner(b, ref), original = contentOwner(a, ref);
    assert.equal(entry.values[fieldId], value);
    assert(Object.hasOwn(original.values, fieldId));
    assert(Number.isSafeInteger(before.tokens.content) && before.tokens.content >= 0);
    assert(Number.isSafeInteger(after.tokens.content));
    assert.equal(after.tokens.content, before.tokens.content + 1, 'Expected one Content commit');
    assert(Number.isSafeInteger(original.generation) && original.generation >= 0);
    assert.equal(entry.generation, after.tokens.content, 'Changed entry must carry committed global Content token');
    assert(entry.generation > original.generation, 'Entry generation did not advance');
    assert(apply.body.ok);
    const receipt = apply.body.result.receipt;
    assert.deepEqual(receipt.entry, { providerId, modelId: spec.modelId, recordId: entryId });
    assert.equal(receipt.expected, String(entry.generation));
    assert(receipt.operationKey && receipt.revisionId);
    entry.generation = original.generation;
    entry.values[fieldId] = original.values[fieldId];
    assert.deepEqual(b, a, 'Apply changed unrelated authored values');
    assert.deepEqual(after.assets, before.assets, 'Content Apply changed Assets');
    assert.deepEqual(after.publicFiles, before.publicFiles, 'Content Apply changed public bytes');
}
