import assert from 'node:assert/strict';
import {assertSelectedEditorUrl} from './structural-readback.mjs';

/** Definition resolution is asynchronous after Mapping selection. No navigation or write here. */
export async function mappingBindingReadiness({page,expect,ref,record,target,composition,check,persist}) {
  assert.equal(record.id,ref.recordId);
  await persist({phase:'mapping-binding-readiness-start',ref});
  await expect.poll(async()=>{
    check();composition.check();
    try {assertSelectedEditorUrl(page.url(),'mappings',ref);} catch {return false;}
    if(await page.locator('.cms-topbar__status').getAttribute('data-state')!=='saved')return false;
    if(!await page.locator('.cms-topbar').getByText(record.document.name,{exact:true}).isVisible())return false;
    if(!await target.isVisible()||!await target.isEnabled())return false;
    const {pending,outstanding}=composition.readiness;
    return pending===0&&outstanding===0;
  },{timeout:180000,message:'Qualified Mapping and exact binding target must finish resolving'}).toBe(true);
  check();composition.check();composition.assertSettled();
  assertSelectedEditorUrl(page.url(),'mappings',ref);
  await persist({phase:'mapping-binding-readiness-verified',ref,recordId:record.id,readiness:composition.readiness});
}
