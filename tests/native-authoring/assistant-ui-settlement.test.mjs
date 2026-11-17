import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { waitForReviewCompletion } from './assistant-ui.mjs';

// Browser fixture only: no authoring server, credentials or canonical stores.
// Run through the environment's shared heavy guard, separately from pure tests.
test('post-receipt navigation waits for settled review status and enabled Undo', async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.NATIVE_ACCEPTANCE_CHROMIUM || chromium.executablePath() });
    try {
        const page = await browser.newPage();
        await page.setContent('<section aria-label="content review"><p>Status: open</p><button disabled>Undo content</button></section>');
        const card = page.getByRole('region', { name: 'content review' });
        // A delivered receipt alone does not imply that the post-Apply read finished.
        await assert.rejects(waitForReviewCompletion(card, 'content', 'applied', 100));
        await page.locator('p').evaluate(element => { element.textContent = 'Status: applied'; });
        // Even the new status can arrive while the action is still busy.
        await assert.rejects(waitForReviewCompletion(card, 'content', 'applied', 100));
        await page.locator('button').evaluate(element => { element.disabled = false; });
        await waitForReviewCompletion(card, 'content', 'applied', 1000);
        await assert.rejects(waitForReviewCompletion(card, 'content', 'undone', 100));
        await page.locator('p').evaluate(element => { element.textContent = 'Status: undone'; });
        await waitForReviewCompletion(card, 'content', 'undone', 1000);
        // The deliberately lost Apply keeps its open status until recovery; do not
        // weaken the helper to accept a persisted request as a completed Apply.
        await page.locator('p').evaluate(element => { element.textContent = 'Status: open'; });
        await assert.rejects(waitForReviewCompletion(card, 'content', 'applied', 100));
    } finally { await browser.close(); }
});
