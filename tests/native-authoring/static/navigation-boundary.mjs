import {settleBrowserReads} from './browser-quiescence.mjs';
import {drainAll} from '../families/original-request.mjs';
/** Call from UI orchestration, never from a lane it drains. */
export function navigationBoundary({page,composition,lanes,persist,check}){
 return async boundary=>{
  check();await settleBrowserReads(page,composition,{persist,check,boundary});
  await drainAll(...lanes,composition);check();composition.check();composition.assertSettled();
 };
}
/** Failure to settle must still close and drain through the original owned lifecycle. */
export function closeAfterNavigation(boundary,close){
 return async context=>{let failure;try{await boundary('before-browser-close');}catch(error){failure=error;}
  try{await close(context);}catch(error){failure??=error;}if(failure)throw failure;
 };
}
