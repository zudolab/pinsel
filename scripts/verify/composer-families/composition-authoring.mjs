import assert from'node:assert/strict';
import{compositionDerivedReadGate,outputExchange}from'./composition-output.mjs';
import{originalResponse}from'./original-request.mjs';
/** One exact reviewed put; any generated-output continuation is challenge-bound. */
export function compositionAuthoringGate({page,snapshot,persist,admit,accept}){
 const current=structuredClone(snapshot),records=current.project.providers.compositions.find(p=>p.id==='files').records;
 const reads=compositionDerivedReadGate({page,snapshot:current,persist});let tail=Promise.resolve(),failure,exchange,logicalInput,proposed,committed=false;const pending=new Set();
 const handle=route=>{const work=tail.then(async()=>{let input;try{assert(!failure,'Composition authoring phase held');const request=route.request();assert.equal(new URL(request.url()).pathname,'/__zudo_composer_file_provider');assert.equal(request.headers()['x-zudo-composer-workspace'],snapshot.workspaceId);input=request.postDataJSON();
  if(['snapshot','list','get'].includes(input.operation)){await reads.handle(route);reads.check();return;}
  assert.equal(input.operation,'put','Only the reviewed ordinary Composition put is permitted');assert(!committed,'Second canonical put refused');assert.deepEqual(Object.keys(input).sort(),['operation','outputsById','record']);reads.assertSettled();
  if(!exchange){assert.deepEqual(input.outputsById,{});proposed=structuredClone(admit(input,request));logicalInput=structuredClone(input);const expected=records.filter(r=>r.id!==proposed.id).concat(proposed);exchange=outputExchange({records:expected,targetIds:expected.map(r=>r.id),input});}
  else{assert.deepEqual(input.record,logicalInput.record);exchange.continuation(input);}
  await persist({phase:'composition-put-before-dispatch',input,continuation:exchange.phase==='continuing'});const response=await originalResponse(page,route);await persist({phase:'composition-put-response',input,...response});assert.equal(response.status,200);exchange.response(response.body);
  if(exchange.phase==='complete'){assert.equal(response.body.result?.canonical?.status,'saved');committed=true;const index=records.findIndex(r=>r.id===proposed.id);if(index<0)records.push(proposed);else records[index]=proposed;accept(proposed,response.body);}
 }catch(error){failure??=error;await route.abort().catch(()=>{});await persist({phase:'composition-put-held',input,error:error.message}).catch(()=>{});}});tail=work.catch(()=>{});pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;};
 return{handle,check(){if(failure)throw failure;reads.check();},async drain(){while(pending.size)await Promise.allSettled([...pending]);await reads.drain();if(failure)throw failure;},get committed(){return committed;}};
}
