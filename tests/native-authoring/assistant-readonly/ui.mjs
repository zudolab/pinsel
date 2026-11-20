import assert from 'node:assert/strict';
import { replacement } from './policy.mjs';
export async function checks({ page, base, before, getPreview, getStreams, expect, record, shot, resumePrice, recoverPrice }) {
    const open = async (pathname) => {
        await page.goto(base + '/composer?native=1&visitor=' + encodeURIComponent(pathname));
        await page.getByText('Saved snapshot rendered', { exact: true }).waitFor({ timeout: 180000 });
        await expect.poll(() => getPreview()?.identity.pathname, { timeout: 180000 }).toBe(pathname);
        assert.equal(getPreview().identity.revision, before.digest, 'Preview not bound to unchanged public baseline');
    };
    const select = async (target) => {
        await page.frameLocator('iframe[title="Host rendered page"]').locator('[data-composer-target]').evaluateAll((elements, id) => {
            const matches = elements.filter(el => el.getAttribute('data-composer-target') === id);
            if (!matches.length)
                throw Error('Missing actual rendered target');
            matches[0].click();
        }, target.renderedNodeId);
        await expect(page.getByRole('treeitem', { selected: true })).toHaveCount(1);
        const detail = page.getByText('Component and owner', { exact: true });
        if (!await detail.evaluate(el => el.parentElement.open))
            await detail.click();
        await expect(page.getByText(`${target.providerId}/${target.recordId}/${target.nodeId}`, { exact: true })).toBeVisible();
    };
    const humanSources = async (target, fieldId, routes, arrangement) => {
        assert(target.fieldSources?.length, 'Installed package lacks #985 field source metadata');
        const source = target.fieldSources.find(f => f.sources.some(s => s.fieldId === fieldId && s.entry.modelId === 'course' && s.entry.recordId === 'consultation'));
        assert(source, 'Missing exact qualified course field source');
        const region = page.getByRole('region', { name: 'Bound field sources', exact: true }).getByRole('region', { name: source.label + ' source', exact: true });
        await expect(region.getByText('content-filesystem/course/consultation/' + fieldId, { exact: true })).toBeVisible();
        assert.deepEqual((await region.getByRole('listitem').allTextContents()).sort(), [...routes].sort());
        await expect(region.getByRole('link', { name: /^Open .* source$/ })).toHaveCount(1);
        assert.deepEqual((await page.getByRole('region', { name: 'Arrangement owner uses', exact: true }).getByRole('listitem').allTextContents()).sort(), [...arrangement].sort());
        await record('human-sources', { target: target.renderedNodeId, fieldId, routes, arrangement });
        return source.prop;
    };
    const send = async (prop, prompt, expectedTools, resume) => {
        const oldRunIds = new Set(getStreams().map(stream => stream.runId));
        await page.getByRole('region', { name: 'Assistant selection', exact: true }).getByRole('combobox').selectOption(prop);
        await page.getByRole('link', { name: 'Ask Assistant', exact: true }).click();
        if (resume) {
            assert.equal(resume.prompt, prompt, 'Recovered run prompt differs');
            assert.equal(resume.selection.prop, prop, 'Recovered field differs');
            assert.equal(resume.selection.pathname, '/lessons');
            await page.getByRole('combobox', { name: /^Conversation/ }).selectOption(resume.conversationId);
            await expect(page.getByRole('region', { name: 'Conversation messages', exact: true })).toContainText(prompt);
            await recoverPrice();
        }
        else {
            await page.getByRole('button', { name: 'New conversation', exact: true }).click();
            await page.getByLabel('Request', { exact: true }).fill(prompt);
            await page.getByRole('button', { name: 'Send', exact: true }).click();
        }
        // Wait for the persisted assistant reply, not a streaming lookalike.
        const reply = page.getByRole('region', { name: 'Conversation messages', exact: true }).getByRole('article').filter({ has: page.locator('strong').filter({ hasText: /^assistant$/ }) }).last();
        await reply.waitFor({ timeout: 180000 });
        await expect(page.getByRole('button', { name: 'Stop reply', exact: true })).toHaveCount(0, { timeout: 180000 });
        await expect.poll(() => getStreams().some(s => !oldRunIds.has(s.runId) && s.events.some(e => e.type === 'done')), { timeout: 180000 }).toBe(true);
        const fresh = getStreams().filter(s => !oldRunIds.has(s.runId));
        assert.equal(new Set(fresh.map(s => s.runId)).size, 1, 'Exactly one observed model run expected');
        if (resume)
            assert.equal(fresh[0].runId, resume.runId, 'Recovered wrong historical run');
        assert(fresh.some(s => s.events.some(e => e.type === 'done' && e.data.status === 'completed')), 'Model run did not complete successfully');
        const tools = [...new Set(fresh.flatMap(s => s.events.filter(e => e.type === 'tool').map(e => e.data.name)))].sort();
        assert.deepEqual(tools, [...expectedTools].sort(), 'Unexpected actual model tool path');
        await record('actual-model-tools', { runId: fresh[0].runId, tools });
        await record('assistant-reply', { prompt, text: await reply.innerText(), conversation: await page.getByRole('combobox', { name: /^Conversation/ }).inputValue() });
        return reply;
    };
    const provider = before.project.providers.content.find(p => p.id === 'content-filesystem');
    const course = provider?.entries.find(e => e.modelId === 'course' && e.id === 'consultation');
    assert(course);
    const price = course.values['course-price'];
    await open('/lessons');
    const prices = getPreview().targets.filter(t => t.componentId === 'pinsel.consultation-price' && t.entries.some(e => e.providerId === 'content-filesystem' && e.modelId === 'course' && e.recordId === 'consultation'));
    assert.equal(prices.length, 1, 'Price fixture target must be unambiguous');
    const target = prices[0];
    if (resumePrice)
        assert.deepEqual(resumePrice.selection.target, { renderedNodeId: target.renderedNodeId, providerId: target.providerId, recordId: target.recordId, nodeId: target.nodeId }, 'Recovered owner differs');
    await select(target);
    const prop = await humanSources(target, 'course-price', ['/', '/lessons'], ['/lessons']);
    await shot('01-human-price-uses');
    await send(prop, replacement(price), ['inspect_owner', 'propose_content'], resumePrice);
    const card = page.getByRole('region', { name: 'content review', exact: true });
    await expect(card).toHaveCount(1, { timeout: 180000 });
    await expect(card.getByRole('heading', { name: 'course/consultation', exact: true })).toBeVisible();
    await expect(card.getByText('This card changes only its named domain. Other cards require separate review and Apply.', { exact: true })).toBeVisible();
    const uses = await card.getByRole('list', { name: 'Affected uses', exact: true }).getByRole('listitem').allTextContents();
    assert.deepEqual([...new Set(uses.map(s => s.split(' · ')[0]))].sort(), ['/', '/lessons']);
    await expect(card.getByRole('button', { name: 'Apply content', exact: true })).toBeDisabled();
    await record('assistant-price-uses', { owner: 'course/consultation', uses, applyDisabled: true });
    await shot('02-assistant-price-uses');
    // The fake-provider all-pages grammar explicitly asks for broader scope, and must
    // explain separate reviews instead of staging a partial cross-domain request.
    await open('/lessons');
    await select(getPreview().targets.find(t => t.renderedNodeId === target.renderedNodeId));
    const mixed = await send(prop, replacement(price, ' on all pages'), []);
    await expect(mixed).toContainText('Select one owning target first. Shared Content changes affect its listed uses; cross-domain requests require separate reviews.');
    await expect(page.getByRole('region', { name: /^(content|composition) review$/ })).toHaveCount(0);
    await shot('03-cross-domain-refusal');
    await open('/contact');
    const options = getPreview().targets.filter(t => t.componentId === 'pinsel.course-option' && t.entries.some(e => e.providerId === 'content-filesystem' && e.modelId === 'course' && e.recordId === 'consultation'));
    assert.equal(options.length, 1, 'Contact fixture target must be unambiguous');
    const option = options[0];
    await select(option);
    const labelProp = await humanSources(option, 'course-contact-option-label', ['/contact'], ['/contact']);
    await shot('04-human-disallowed-field-source');
    const refused = await send(labelProp, replacement(course.values['course-contact-option-label']), ['inspect_owner']);
    await expect(refused).toContainText('The host has not allowed Assistant edits to this Content field.');
    await expect(page.getByRole('region', { name: /^(content|composition) review$/ })).toHaveCount(0);
    await shot('05-disallowed-owner-refusal');
    return { cases: ['human-price-sources', 'assistant-price-affected-uses', 'all-pages-separate-review-refusal', 'human-ai-disallowed-field-source', 'assistant-disallowed-owner-refusal'], qualification: 'Deterministic fake-provider integration only. No Apply, Undo, live inference, mixed-domain transaction, or publication is attempted.' };
}
