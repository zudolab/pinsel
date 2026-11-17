import assert from 'node:assert/strict';
import {FAMILY} from './family-graph.mjs';
const one = (xs, message) => { assert.equal(xs.length, 1, message); return xs[0]; };
/** Values come from the accepted public capture, never descriptor display text. */
export function ownedFamilyExpectation(snapshot, {kind, marker, childText, family}) {
 const spec=FAMILY[kind];assert(spec);assert(/^[a-z0-9-]+$/.test(marker));
 const provider=one(snapshot.project.providers.content.filter(p=>p.id==='content-filesystem'),'Content provider');
 const field=kind==='faq'?'faq-item-question':'result-entry-school';
 const child=one(provider.entries.filter(e=>e.modelId===spec.childModel&&(family?e.id===family.content.child.recordId:e.values[field]===childText)),'Qualified child must be unique');
 let parentRef=family?.content.parent;
 if(!parentRef){
  if(kind==='results'){const p=one(provider.entries.filter(e=>e.modelId===spec.parentModel&&e.values['result-year-label']===marker),'Marker parent');parentRef={providerId:provider.id,modelId:spec.parentModel,recordId:p.id};}
  else{const compositions=snapshot.project.providers.compositions.flatMap(p=>p.records);const composition=one(compositions.filter(c=>c.document.root.some(n=>n.componentId==='pinsel.faq-category'&&n.props.fragmentId===marker)),'Fragment owner');const mapping=one(snapshot.project.providers.mappings.flatMap(p=>p.records).filter(m=>m.document.composition.providerId==='files'&&m.document.composition.recordId===composition.id&&m.document.contentModel.recordId===spec.parentModel),'Parent mapping');parentRef=one(mapping.document.mode.query.pins,'Exact parent pin');}
 }
 assert.equal(parentRef.providerId,provider.id);assert.equal(parentRef.modelId,spec.parentModel);
 const parent=one(provider.entries.filter(e=>e.id===parentRef.recordId&&e.modelId===parentRef.modelId),'Qualified parent');
 assert.equal(child.lifecycle,'published');assert.equal(parent.lifecycle,'published');
 const question=child.values[field],secondary=child.values[kind==='faq'?'faq-item-answer':'result-entry-department'];
 assert.equal(typeof question,'string');assert(question.length);assert.equal(typeof secondary,'string');assert(secondary.length);
 const title=parent.values[kind==='faq'?'faq-group-title':'result-year-label'];assert.equal(typeof title,'string');
 const count=parent.values['result-year-declared-count'];if(kind==='results')assert(Number.isInteger(count));
 return {kind,fragment:kind==='results'?`year-${marker}`:marker,child:{providerId:provider.id,modelId:child.modelId,recordId:child.id},parent:parentRef,childText:question,secondary,title,heading:kind==='results'?`${title}（${count}件）`:title};
}
/** Operates on a real DOM from either native host frame or emitted static document. */
export async function assertOwnedFamilyDOM(root, expected, {expect,moved=false,oldFragment}={}) {
 const section=root.locator(`section[id="${expected.fragment}"]`);await expect(section).toHaveCount(1);
 await expect(section.locator('h2')).toHaveText(expected.heading);
 let destination=section;
 if(moved){assert(/^[a-z0-9-]+$/.test(oldFragment));destination=root.locator(`section[id="${oldFragment}"]`);await expect(destination).toHaveCount(1);await expect(section).not.toContainText(expected.childText);}
 if(expected.kind==='faq'){
  const summary=destination.locator('details > summary').filter({has:root.getByText(expected.childText,{exact:true})});await expect(summary).toHaveCount(1);
  const details=summary.locator('..');if(await details.getAttribute('open')===null)await summary.click();
  await expect(details).toHaveAttribute('open','');await expect(details.locator('.faq-list__answer p')).toHaveText(expected.secondary);await expect(details.locator('.faq-list__answer p')).toBeVisible();
 }else{
  const row=destination.locator('li.result-row').filter({has:root.getByText(expected.childText,{exact:true})});await expect(row).toHaveCount(1);await expect(row.locator('p')).toHaveText([expected.childText,expected.secondary]);await expect(row).toBeVisible();
 }
}
