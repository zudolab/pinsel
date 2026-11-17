import assert from 'node:assert/strict';
export const routePath=value=>value.replace(/\/$/,'')||'/';
/** The target may be a Section-only page; its source navigation lives on Home. */
export function assertHeaderDestinationPreview(preview,snapshot,intent,revision=snapshot.digest){
 const identity=preview.identity;assert.match(identity.revision,/^[a-f0-9]{64}$/);if(revision!==null)assert.equal(identity.revision,revision);
 assert.deepEqual({...identity,revision:null},{workspaceId:snapshot.workspaceId,revision:null,pathname:routePath(intent.value),packId:snapshot.project.componentPack.packId,packVersion:snapshot.project.componentPack.packVersion,rendererId:snapshot.renderer.id,rendererVersion:snapshot.renderer.version,rendererDigest:snapshot.renderer.digest});
 const routes=preview.routes.filter(r=>r.pathname===identity.pathname);assert.equal(routes.length,1);assert.equal(routes[0].pageId,intent.staticRouteProof.pageId);assert(preview.documentUrl.startsWith('/')&&!preview.documentUrl.startsWith('//'));return preview;
}
