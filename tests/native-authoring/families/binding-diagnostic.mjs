import assert from 'node:assert/strict';
import {getRecord} from './intents.mjs';
import {assertSelectedEditorUrl} from './structural-readback.mjs';

// This investigation only observes the retained Results parent. It cannot produce
// a sequence proof or authorize binding, publication, or any canonical write.
export function validateBindingDiagnostic(intent,snapshot){
 assert.equal(intent.kind,'mapping-binding-diagnostic');
 const record=getRecord(snapshot,'mappings',intent.owner);
 const composition=getRecord(snapshot,'compositions',record.document.composition);
 assert.equal(composition.document.root.length,1);
 const root=composition.document.root[0];
 assert.equal(root.componentId,'pinsel.year-section');
 assert.deepEqual(intent.target,{nodeId:root.id,prop:'label'});
 assert.equal(intent.title,'Results year');
 return record;
}
export async function bindingDiagnosticSample({page,ref,record,target,composition}){
 let qualified=true;try{assertSelectedEditorUrl(page.url(),'mappings',ref);}catch{qualified=false;}
 const status=await page.locator('.cms-topbar__status').evaluateAll(nodes=>({count:nodes.length,state:nodes.length===1?nodes[0].getAttribute('data-state'):null}));
 const names=page.locator('.cms-topbar').getByText(record.document.name,{exact:true});
 const nameCount=await names.count(),nameVisible=nameCount===1&&await names.isVisible();
 const targetState=await target.evaluateAll(nodes=>({count:nodes.length,enabled:nodes.length===1&&!nodes[0].matches(':disabled')&&nodes[0].getAttribute('aria-disabled')!=='true'}));
 const targetVisible=targetState.count===1&&await target.isVisible();
 const readiness={...composition.readiness};
 const predicates={qualified,saved:status.count===1&&status.state==='saved',nameVisible,targetVisible,targetEnabled:targetState.enabled,compositionSettled:readiness.pending===0&&readiness.outstanding===0};
 return {url:page.url(),status,nameCount,target:targetState,readiness,predicates,ready:Object.values(predicates).every(Boolean)};
}
export async function observeBindingDiagnostic({page,ref,record,target,composition,check,persist,now=()=>performance.now(),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const start=now();let sample,count=0;
 do{
  check();composition.check();
  sample=await bindingDiagnosticSample({page,ref,record,target,composition});count++;
  await persist({phase:'mapping-binding-diagnostic-sample',elapsedMs:now()-start,...sample});
  if(sample.ready)break;
  const remaining=180000-(now()-start);if(remaining<=0)break;
  await pause(Math.min(1000,remaining));
 }while(now()-start<=180000);
 check();composition.check();
 return {status:'MAPPING_BINDING_DIAGNOSTIC_OBSERVED',ready:sample.ready,samples:count,elapsedMs:now()-start,lastSample:sample};
}
