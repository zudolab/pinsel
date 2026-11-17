import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
/** Terminal read-only verification only. Pre-navigation networkidle stays unchanged.
 * UI assertions + exact preview identity precede this barrier. All authoritative
 * responses/challenges/retries must settle; unrelated GET activity is diagnostic.
 * The existing close fence/drain still owns requests arriving after this barrier.
 */
export async function settleTerminalReads({status,check,drain,persist,diagnostics,timeout=180000,quiet=500,interval=50}){
 assert([timeout,quiet,interval].every(Number.isFinite)&&timeout>0&&quiet>=0&&quiet<timeout&&interval>0);const deadline=performance.now()+timeout;let epoch,stableSince;
 await persist({phase:'terminal-read-settlement-start',diagnostics:diagnostics()});
 try{for(;;){
  check();const state=status();const now=performance.now();assert(now<deadline,'Terminal authoritative read settlement timed out');
  if(state.pending===0&&state.challenges===0&&state.busy===0){
   if(epoch!==state.epoch||stableSince===undefined){epoch=state.epoch;stableSince=now;}
   if(now-stableSince>=quiet){let timer;try{await Promise.race([drain(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Terminal authoritative drain timed out')),Math.max(1,deadline-performance.now()));})]);}finally{clearTimeout(timer);}check();const final=status();if(final.pending===0&&final.challenges===0&&final.busy===0&&final.epoch===epoch){await persist({phase:'terminal-read-settlement-complete',state:final,diagnostics:diagnostics()});return;}}
  }else{stableSince=undefined;epoch=state.epoch;}
  await delay(Math.min(interval,Math.max(1,deadline-performance.now())));
 }}catch(error){await persist({phase:'terminal-read-settlement-held',error:error.message,state:status(),diagnostics:diagnostics()});throw error;}
}
/** Request-specific diagnostics; no inferred cause or synthetic success response. */
export function observeRequestDiagnostics(page,persist){
 const requests=new Map();let id=0;const log=event=>void persist(event).catch(()=>{});
 const start=request=>{const item={id:++id,method:request.method(),path:new URL(request.url()).pathname,type:request.resourceType(),startedAt:Date.now()};requests.set(request,item);log({phase:'browser-request-start',...item});};
 const end=(request,failed=false)=>{const item=requests.get(request);if(!item)return;requests.delete(request);log({phase:failed?'browser-request-failed':'browser-request-finished',...item,elapsedMs:Date.now()-item.startedAt,...(failed?{failure:request.failure()}:{} )});};
 const finished=r=>end(r),failed=r=>end(r,true);page.on('request',start);page.on('requestfinished',finished);page.on('requestfailed',failed);
 return {snapshot:()=>[...requests.values()].map(item=>({...item,elapsedMs:Date.now()-item.startedAt})),dispose(){page.off('request',start);page.off('requestfinished',finished);page.off('requestfailed',failed);}};
}
