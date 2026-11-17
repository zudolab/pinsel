import assert from 'node:assert/strict';
/** Same original-browser transport as committed Content observer; no route.fetch/replay. */
export async function originalResponse(page, route, timeout = 180000) {
  const request = route.request(), url = new URL(request.url()), origin = new URL(page.url()).origin;
  assert.equal(url.origin, origin); assert.equal(request.headers().origin,origin);
  assert.equal(request.method(),'POST'); assert(!url.search && !url.hash && !url.username && !url.password);
  let timer;
  try {
    return await Promise.race([(async () => {
      await route.continue();
      const response = await request.response();
      assert(response && response.request() === request && response.url() === url.href && !request.redirectedFrom() && !request.redirectedTo());
      assert.equal(await response.finished(),null);
      return { status:response.status(), body:await response.json() };
    })(), new Promise((_,reject) => { timer=setTimeout(() => reject(Error('Original request outcome uncertain; no further writes')),timeout); })]);
  } finally { clearTimeout(timer); }
}
/** All errors latch the phase. An uncertain original request is never retried. */
export function requestGate({page,persist,validate,accept,timeout,decode=value=>value}) {
  let failure, busy=false; const pending=new Set();
  const handle = route => {
    const work = (async () => {
      let input, owns=false;
      try {
        assert(!failure,'Phase already held'); assert(!busy,'Unexpected concurrent request');
        const wire=route.request().postDataJSON(); input=decode(wire,route.request()); validate(input,route.request()); busy=true; owns=true;
        await persist({phase:'request-before-dispatch',input,wire,endpoint:new URL(route.request().url()).pathname});
        const result=await originalResponse(page,route,timeout);
        await persist({phase:'request-response',input,...result});
        assert.equal(result.status,200); accept(input,result.body);
      } catch(error) {
        failure ??= error;
        await route.abort().catch(()=>{});
        await persist({phase:'request-held',input,error:error.message}).catch(()=>{});
      } finally { if(owns) busy=false; }
    })();
    pending.add(work); work.finally(()=>pending.delete(work)); return work;
  };
  return {handle, async drain(){ await Promise.all([...pending]); if(failure) throw failure; }, check(){if(failure) throw failure;} };
}
/** A failed activation response must not skip its already admitted reconciliation. */
export async function drainAll(...gates) {
  const results=await Promise.allSettled(gates.map(gate=>gate.drain()));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
}
