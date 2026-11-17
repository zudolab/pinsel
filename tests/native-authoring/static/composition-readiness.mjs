import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
/** Wait outside request serialization: continuations must remain free to settle. */
export async function waitForCompositionReadiness(gate,{timeout=180000,interval=50}={}){
 assert(Number.isFinite(timeout)&&timeout>0);assert(Number.isFinite(interval)&&interval>0);
 const deadline=performance.now()+timeout;
 for(;;){
  gate.check();const status=gate.readiness;
  if(status.pending===0&&status.outstanding===0){gate.assertSettled();return;}
  assert(performance.now()<deadline,`Composition readiness timed out: pending=${status.pending}, outstanding=${status.outstanding}`);
  await delay(Math.min(interval,Math.max(1,deadline-performance.now())));
 }
}
