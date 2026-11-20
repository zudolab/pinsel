import assert from 'node:assert/strict';
export function baselineSelection(snapshot) {
  return snapshot.project.providers.content.flatMap(p=>p.entries.filter(e=>e.lifecycle==='published').map(e=>({providerId:p.id,modelId:e.modelId,recordId:e.id})));
}
export function validateBaselineIntent(intent,snapshot) {
  assert.deepEqual(Object.keys(intent).sort(),['kind','capturePath','captureDigest','expectedActive','refs'].sort());
  assert.equal(intent.kind,'first-baseline');assert.equal(intent.expectedActive,null);
  assert.equal(intent.captureDigest,snapshot.digest);assert.match(snapshot.digest,/^[a-f0-9]{64}$/);
  assert(snapshot.workspaceId && snapshot.workspaceId===snapshot.project.id);
  assert.deepEqual(intent.refs,baselineSelection(snapshot),'Reviewed published baseline differs');assert(intent.refs.length>0);
}
