import assert from 'node:assert/strict';
import {FAMILY} from './family-graph.mjs';
/** Caller installs a read-only request gate before navigation and captures before/after. */
export async function verifyFamilyRendering(page,{base,kind,marker,childText,expect,present=true,oldFragment}){
 assert(FAMILY[kind]);assert(/^[a-z0-9-]+$/.test(marker));const fragment=kind==='results'?`year-${marker}`:marker;
 await page.goto(`${base}/composer?native=1&visitor=${encodeURIComponent('/'+kind)}`);await page.getByText('Saved snapshot rendered',{exact:true}).waitFor({timeout:180000});
 const select=page.getByRole('button',{name:'Select components',exact:true});if(await select.count())await select.click();await expect(page.getByRole('button',{name:'Browse page',exact:true})).toBeVisible();
 const frame=page.frameLocator('iframe[title="Host rendered page"]');const section=frame.locator(`[id="${fragment}"]`);await expect(section).toHaveCount(1);await expect(frame.locator(`a[href="#${fragment}"]`)).toHaveCount(1);
 if(present)await expect(section).toContainText(childText);else{assert(oldFragment&&/^[a-z0-9-]+$/.test(oldFragment));await expect(section).not.toContainText(childText);await expect(frame.locator(`[id="${oldFragment}"]`)).toContainText(childText);}
 await frame.locator(`a[href="#${fragment}"]`).click();await expect.poll(async()=>frame.locator('html').evaluate(el=>el.ownerDocument.location.hash)).toBe('#'+fragment);
 if(kind==='faq'&&present){const summary=section.locator('summary').filter({hasText:childText});await expect(summary).toHaveCount(1);const details=summary.locator('..');await expect(details).not.toHaveAttribute('open','');await summary.click();await expect(details).toHaveAttribute('open','');}
}
