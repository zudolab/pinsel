import assert from 'node:assert/strict';
/** Catalog reads may precede the next UI request before their journal settles.
 * Queue original requests; never replay one, and never admit two pending writes. */
export function orderedReleaseGate({gate,persist}){
 let tail=Promise.resolve(),failure,canonicalPending=false;const pending=new Set();
 const handle=route=>{let wire,read=false,owns=false;try{assert(!failure,'Release queue held');wire=route.request().postDataJSON();read=['list','get'].includes(wire?.request?.operation);if(!read){assert(!canonicalPending,'Unexpected concurrent release operation');canonicalPending=true;owns=true;}}
 catch(error){failure??=error;const rejected=(async()=>{try{await persist({phase:'release-queue-held',wire,error:error.message});}finally{await route.abort().catch(()=>{});}})();pending.add(rejected);rejected.finally(()=>pending.delete(rejected)).catch(()=>{});return rejected;}
 const work=tail.then(async()=>{try{assert(!failure,'Release queue held before dispatch');await gate.handle(route);gate.check();}catch(error){failure??=error;await route.abort().catch(()=>{});await persist({phase:'release-queue-held',wire,error:error.message}).catch(()=>{});}finally{if(owns)canonicalPending=false;}});tail=work.catch(()=>{});pending.add(work);work.finally(()=>pending.delete(work)).catch(()=>{});return work;};
 return{handle,check(){if(failure)throw failure;gate.check();},async drain(){while(pending.size)await Promise.allSettled([...pending]);await gate.drain();if(failure)throw failure;}};
}
