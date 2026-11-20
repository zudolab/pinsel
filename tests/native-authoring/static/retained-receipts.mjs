import assert from 'node:assert/strict';
import {isDeepStrictEqual as equal} from 'node:util';
const successful=e=>{assert.equal(e.status,200);assert.equal(e.body?.ok,true);};
const one=(events,predicate)=>{const found=events.filter(predicate);assert.equal(found.length,1,'One exact original event required');return found[0];};
export function assertContentReceipt(events,result,before){
 assert(before,'Original capture required');
 assert.equal(result.ref.providerId,'content-filesystem');assert.equal(result.ref.modelId,'page-copy');
 const qualified=r=>{assert.equal(r.id,result.ref.recordId);assert.equal(r.modelId,result.ref.modelId);};
 qualified(result.record);
 if(result.domain==='content-edit'){
  const request=one(events,e=>e.phase==='request-before-dispatch');assert.equal(request.endpoint,'/__zudo_composer_content_provider');qualified(request.input.record);assert.deepEqual(request.wire,request.input);
  const response=one(events,e=>e.phase==='request-response');assert(events.indexOf(request)<events.indexOf(response));assert.deepEqual(response.input,request.input);successful(response);
  assert.deepEqual(result.record,{...request.input.record,generation:before.tokens.content+1});
  return;
 }
 assert.equal(result.domain,'content');
 const create=one(events,e=>e.phase==='create-request'),created=one(events,e=>e.phase==='create-response');assert.deepEqual(create.ref,result.ref);assert.deepEqual(created.ref,result.ref);qualified(create.input.record);assert.deepEqual(create.input.record.values,{});assert.equal(create.input.record.lifecycle,'draft');successful(created);assert(events.indexOf(create)<events.indexOf(created));
 let pending,last=create.input.record,count=0;
 for(const e of events.slice(events.indexOf(created)+1)){
  if(e.phase==='draft-save-before'){
   assert(!pending,'Overlapping unacknowledged saves');assert.equal(e.operation,'put-entry');qualified(e.input.record);assert.equal(e.input.record.generation,before.tokens.content+1);
   assert(Object.keys(e.input.record.values).length>Object.keys(last.values).length);for(const [k,v] of Object.entries(last.values))assert.deepEqual(e.input.record.values[k],v);
   for(const [k,v] of Object.entries(e.input.record.values))assert.deepEqual(v,result.record.values[k]);
   assert.deepEqual(e.input.record,{...create.input.record,generation:e.input.record.generation,updatedAt:e.input.record.updatedAt,values:e.input.record.values});pending=e;
  }else if(e.phase==='draft-save-after'){
   assert(pending,'Unpaired Content acknowledgement');assert.equal(e.operation,'put-entry');successful(e);last=pending.input.record;pending=undefined;count++;
  }
 }
 assert(!pending&&count>0,'All exact saves must be acknowledged');assert.equal(result.commitCount,count+1);assert.deepEqual(result.record,{...last,generation:before.tokens.content+count+1});
}
/** Historical phase names identify the fixed public adapter; require exact get and paired original transport. */
export function assertRecoveryRead(events,result){
 const composition=result.domain==='compositions';assert(composition||result.domain==='sitemaps');assert.equal(result.ref.providerId,composition?'files':'sitemap-filesystem');
 const endpoint=composition?'/__zudo_composer_file_provider':'/__zudo_composer_sitemapper_provider';
 const responses=events.filter(e=>e.phase===(composition?'composition-response':'sitemap-read-response')&&e.status===200&&e.body?.ok===true&&(composition?e.input?.operation:e.operation)==='get'&&e.input?.id===result.ref.recordId&&e.body.result?.status==='loaded'&&equal(e.body.result.record,result.record));
 assert(responses.length>0,'Exact public loaded record required');
 for(const response of responses){
  if(response.endpoint!==undefined)assert.equal(response.endpoint,endpoint);
  const prior=events.slice(0,events.indexOf(response));const requests=prior.filter(e=>e.phase===(composition?'composition-request-before-dispatch':'sitemap-read-before')&&(composition?e.input?.operation:e.operation)==='get'&&equal(e.input,response.input)&&(!composition||e.observedRequestId===response.observedRequestId));assert(requests.length>0,'Paired original public get required');
  for(const request of requests){if(request.endpoint!==undefined)assert.equal(request.endpoint,endpoint);if(composition)assert(Number.isInteger(request.observedRequestId));}
 }
}

/** Sole historical missing-original-capture exception: phase04 Sitemap creation. */
export function assertHistoricalPageCreate(index,proof){
 assert.equal(index,3);assert.equal(proof.kind,'page-create');assert.equal(proof.result.domain,'sitemaps');assert.equal(proof.result.ref.providerId,'sitemap-filesystem');assert.equal(proof.result.ref.recordId,proof.result.record.id);
}
