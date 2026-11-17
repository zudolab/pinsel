import {waitForCompositionReadiness} from './composition-readiness.mjs';
/** Browser idle precedes the gate barrier: an empty pending set alone is not navigation readiness. */
export async function settleBrowserReads(page,gate,{persist,check=()=>{},boundary}){
 check();gate.check();await persist({phase:'browser-quiescence-start',boundary});
 await page.waitForLoadState('networkidle',{timeout:180000});
 await waitForCompositionReadiness(gate);await gate.drain();check();gate.check();gate.assertSettled();
 await persist({phase:'browser-quiescence-settled',boundary,readiness:gate.readiness});
}
