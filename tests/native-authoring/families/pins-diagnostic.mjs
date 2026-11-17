import assert from 'node:assert/strict';
import {getRecord} from './intents.mjs';
import {bindingDiagnosticSample} from './binding-diagnostic.mjs';

export function validatePinsDiagnostic(intent,snapshot){
 assert.equal(intent.kind,'mapping-pins-diagnostic');
 assert(intent.diagnosticEvidencePath?.startsWith('/'));
 const record=getRecord(snapshot,'mappings',intent.owner);
 assert.equal(record.document.mode.kind,'collection');
 assert.equal(record.document.contentModel.providerId,'content-filesystem');
 assert.equal(record.document.contentModel.recordId,'result-year');
 const composition=getRecord(snapshot,'compositions',record.document.composition);
 assert.equal(composition.document.root.length,1);
 assert.equal(composition.document.root[0].componentId,'pinsel.year-section');
 return record;
}
export function validatePinsEvidence(intent,snapshot,evidence){
 validatePinsDiagnostic(intent,snapshot);
 assert.deepEqual(evidence.before,snapshot);assert.deepEqual(evidence.after,snapshot);
 const failed=evidence.bundle.intent;
 assert.deepEqual(failed,evidence.intent);assert.equal(failed.kind,'record-edit');
 assert.equal(failed.sequence.index,16);assert.equal(failed.sequence.step,'parent-pin');
 assert.equal(failed.action.kind,'pins');assert.deepEqual(failed.owner,intent.owner);
 assert.equal(failed.captureDigest,snapshot.digest);
 assert.equal(evidence.history.length,16);
 assert.equal(evidence.lastProof.intent.sequence.index,15);
 assert.equal(evidence.lastProof.afterDigest,snapshot.digest);
 assert.deepEqual(evidence.lastCapture,snapshot);
 assert(evidence.events.some(e=>e.phase==='held'));
 assert(!evidence.events.some(e=>['request-before-dispatch','request-response'].includes(e.phase)),'Original pin write dispatched');
 return true;
}
export async function pinsDiagnosticSample({page,ref,record,composition}){
 const sections=page.locator('section').filter({has:page.getByRole('heading',{name:'Ordered pins',exact:true})});
 const target=sections.getByRole('button',{name:'Choose',exact:true});
 const common=await bindingDiagnosticSample({page,ref,record,target,composition});
 const sectionCount=await sections.count();
 const mode=await page.getByLabel('Mapping mode',{exact:true}).evaluateAll(nodes=>({count:nodes.length,value:nodes.length===1?nodes[0].value:null}));
 const queryCount=await page.getByRole('heading',{name:'Query',exact:true}).count();
 const headings=await page.locator('h3').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,ariaLabel:node.getAttribute('aria-label'),labelledBy:node.getAttribute('aria-labelledby')})));
 const originalHeadingCount=await page.getByRole('heading',{name:'Ordered pins',exact:true}).count();
 const headingWithActionCount=await page.getByRole('heading',{name:'Ordered pins Choose',exact:true}).count();
 const allChooseCount=await page.getByRole('button',{name:'Choose',exact:true}).count();
 const unavailable=page.getByText('Collection source unavailable',{exact:true});
 const unavailableCount=await unavailable.count();
 const predicates={...common.predicates,collectionMode:mode.count===1&&mode.value==='collection',onePinsSection:sectionCount===1};
 return {...common,mode,queryCount,headings,originalHeadingCount,headingWithActionCount,allChooseCount,sectionCount,sourceUnavailable:{count:unavailableCount,visible:unavailableCount===1&&await unavailable.isVisible()},predicates,ready:Object.values(predicates).every(Boolean)};
}
export async function observePinsDiagnostic({page,ref,record,composition,check,persist,now=()=>performance.now(),pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 const start=now();let sample,count=0;
 do{
  check();composition.check();sample=await pinsDiagnosticSample({page,ref,record,composition});count++;
  await persist({phase:'mapping-pins-diagnostic-sample',elapsedMs:now()-start,...sample});
  if(sample.ready)break;
  const remaining=180000-(now()-start);if(remaining<=0)break;
  await pause(Math.min(1000,remaining));
 }while(now()-start<=180000);
 check();composition.check();
 return {status:'MAPPING_PINS_DIAGNOSTIC_OBSERVED',ready:sample.ready,samples:count,elapsedMs:now()-start,lastSample:sample};
}
