import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { canonicalProject } from './support.mjs';

/** Real DOM driver for the supported fake provider. It never fabricates an acknowledgement. */
export async function proposeFromSelection(page, { prop, prompt, domain }) {
    assert(['content', 'composition'].includes(domain));
    await page.getByLabel('Selected property', { exact: true }).selectOption(prop ?? '');
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
    await card.getByLabel('Candidate route', { exact: true }).selectOption(pathname);
    await expect(card.getByText('Exact candidate rendered. Review the changes before Apply.', { exact: true })).toBeVisible({ timeout: 180000 });
    if (text) await expect(card.frameLocator('iframe[title="Host candidate review"]').locator('body')).toContainText(text);
}
/** Observe the real request and receipt before delivery; do not mistake CDP observer loss for response loss. */
export async function observeAssistantOperation(page, operation, action, { loseResponse = false } = {}) {
    let settle;
    const result = new Promise(resolve => { settle = resolve; });
    let captured = false;
    const handler = async route => {
        let request;
        try { request = route.request().postDataJSON(); } catch { await route.continue(); return; }
        if (captured || request?.operation !== operation) { await route.continue(); return; }
        captured = true;
        try {
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
export function assertContentOwnership(before, after, { providerId, entryId, fieldId, value }) {
    const a = canonicalProject(before), b = canonicalProject(after);
    for (const domain of ['compositions', 'mappings', 'sitemaps']) assert.deepEqual(b.providers[domain], a.providers[domain], `${domain} changed during Content Apply`);
    const provider = b.providers.content.find(item => item.id === providerId);
    const entry = provider?.entries.find(item => item.id === entryId);
    assert(entry, 'Expected Content owner absent');
    assert.equal(entry.values[fieldId], value);
    const original = a.providers.content.find(item => item.id === providerId)?.entries.find(item => item.id === entryId);
    assert(original && Object.hasOwn(original.values, fieldId));
    entry.values[fieldId] = original.values[fieldId];
    assert.deepEqual(b.providers.content, a.providers.content, 'Apply changed unrelated Content values');
}
