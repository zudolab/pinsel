import assert from 'node:assert/strict';
import {bindingDiagnosticSample} from './binding-diagnostic.mjs';
/** The action is inside the heading. Anchor it directly, never every ancestor section. */
export function orderedPinsChoose(page){
 return page.getByRole('heading',{name:'Ordered pins Choose',exact:true}).getByRole('button',{name:'Choose',exact:true});
}
export async function mappingPinsReadiness({page,expect,ref,record,composition,check,persist}){
 assert.equal(record.id,ref.recordId);assert.equal(record.document.mode.kind,'collection');
 const target=orderedPinsChoose(page);
 await persist({phase:'mapping-pins-readiness-start',ref});
 await expect.poll(async()=>{
  check();composition.check();
  const sample=await bindingDiagnosticSample({page,ref,record,target,composition});
  const mode=await page.getByLabel('Mapping mode',{exact:true}).evaluateAll(nodes=>nodes.length===1?nodes[0].value:null);
  return sample.ready&&mode==='collection';
 },{timeout:180000,message:'Qualified saved collection Mapping and exact Ordered pins Choose must resolve'}).toBe(true);
 check();composition.check();composition.assertSettled();
 await persist({phase:'mapping-pins-readiness-verified',ref,recordId:record.id,readiness:composition.readiness});
 return target;
}
