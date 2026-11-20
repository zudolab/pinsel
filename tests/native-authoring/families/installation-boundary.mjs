import assert from 'node:assert/strict';
export function assertFamilyBridgeBoundary(bridge,history,snapshot){
 assert.equal(bridge.status,'FAMILY_INSTALLATION_BRIDGE_VERIFIED');assert.equal(bridge.boundary,12);assert(history.length>=12);assert.equal(history[11].afterDigest,bridge.beforeDigest);assert.equal(history[11].afterCapture,bridge.beforeCapture);
 for(let i=0;i<12;i++)assert.deepEqual(history[i],bridge.originalHistory[i],'Original accepted phase changed');
 if(history.length===12)assert.equal(snapshot.digest,bridge.afterDigest);else assert.equal(history[12].beforeDigest,bridge.afterDigest);
}
