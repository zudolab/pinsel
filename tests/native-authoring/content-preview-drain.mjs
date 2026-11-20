import assert from 'node:assert/strict';
import {contentPreviewOperations,assertContentPreviewRequest,assertContentPreviewHeaders,contentPreviewResponseTracker} from './native-preview-reads.mjs';
/** Passive original-request lifetime; never fetch, retry, flush, or mutate. */
export function observeContentPreviewRequests(page,snapshot,{record=()=>{},timeout=180000}={}){
 const tracker=contentPreviewResponseTracker(snapshot),pending=new Map();let failure,closing=false,wake;
 const changed=()=>{wake?.();wake=undefined;};
 const fail=error=>{failure??=error;changed();};
 const check=()=>{if(failure)throw failure;};
 const request=input=>{
  if(new URL(input.url()).pathname!=='/__zudo-native-edit')return;
  let body;try{body=input.postDataJSON();if(!contentPreviewOperations.has(body?.operation))return;
   assert(!closing,'Saved Content read dispatched during browser close');assertContentPreviewRequest(body,snapshot.workspaceId);assertContentPreviewHeaders(input.headers());
   pending.set(input,{body,response:false});record('content-preview-request-start',{input:body});changed();
  }catch(error){fail(error);}
 };
 const response=async result=>{
  const input=result.request(),item=pending.get(input);if(!item)return;
  try{assert(!item.response,'Duplicate original saved Content response');item.response=true;
   const completed=await result.finished();if(completed)throw completed;
   const body=await result.json();const evidence=tracker.observe(item.body,{status:result.status(),body},input.headers());record('content-preview-observed',{input:item.body,status:result.status(),evidence});
  }catch(error){fail(error);}finally{pending.delete(input);changed();}
 };
 const failed=input=>{if(!pending.has(input))return;pending.delete(input);fail(Error(`Original saved Content read failed: ${input.failure()?.errorText??'unknown transport failure'}`));};
 page.on('request',request);page.on('response',response);page.on('requestfailed',failed);
 async function drain(){
  let timer;const expired=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Original saved Content reads did not settle within ${timeout}ms; no replay`)),timeout);});
  try{while(pending.size||tracker.pendingCount()){check();await Promise.race([new Promise(resolve=>{wake=resolve;}),expired]);}check();tracker.finish();record('content-preview-drained',{pending:pending.size,busy:tracker.pendingCount()});}
  catch(error){fail(error);throw error;}finally{clearTimeout(timer);wake=undefined;}
 }
 return {check,drain,async navigate(action){await drain();return action();},async close(action){try{await drain();}finally{closing=true;await action();}check();assert.equal(pending.size,0,'Original saved Content request remained at close');tracker.finish();},state:()=>({pending:pending.size,busy:tracker.pendingCount(),failed:Boolean(failure)})};
}
