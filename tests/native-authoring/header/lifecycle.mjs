/** Always drain before and after browser close, preserving the first failure. */
export async function closeObserved(context,{settlement,composition,assertResult}){
 let error;for(const action of [()=>settlement.drain(),()=>composition.drain(),()=>context.close(),()=>settlement.drain(),()=>composition.drain(),()=>settlement.beforeAdvance(),()=>composition.assertSettled(),assertResult]){try{await action();}catch(cause){error??=cause;}}if(error)throw error;
}
