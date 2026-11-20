import {waitForCompositionReadiness} from './composition-readiness.mjs';
/** Browser idle precedes the gate barrier: an empty pending set alone is not navigation readiness. */
export async function settleBrowserReads(page,gate,{persist,check=()=>{},boundary}){
 check();gate.check();await persist({phase:'browser-quiescence-start',boundary});
 // A post-reload snapshot is already inside originalResponse, which has forwarded
 // the route and is waiting for request.response(). networkidle will not occur
 // while that response is outstanding, and Playwright does not settle the
 // response while networkidle is the current page wait. The phase26 continue()
 // order does not cover this overlap. Drain a paused or in-flight route first.
 if((gate.readiness?.pending??0)>0)await gate.drain();
 check();
 await page.waitForLoadState('networkidle',{timeout:180000});
 await waitForCompositionReadiness(gate);await gate.drain();check();gate.check();gate.assertSettled();
 await persist({phase:'browser-quiescence-settled',boundary,readiness:gate.readiness});
}
