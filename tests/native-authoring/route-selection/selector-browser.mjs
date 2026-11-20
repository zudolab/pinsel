/** Run under the shared heavy guard/reaper. Disposable DOM only; no native server/store. */
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {ownerDetails} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath()});
try{
 const page=await browser.newPage();
 await page.setContent('<aside aria-label="Unrelated"><details open><summary>Component and owner</summary><code>wrong/owner/node</code></details></aside><aside aria-label="Selected component inspector"><details><summary>Component and owner</summary><p>Component: <code>pinsel.section</code></p><p>Owner: <code>files/home-section/section</code></p></details><details open><summary>Advanced saved properties</summary><code>unrelated</code></details></aside>');
 const inspector=page.getByRole('complementary',{name:'Selected component inspector',exact:true});
 assert.equal(await inspector.locator('details').count(),2);
 assert.equal(await inspector.locator('details').filter({has:inspector.locator('summary').filter({hasText:/^Component and owner$/})}).count(),0,'Regression: nested locator retains invalid ancestor');
 const details=ownerDetails(page,inspector);await expect(details).toHaveCount(1);await details.locator('summary').click();await expect(details.locator('code').filter({hasText:/^files\/home-section\/section$/})).toBeVisible();assert.equal(await details.locator('code').filter({hasText:/^unrelated$/}).count(),0);
 console.log('PASS actual imported ownerDetails selector; distinct advanced and unrelated owner sections excluded');
}finally{await browser.close();}
