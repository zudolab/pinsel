// Isolated DOM fixture only. No server, navigation, provider calls or authoring state.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {orderedPinsChoose} from './pins-readiness.mjs';
const {chromium,expect}=createRequire(import.meta.url)('@playwright/test');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 const html=process.argv[2]?await readFile(process.argv[2],'utf8'):'<section><h3><span>Query</span><span>Collection</span></h3><section><h3><span>Ordered pins</span><span><button>Choose</button></span></h3></section></section><section><h3>Other</h3><button>Choose</button></section>';
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Ordered pins',exact:true})).toHaveCount(0);
 const target=orderedPinsChoose(page);await expect(target).toHaveCount(1);await expect(target).toBeEnabled();
 assert.equal(await target.evaluate(node=>node.closest('h3').textContent.replace(/\s+/g,' ').trim()).then(text=>text.replace(/\s/g,'')),'OrderedpinsChoose');
 console.log(JSON.stringify({status:'PINS_SELECTOR_FIXTURE_VERIFIED',source:process.argv[2]??'nested-section-fixture',originalHeadingCount:0,correctedChooseCount:1,clicked:false}));
}finally{await browser.close();}
