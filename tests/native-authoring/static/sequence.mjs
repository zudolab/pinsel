import assert from 'node:assert/strict';
export const phases=['composition-create','section-root','section-title','page-create','page-title','page-slug','page-source','copy-create','copy-publish','navigation-add','navigation-label','navigation-target','reparent','copy-route','copy-publish'];
export function sequenceState(proofs,snapshot,marker){
 assert(Array.isArray(proofs)&&proofs.length<phases.length,'Completed sequence cannot create more phases');
 for(let i=0;i<proofs.length;i++){const p=proofs[i];assert.equal(p.status,'STATIC_PHASE_CAPTURE_VERIFIED');assert.equal(p.kind,phases[i]);assert.equal(p.sequence,i+1);assert.equal(p.resources.marker,marker);if(i)assert.equal(p.beforeDigest,proofs[i-1].afterDigest);}
 if(proofs.length)assert.equal(snapshot.digest,proofs.at(-1).afterDigest);
 return {sequence:proofs.length+1,kind:phases[proofs.length],resources:proofs.length?proofs.at(-1).resources:{marker}};
}
