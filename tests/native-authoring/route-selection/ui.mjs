import assert from 'node:assert/strict';
import {selectionCandidates,targetEvidence} from './proof.mjs';
/** No edit controls, links, forms, writes or synthetic renderer are invoked. */
export async function verifyRouteSelection(page,{base,snapshot,intent,expect,getPreview,persist,shot}){
 await page.goto(`${base}/composer?native=1&visitor=${encodeURIComponent(intent.pathname)}`);
 await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});await expect.poll(()=>!!getPreview(),{timeout:180000}).toBe(true);
 await expect(page.getByRole('button',{name:'Select components',exact:true})).toHaveAttribute('aria-pressed','true');
 const preview=getPreview();await expect(page.locator('iframe[title="Host rendered page"]')).toHaveAttribute('src',preview.documentUrl);
 const frame=page.frameLocator('iframe[title="Host rendered page"]');const renderedIds=await frame.locator('[data-composer-target]').evaluateAll(els=>els.map(el=>el.getAttribute('data-composer-target')));
 const {target,other}=selectionCandidates(snapshot,intent,preview,renderedIds);
 const inspect=async selected=>{
  await expect(frame.locator('[data-composer-selected]')).toHaveCount(1);await expect(frame.locator('[data-composer-selected]')).toHaveAttribute('data-composer-target',selected.renderedNodeId);
  const tree=page.getByRole('tree',{name:'Page components',exact:true});const row=tree.getByRole('treeitem',{selected:true});await expect(row).toHaveCount(1);await expect(row).toHaveAttribute('aria-label',selected.presentation.label);
  const inspector=page.getByRole('complementary',{name:'Selected component inspector',exact:true});await expect(inspector.getByRole('heading',{name:selected.presentation.label,exact:true})).toBeVisible();const details=inspector.locator('details');if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
  await expect(details.locator('code').filter({hasText:new RegExp('^'+RegExp.escape(`${selected.providerId}/${selected.recordId}/${selected.nodeId}`)+'$')})).toHaveCount(1);
  await expect(details.locator('code').filter({hasText:new RegExp('^'+RegExp.escape(selected.componentId)+'$')})).toHaveCount(1);
  const link=inspector.getByRole('link',{name:'Edit owning composition',exact:true});await expect(link).toHaveCount(1);const url=new URL(await link.getAttribute('href'),base);assert.equal(url.pathname,'/composer');assert.equal(url.searchParams.get('provider'),selected.providerId);assert.equal(url.searchParams.get('composition'),selected.recordId);
 };
 const clickRendered=async selected=>{await frame.locator('[data-composer-target]').evaluateAll((els,id)=>{const found=els.filter(el=>el.getAttribute('data-composer-target')===id);if(found.length!==1)throw Error('Rendered target changed');found[0].click();},selected.renderedNodeId);await inspect(selected);};
 await clickRendered(target);await persist({phase:'preview-to-tree-inspector',target:targetEvidence(target),identity:preview.identity});await shot('preview-selected');
 await clickRendered(other);await page.getByRole('tree',{name:'Page components',exact:true}).getByRole('treeitem',{name:target.presentation.label,exact:true}).press('Enter');await inspect(target);
 assert.deepEqual(getPreview().identity,preview.identity,'Preview revision changed during selection');await expect(page.locator('iframe[title="Host rendered page"]')).toHaveAttribute('src',preview.documentUrl);
 await persist({phase:'tree-to-inspector-owner',target:targetEvidence(target),via:targetEvidence(other),identity:preview.identity});await shot('tree-reselected');
 return{pathname:intent.pathname,identity:preview.identity,target:targetEvidence(target),other:targetEvidence(other),roundtrip:['preview','other-preview','tree'],documentUrl:preview.documentUrl};
}
