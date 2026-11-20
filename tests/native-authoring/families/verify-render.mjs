import {assertChildDOMOrder} from './order-followup.mjs';
import assert from 'node:assert/strict';
import {ownedFamilyExpectation,assertOwnedFamilyDOM} from './owned-render.mjs';
import {FAMILY} from './family-graph.mjs';
import{isFragmentId}from'./fragment-id.mjs';
/** Caller installs a read-only request gate before navigation and captures before/after. */
export async function verifyFamilyRendering(page,{base,kind,marker,childText,expect,present=true,oldFragment,snapshot,family,secondChild}){
 assert(snapshot,'Accepted capture required');const owned=ownedFamilyExpectation(snapshot,{kind,marker,childText,family});
 assert(FAMILY[kind]);assert(/^[a-z0-9-]+$/.test(marker));const fragment=kind==='results'?`year-${marker}`:marker;
 await page.goto(`${base}/composer?native=1&visitor=${encodeURIComponent('/'+kind)}`);await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});
 const select=page.getByRole('button',{name:'Select components',exact:true});if(await select.count())await select.click();await expect(page.getByRole('button',{name:'Browse page',exact:true})).toBeVisible();
 const frame=page.frameLocator('iframe[title="Host rendered page"]');const section=frame.locator(`[id="${fragment}"]`);await expect(section).toHaveCount(1);await expect(frame.locator(`a[href="#${fragment}"]`)).toHaveCount(1);
 if(present)await expect(section).toContainText(childText);else{assert(isFragmentId(oldFragment));await expect(section).not.toContainText(childText);await expect(frame.locator(`[id="${oldFragment}"]`)).toContainText(childText);}
 await frame.locator(`a[href="#${fragment}"]`).click();await expect.poll(async()=>frame.locator('html').evaluate(el=>el.ownerDocument.location.hash)).toBe('#'+fragment);
 await assertOwnedFamilyDOM(frame,owned,{expect,moved:!present,oldFragment});
 if(secondChild){assert(present&&family);await assertChildDOMOrder(frame,snapshot,family,kind,secondChild,expect);}
}
