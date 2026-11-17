import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {waitForCompositionReadiness} from '../static/composition-readiness.mjs';
/** Nonwaiting DOM observation: do not hide a second locator timeout inside the bound. */
export async function mappingCreateState(page){
 const dialogs=await page.getByRole('dialog',{name:'Create mapping',exact:true}).evaluateAll(nodes=>nodes.map(dialog=>{
  const field=name=>{const labels=[...dialog.querySelectorAll('label')].filter(x=>x.textContent.trim()===name);if(labels.length!==1)return null;const label=labels[0],control=label.control??label.querySelector('input,select');if(!control)return null;return{value:control.value,enabled:!control.disabled,options:control.tagName==='SELECT'?[...control.options].filter(o=>!o.disabled).map(o=>o.value):undefined};};
  const buttons=[...dialog.querySelectorAll('button')].filter(x=>x.textContent.trim()==='Create');return{name:field('Name'),content:field('Content model'),composition:field('Composition'),create:buttons.length===1&&!buttons[0].disabled};
 }));return{url:page.url(),dialogs};
}
export function assertMappingCreateState(state,{base,intent}){
 assert.equal(intent.kind,'mapping-create');assert.equal(state.url,`${base}/mapping`,'Creation navigation changed');assert.equal(state.dialogs.length,1,'One exact Create mapping dialog required');const d=state.dialogs[0];
 assert(d.name?.enabled&&d.name.value===intent.name,'Exact enabled name required');
 for(const[key,ref]of [['content',intent.contentModel],['composition',intent.composition]]){const expected=`${ref.providerId}/${ref.recordId}`,field=d[key];assert(field?.enabled&&field.value===expected&&field.options.filter(x=>x===expected).length===1,`Exact enabled qualified ${key} option required`);}
 assert(d.create,'Create must be enabled');
}
/** Only creation replaces browser-wide networkidle. All global Composition reads,
 * output challenges, drain checks and canonical admission still apply. */
export async function mappingCreateReadiness({page,base,intent,composition,check,persist,timeout=180000,interval=50,probe=()=>mappingCreateState(page),now=()=>performance.now(),sleep=delay}){
 const deadline=now()+timeout;assert(timeout>0&&interval>0);const remaining=()=>{assert(now()<deadline,'Mapping create readiness timed out');return Math.max(1,deadline-now());};
 await persist({phase:'mapping-create-readiness-start'});
 for(;;){check();composition.check();const state=await probe();let ready=false;try{assertMappingCreateState(state,{base,intent});ready=true;}catch{}if(ready)break;await sleep(Math.min(interval,remaining()));}
 await waitForCompositionReadiness({check:()=>{check();composition.check();},get readiness(){return composition.readiness;},assertSettled:()=>composition.assertSettled()},{timeout:remaining(),interval});
 let timer;try{await Promise.race([composition.drain(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Mapping create drain timed out')),remaining());})]);}finally{clearTimeout(timer);}remaining();check();composition.check();composition.assertSettled();
 // Selection/navigation drift during provider settlement must refuse, not silently
 // wait for a later different dialog. The exact write gate revalidates payload.
 const state=await probe();assertMappingCreateState(state,{base,intent});check();composition.assertSettled();
 await persist({phase:'mapping-create-readiness-settled',state,readiness:composition.readiness});
}
