import { dirname } from "node:path";
import { artifactPath } from "./support.mjs";
import { observeAssistantHumanSave, assertAssistantRunHumanSettled } from "./assistant-human-save.mjs";
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { proposeFromSelection, renderExactCandidate, applyReviewed, undoReviewed, recoverRetainedApply, observeAssistantOperation, waitForReviewCompletion } from './assistant-ui.mjs';
export const assistantCases = [
  { id: 'course', pathname: '/lessons/', domain: 'content', modelId: 'course', entryId: 'consultation', fieldId: 'course-price', routes: ['/', '/lessons/'] },
  { id: 'faq', pathname: '/faq/', domain: 'content', modelId: 'faq-item', entryId: 'faq-exam-01', fieldId: 'faq-item-answer', routes: ['/faq/'] },
  { id: 'note', pathname: '/notes/exam-schedule/', domain: 'content', componentId: 'pinsel.prose', modelId: 'note', entryId: 'exam-schedule', fieldId: 'note-body', routes: ['/notes/exam-schedule/'] },
  { id: 'local', pathname: '/lessons/', domain: 'composition', routes: ['/lessons/'] },
  { id: 'insert', pathname: '/lessons/', domain: 'composition', routes: ['/lessons/'] },
];
export async function runAssistantPhase({ phase, caseId, page, open, navigate, getPreview, frame, record, shot, journalPath, before, restart, humanPrior }) {
  const spec = assistantCases.find(value => value.id === caseId) ?? (['course-stale', 'course-guard'].includes(caseId) ? { ...assistantCases[0], id: caseId } : null);
  assert(spec, 'Unknown Assistant case');
  if (['setup', 'cleanup', 'apply', 'undo', 'restore', 'intervene', 'human-inverse', 'stale-refuse', 'guard-refuse', 'stale-cycle'].includes(phase)) await assertAssistantRunHumanSettled(dirname(journalPath));
  let journal;
  const persist = () => writeFile(journalPath, JSON.stringify(journal, null, 2));
  if (phase === 'stale-cycle') {
    assert.equal(caseId, 'course-stale');
    const baselineName = process.env.NATIVE_ACCEPTANCE_BEFORE_CAPTURE;
    assert(baselineName, 'Same-server stale cycle requires fresh offline baseline');
    const baseline = JSON.parse(await readFile(artifactPath(dirname(journalPath), baselineName), 'utf8'));
    const context = { caseId, page, open, navigate, getPreview, frame, record, shot, journalPath, before: baseline, restart };
    await runAssistantPhase({ ...context, phase: 'propose' });
    await open(spec.pathname);
    assert.equal(getPreview().identity.revision, baseline.digest, 'Proposal changed canonical workspace');
    await runAssistantPhase({ ...context, phase: 'intervene' });
    await open(spec.pathname);
    const beforeRefusal = structuredClone(getPreview().identity);
    await runAssistantPhase({ ...context, phase: 'stale-refuse' });
    await open(spec.pathname);
    const afterRefusal = structuredClone(getPreview().identity);
    assert.deepEqual(afterRefusal, beforeRefusal, 'Refused stale Apply changed coherent workspace identity');
    journal = JSON.parse(await readFile(journalPath, 'utf8'));
    journal.sameServerStale = { baselineDigest: baseline.digest, beforeRefusal, afterRefusal, unchanged: true };
    await persist();
    const verified = journal.humanContentAttempts.at(-1);
    assert.equal(verified.status, 'verified'); assert(verified.after);
    const liveName = `assistant-${caseId}-live-before-inverse.json`;
    await writeFile(artifactPath(dirname(journalPath), liveName), JSON.stringify(verified.after, null, 2), { flag: 'wx' });
    await runAssistantPhase({ ...context, phase: 'human-inverse', humanPrior: { snapshot: verified.after, evidenceName: liveName } });
    return;
  }
  const select = async target => frame().locator('[data-composer-target]').evaluateAll((elements, id) => { const element = elements.find(e => e.getAttribute('data-composer-target') === id); if (!element) throw Error('Target absent'); element.click(); }, target.renderedNodeId);
  const humanEdit = async (action, onRequest) => {
    const previous = getPreview().identity.revision;
    const receipt = await observeAssistantOperation(page, 'document-edit', action, { onRequest });
    assert(receipt.body.ok, JSON.stringify(receipt.body));
    await expect.poll(() => getPreview().identity.revision, { timeout: 180000 }).not.toBe(previous);
    await page.getByText('Saved snapshot rendered', { exact: true }).waitFor({ timeout: 180000 });
    return receipt;
  };
  if (phase === 'setup') {
    assert.equal(spec.id, 'local');
    await open(spec.pathname);
    const parent = getPreview().targets.find(t => t.recordId === 'lessons' && t.nodeId === 'frame');
    assert(parent); await select(parent);
    const area = page.getByRole('region', { name: 'Insert local component', exact: true });
    await area.getByRole('combobox').nth(0).selectOption('main');
    await area.getByRole('combobox').nth(1).selectOption('pinsel.paragraph');
    journal = { spec }; await writeFile(journalPath, JSON.stringify(journal), { flag: 'wx' });
    journal.setup = await humanEdit(() => page.getByRole('button', { name: 'Insert at start of slot', exact: true }).click(), async request => { journal.setupRequest = request; journal.fixture = { ...request.input.target, nodeId: request.input.change.nodeId }; await persist(); });
    await persist();
    const nodeId = journal.setup.request.input.change.nodeId;
    const target = getPreview().targets.find(t => t.nodeId === nodeId && t.recordId === 'lessons');
    assert(target); journal.fixture = target; await persist(); await select(target);
    await page.locator('.cms-host-inspector').getByLabel('本文').fill('Pinsel local Assistant fixture');
    journal.setupField = await humanEdit(() => page.getByRole('button', { name: 'Save field', exact: true }).click());
    await persist(); return;
  }
  if (phase === 'cleanup') {
    journal = JSON.parse(await readFile(journalPath, 'utf8')); assert.equal(spec.id, 'local');
    await open(spec.pathname);
    const target = getPreview().targets.find(t => t.nodeId === journal.fixture.nodeId && t.recordId === journal.fixture.recordId);
    assert(target && ['Pinsel local Assistant fixture', ''].includes(target.props.text), 'Fixture has intervening changes');
    await select(target);
    journal.cleanup = await humanEdit(() => page.getByRole('button', { name: 'Remove component', exact: true }).click());
    await persist(); return;
  }
  if (phase === 'propose') {
    await open(spec.pathname);
    const targets = getPreview().targets;
    let target, prop, old;
    if (spec.domain === 'content') {
      const provider = before.project.providers.content.find(p => p.id === 'content-filesystem');
      const entry = provider.entries.find(e => e.modelId === spec.modelId && e.id === spec.entryId);
      assert(entry);
      old = entry.values[spec.fieldId];
      assert.equal(typeof old, 'string');
      target = targets.find(t => (!spec.componentId || t.componentId === spec.componentId) && t.entries.some(e => e.providerId === provider.id && e.modelId === spec.modelId && e.recordId === spec.entryId) && Object.values(t.props).includes(old));
      assert(target, `No rendered bound target for ${spec.fieldId}`);
      prop = Object.keys(target.props).find(key => target.props[key] === old);
    } else if (spec.id === 'insert') {
      target = targets.find(t => t.recordId === 'lessons' && t.capabilities?.insertSlots.some(slot => slot.components.some(c => c.id === 'pinsel.paragraph')));
      assert(target, 'No allowed page-local paragraph insertion');
    } else {
      target = targets.find(t => t.recordId === 'lessons' && t.capabilities?.fields.allowed && typeof t.props.text === 'string' && t.props.text.length && !t.props.text.includes('"') && !t.props.text.includes('\n'));
      assert(target, 'No editable local text target; create an explicit fixture instead of editing a bound value');
      prop = 'text'; old = target.props.text;
    }
    const marker = `Pinsel Assistant acceptance ${spec.id}`;
    const needle = old?.split(/[\n"]/).find(part => part.trim().length > 2);
    if (spec.id !== 'insert') assert(needle, 'No safe fake-provider replacement substring');
    const value = old?.replace(needle, marker);
    const slot = target.capabilities?.insertSlots.find(s => s.components.some(c => c.id === 'pinsel.paragraph'));
    const prompt = spec.id === 'insert' ? `insert "pinsel.paragraph" into "${slot.slotId}" with {"text":"${marker}"}` : `replace "${needle}" with "${marker}"`;
    const setup = spec.id === 'local' ? JSON.parse(await readFile(journalPath, 'utf8')) : {};
    journal = { ...setup, spec, target, prop, old, value, marker, prompt, providerId: 'content-filesystem', entryId: spec.entryId, fieldId: spec.fieldId };
    await writeFile(journalPath, JSON.stringify(journal, null, 2), spec.id === 'local' ? {} : { flag: 'wx' });
    await frame().locator('[data-composer-target]').evaluateAll((elements, id) => { const element = elements.find(e => e.getAttribute('data-composer-target') === id); if (!element) throw Error('Target absent'); element.click(); }, target.renderedNodeId);
    const card = await proposeFromSelection(page, { prop, prompt, domain: spec.domain });
    journal.conversationId = await page.getByRole('combobox', { name: /^Conversation/ }).inputValue();
    assert(journal.conversationId);
    await persist();
    if (spec.id === 'course-stale') {
      journal.preview = await observeAssistantOperation(page, 'previewHostReview', () => renderExactCandidate(card, { pathname: spec.pathname, text: marker }));
      assert(journal.preview.body.ok); await persist();
      // Retain the real exact-ack Apply request without dispatching it yet.
      // The later human edit must make recovery of this request refuse.
      let heldResolve;
      const held = new Promise(resolve => { heldResolve = resolve; });
      const hold = async route => {
        let request; try { request = route.request().postDataJSON(); } catch {}
        if (request?.operation !== 'applyHostReview') { await route.continue(); return; }
        journal.heldApply = request; await persist(); await route.abort(); heldResolve();
      };
      await page.route('**/*', hold);
      let timeout;
      try {
        await card.getByRole('button', { name: 'Apply content', exact: true }).click();
        await Promise.race([held, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Exact Apply request not emitted')), 180000); })]);
      } finally { clearTimeout(timeout); await page.unroute('**/*', hold); }

    }
    await shot(`assistant-${caseId}-proposed`);
    record('assistant-proposed', journal);
    return;
  }
  journal = JSON.parse(await readFile(journalPath, 'utf8'));
  if (phase === 'intervene' || phase === 'human-inverse') {
    await navigate(new URL('/content?provider=content-filesystem&model=course&entry=consultation', page.url()).href);
    const field = page.getByRole('textbox', { name: /^価格（表示）\s*\*?$/ });
    await expect(field).toHaveCount(1, { timeout: 120000 });
    await field.waitFor({ timeout: 120000 });
    const current = await field.inputValue();
    const changed = `${journal.marker} human intervening`;
    assert([journal.old, journal.value, changed].includes(current), 'Intervening value is outside this test journal');
    const value = phase === 'intervene' ? changed : journal.old;
    const beforeCapture = humanPrior?.evidenceName ?? process.env.NATIVE_ACCEPTANCE_BEFORE_CAPTURE;
    assert(beforeCapture, 'Human Save needs immediately preceding public capture');
    const prior = JSON.parse(await readFile(artifactPath(dirname(journalPath), beforeCapture), 'utf8'));
    if (humanPrior) assert.deepEqual(prior, humanPrior.snapshot);
    await observeAssistantHumanSave(page, { journal, ...(humanPrior ? { priorContent: prior } : { prior }), beforeCapture, phase, current, value, persist,
      action: async () => { await field.fill(value); const save = page.getByRole('button', { name: 'Save', exact: true }); if (await save.isEnabled()) await save.click(); },
      waitSaved: () => page.locator('button[title="All changes saved"]').waitFor({ timeout: 120000 }),
    });
    return;
  }
  const origin = new URL(page.url()).origin;
  const resume = async () => {
    await navigate(new URL('/composer?assistant=1', origin).href);
    await page.getByRole('combobox', { name: /^Conversation/ }).selectOption(journal.conversationId);
    const card = page.getByRole('region', { name: `${spec.domain} review`, exact: true });
    await expect(card).toHaveCount(1, { timeout: 180000 });
    return card;
  };
  let card = await resume();
  if (phase === 'stale-refuse') {
    await expect(card.getByText(/^Status: stale/)).toBeVisible();
    await expect(card.getByRole('button', { name: `Apply ${spec.domain}`, exact: true })).toHaveCount(0);
    assert(journal.heldApply, 'Missing retained exact candidate Apply request');
    const evidence = await observeAssistantOperation(page, 'applyHostReview', () => card.getByRole('button', { name: 'Recover retained Apply', exact: true }).click());
    journal.stale = evidence; await persist();
    assert.deepEqual(evidence.request, journal.heldApply, 'Stale test changed the reviewed Apply request');
    assert.equal(evidence.body.ok, false, 'Stale Apply unexpectedly committed');
    assert.equal(evidence.body.error?.code, 'stale-plan');
    journal.stale = evidence; await persist(); record('stale-proposal-refused', evidence); return;
  }
  if (phase === 'guard-refuse') {
    journal.guard = await undoReviewed(page, card, spec.domain, { refused: true });
    assert.equal(journal.guard.body.error?.code, 'revision-conflict');
    await persist(); record('guarded-undo-refused', journal.guard); return;
  }
  if (phase === 'restore') {
    const recover = card.getByRole('button', { name: 'Recover retained Apply', exact: true });
    if (await recover.count()) {
      const result = await observeAssistantOperation(page, 'applyHostReview', () => recover.click());
      assert(result.body.ok, 'Pending Apply must recover before restoration');
      journal.recoveredDuringRestore = result; await persist();
      await waitForReviewCompletion(card, spec.domain, 'applied');
    }
    if (await card.getByRole('button', { name: `Undo ${spec.domain}`, exact: true }).count()) {
      journal.undo = await undoReviewed(page, card, spec.domain); await persist();
      await waitForReviewCompletion(card, spec.domain, 'undone');
    } else {
      await expect(card.getByText(/^Status: (open|undone|stale|discarded)/)).toBeVisible();
    }
    return;
  }
  if (phase === 'apply') {
    await renderExactCandidate(card, { pathname: spec.pathname.replace(/\/$/, '') || '/', text: journal.marker });
    journal.apply = await applyReviewed(page, card, spec.domain, { loseResponse: spec.id === 'course' });
    await persist();
    if (spec.id === 'course') {
      // Close the browser process; persistent profile retains only actual product recovery state.
      page = await restart();
      card = await resume();
      journal.recovery = await recoverRetainedApply(page, card, journal.apply);
      await persist();
    }
    await waitForReviewCompletion(card, spec.domain, 'applied');
    for (const path of spec.routes) { await open(path); await expect(frame().locator('body')).toContainText(journal.marker); }
    await shot(`assistant-${caseId}-applied`);
    record('assistant-applied', journal.apply);
  } else if (phase === 'undo') {
    journal.undo = await undoReviewed(page, card, spec.domain);
    await persist();
    await waitForReviewCompletion(card, spec.domain, 'undone');
    await shot(`assistant-${caseId}-undone`);
    record('assistant-undone', journal.undo);
  } else throw Error('Unknown Assistant phase');
}
