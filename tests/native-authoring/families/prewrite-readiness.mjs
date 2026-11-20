import {settleBrowserReads} from '../static/browser-quiescence.mjs';
import {waitForCompositionReadiness} from '../static/composition-readiness.mjs';
/** UI barriers run outside observers; admission waits before entering either serial
 * write gate, so a challenged read's continuation is free to complete. */
export function familyPrewriteReadiness({page,composition,persist,check,hold}){
 const pending=new Set();let failure;
 return{
  async beforeGesture(boundary){check();await settleBrowserReads(page,composition,{persist,check,boundary});check();},
  admit(route,dispatch,{writeContinuation=false,priorResponse,diagnostic}={}){
   const work=(async()=>{try{
    check();
    if(diagnostic)await persist({phase:'family-prewrite-admission-observed',...diagnostic});
    if(priorResponse)await priorResponse;
    check();
    const continuation=typeof writeContinuation==='function'?writeContinuation():writeContinuation;
    if(diagnostic)await persist({phase:'family-prewrite-admission-classified',...diagnostic,continuation,readiness:composition.readiness});
    // Only the existing Composition write gate can validate this continuation.
    // Waiting on its own outstanding write-output challenge would deadlock.
    if(!continuation)await waitForCompositionReadiness({check:()=>{check();composition.check();},get readiness(){return composition.readiness;},assertSettled:()=>composition.assertSettled()});
    check();await dispatch();
   }catch(error){failure??=error;hold(error);await persist({phase:'family-prewrite-held',error:error.message}).catch(()=>{});await route.abort().catch(()=>{});}})();
   pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;
  },
  async drain(){while(pending.size)await Promise.allSettled([...pending]);if(failure)throw failure;},
 };
}
export function isChallengedWriteContinuation(gate,input){
 return input?.operation==='put'&&gate.awaitingWriteOutput===true&&input.outputsById&&typeof input.outputsById==='object'&&!Array.isArray(input.outputsById)&&Object.keys(input.outputsById).length>0;
}

/** Called at route arrival, before enqueuing this request in the serial gate.
 * The prior original response journal stays durable before reclassification. */
export function compositionWriteAdmission(gate,input){
 return{
  priorResponse:gate.joinPriorResponse(),
  writeContinuation:()=>isChallengedWriteContinuation(gate,input),
  diagnostic:{operation:input?.operation,recordId:input?.record?.id,outputIds:Object.keys(input?.outputsById??{}),observedChallenge:gate.awaitingWriteOutput,observedReadiness:gate.readiness},
 };
}
