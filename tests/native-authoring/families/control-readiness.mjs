import assert from 'node:assert/strict';
import {assertSelectedEditorUrl} from './structural-readback.mjs';

/** Read-only predicate over a single exact control; no locator action timeout. */
export async function controlReady({target,option,value}) {
 if(!await target.isVisible())return false;
 return target.evaluateAll((nodes,expected)=>{
  if(nodes.length!==1)return false;
  const node=nodes[0];
  if(node.matches(':disabled')||node.getAttribute('aria-disabled')==='true')return false;
  if(expected.option!==undefined&&Array.from(node.options??[]).filter(o=>o.value===expected.option&&!o.disabled).length!==1)return false;
  return expected.value===undefined||node.value===expected.value;
 },{option,value});
}
/** Initial controls require Saved. A deliberate first gesture may instead leave
 * a dirty draft: never wait for (or cause) a save between its two local edits. */
export async function mappingControlReadiness({page,expect,ref,record,controls,composition,check,persist,draft=false,collection=false,boundary}) {
 assert.equal(record.id,ref.recordId);assert(controls.length);assert(boundary);
 if(collection)assert.equal(record.document.mode.kind,'collection');
 await persist({phase:'mapping-control-readiness-start',ref,boundary,draft});
 await expect.poll(async()=>{
  check();composition.check();
  try{assertSelectedEditorUrl(page.url(),'mappings',ref);}catch{return false;}
  const status=await page.locator('.cms-topbar__status').evaluateAll(nodes=>nodes.length===1?nodes[0].getAttribute('data-state'):null);
  assert(status!=='failed','Mapping reports an error before gesture');
  if(status!==(draft?'unsaved':'saved'))return false;
  if(!await page.locator('.cms-topbar').getByText(record.document.name,{exact:true}).isVisible())return false;
  if(collection&&await page.getByLabel('Mapping mode',{exact:true}).evaluateAll(nodes=>nodes.length===1?nodes[0].value:null)!=='collection')return false;
  for(const control of controls)if(!await controlReady(control))return false;
  const {pending,outstanding}=composition.readiness;return pending===0&&outstanding===0;
 },{timeout:180000,message:`Qualified Mapping controls must resolve: ${boundary}`}).toBe(true);
 check();composition.check();composition.assertSettled();assertSelectedEditorUrl(page.url(),'mappings',ref);
 await persist({phase:'mapping-control-readiness-verified',ref,boundary,draft,readiness:composition.readiness});
}
