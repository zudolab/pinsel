import {settleBrowserReads} from '../static/browser-quiescence.mjs';
/** Outside request handlers: draining the tracked lane inside itself would deadlock. */
export function createHeaderReadiness(page,{composition,settlement,persist,check}){
 return async boundary=>{
  check();await settlement.beforeAdvance();
  await settleBrowserReads(page,composition,{persist,check:()=>{check();if(settlement.held)throw settlement.held;},boundary});
  await settlement.beforeAdvance();check();composition.check();composition.assertSettled();
 };
}
