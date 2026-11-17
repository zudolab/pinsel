// Explicit small browser fixture, never a native authoring server or saved workspace.
// Run only under the shared heavy guard/reaper; excluded from pure *.test.mjs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {repoRoot} from './config.mjs';
import {assertOwnedFamilyDOM} from './owned-render.mjs';
const [artifacts]=process.argv.slice(2);assert(artifacts?.startsWith('/'));await mkdir(artifacts);
const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');
const browser=await chromium.launch({headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath()});const page=await browser.newPage();const results=[];let failed=false;
try{
 for(const framed of [false,true])for(const kind of ['results','faq'])for(const moved of [false,true]){
  const expected={kind,fragment:'family-new',heading:'Owned parent',childText:'Distinct child',secondary:'Distinct detail'};
  const child=kind==='results'?'<ul><li class="result-row"><p>Distinct child</p><p>Distinct detail</p></li></ul>':'<details><summary><span>Distinct child</span></summary><div class="faq-list__answer"><p>Distinct detail</p></div></details>';
  const html=`<section id="family-new"><h2>Owned parent</h2>${moved?'':child}</section><section id="family-old"><h2>Old parent</h2>${moved?child:''}</section>`;
  await page.setContent(framed?'<iframe id="preview"></iframe>':html);
  if(framed)await page.locator('iframe').evaluate((frame,content)=>frame.srcdoc=content,html);
  const root=framed?page.frameLocator('#preview'):page;
  try{await assertOwnedFamilyDOM(root,expected,{expect,moved,oldFragment:'family-old'});results.push({framed,kind,moved,status:'PASS'});}catch(error){failed=true;results.push({framed,kind,moved,status:'FAIL',error:error.message});}
  if(!moved){
   const wrongOwner=`<section id="family-new"><h2>Owned parent</h2></section><section id="other-owner">${child}</section>`;
   await page.setContent(framed?'<iframe id="preview"></iframe>':wrongOwner);if(framed)await page.locator('iframe').evaluate((frame,content)=>frame.srcdoc=content,wrongOwner);
   try{await assert.rejects(assertOwnedFamilyDOM(framed?page.frameLocator('#preview'):page,expected,{expect:expect.configure({timeout:500})}),/toHaveCount/);results.push({framed,kind,case:'child belongs to other owner',status:'EXPECTED_REFUSAL'});}catch(error){failed=true;results.push({framed,kind,case:'child belongs to other owner',status:'FAIL',error:error.message});}
  }
 }
}finally{await browser.close();await writeFile(join(artifacts,'results.json'),JSON.stringify(results,null,2),{flag:'wx'});}
assert(!failed,'Owned-family DOM fixture failed; inspect results.json');console.log(`PASS ${results.length} actual Page/FrameLocator owner assertions`);
