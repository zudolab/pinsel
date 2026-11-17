import assert from 'node:assert/strict';
import {getRecord} from '../families/intents.mjs';
import {assertPreviewIdentity} from '../families/readonly-proof.mjs';
export const routes=Object.freeze({'/':'home','/about':'about','/voices':'voices','/notes':'notes','/contact':'contact','/404.html':'not-found'});
export const routePath=value=>value.replace(/\/$/,'')||'/';
const walk=nodes=>nodes.flatMap(n=>[n,...walk(n.children??[])]);
const nodes=roots=>roots.flatMap(n=>[n,...nodes(Object.values(n.slots??{}).flat())]);
export function validateIntent(intent,snapshot){assert.equal(intent.kind,'route-owner-selection');assert.equal(intent.captureDigest,snapshot.digest);assert.match(snapshot.digest,/^[a-f0-9]{64}$/);assert(intent.capturePath.startsWith('/'));assert(Object.hasOwn(routes,intent.pathname));return intent;}
export function ownerNode(snapshot,target){const record=getRecord(snapshot,'compositions',{providerId:target.providerId,recordId:target.recordId}),found=nodes(record.document.root).filter(n=>n.id===target.nodeId);assert.equal(found.length,1);assert.equal(found[0].componentId,target.componentId);return found[0];}
export function assertPreview(snapshot,intent,preview){
 validateIntent(intent,snapshot);assertPreviewIdentity(snapshot,preview);assert.equal(preview.identity.pathname,intent.pathname);assert(preview.documentUrl.startsWith('/')&&!preview.documentUrl.startsWith('//'));assert(preview.frameId);
 const route=preview.routes.filter(r=>r.pathname===intent.pathname);assert.equal(route.length,1);assert.equal(route[0].pageId,routes[intent.pathname]);
 const sitemap=getRecord(snapshot,'sitemaps',snapshot.project.activeSitemap);const page=walk(sitemap.document.root).filter(n=>n.id===route[0].pageId);assert.equal(page.length,1);assert.equal(page[0].source.kind,'composition');
 const ref=page[0].source.ref;getRecord(snapshot,'compositions',ref);assert(Array.isArray(preview.targets)&&preview.targets.length);assert.equal(new Set(preview.targets.map(t=>t.renderedNodeId)).size,preview.targets.length);return ref;
}
/** Pick an actual rendered semantic owner under this page's main slot, not shared chrome. */
export function selectionCandidates(snapshot,intent,preview,renderedIds){
 const page=assertPreview(snapshot,intent,preview),byId=new Map(preview.targets.map(t=>[t.renderedNodeId,t]));
 const semantic=t=>t.presentation?.transparent===false&&typeof t.presentation.label==='string'&&t.presentation.label.length>0&&!['pinsel.art-window','pinsel.site-frame'].includes(t.componentId)&&renderedIds.filter(id=>id===t.renderedNodeId).length===1&&preview.targets.filter(v=>v.presentation?.label===t.presentation.label).length===1;
 const inMain=t=>{const seen=new Set();while(t){assert(!seen.has(t.renderedNodeId),'Cyclic captured ancestry');seen.add(t.renderedNodeId);const parent=byId.get(t.parentRenderedNodeId);if(t.slotId==='main'&&parent?.providerId===page.providerId&&parent.recordId===page.recordId)return true;t=parent;}return false;};
 const available=preview.targets.filter(semantic).filter(t=>{ownerNode(snapshot,t);return true;});
 const target=available.find(inMain);assert(target,'No uniquely rendered page-main semantic owner; do not substitute chrome/wrappers');const other=available.find(t=>t.renderedNodeId!==target.renderedNodeId);assert(other,'A distinct semantic selection is required to prove tree reselection');return{target,other};
}
export function targetEvidence(target){return{renderedNodeId:target.renderedNodeId,providerId:target.providerId,recordId:target.recordId,nodeId:target.nodeId,componentId:target.componentId,label:target.presentation.label};}
