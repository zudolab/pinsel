import assert from 'node:assert/strict';
import {record,page} from './intents.mjs';
export async function prepareIntent({kind,snapshot,resources:priorResources={},capturePath,activeIdentity,compile}){
 const resources=structuredClone(priorResources),owner=snapshot.project.activeSitemap;assert(owner);assert.match(resources.marker??'',/^[a-z][a-z0-9-]{0,63}$/);
 const sitemap=record(snapshot,'sitemaps',owner),intent={kind,capturePath,captureDigest:snapshot.digest,resources,owner};
 let compilation;const compiled=async()=>compilation??=await compile(snapshot);
if(kind==='composition-create'){assert(!resources.composition);intent.name=resources.marker;delete intent.owner;}
else if(kind==='section-title'){assert(resources.composition);intent.owner=resources.composition;intent.value='Independent authored static section';resources.sectionTitle=intent.value;}
else if(kind==='section-root'){assert(resources.composition);intent.owner=resources.composition;}
else if(kind==='page-create'){assert(resources.composition&&!resources.pageId);intent.parentId=sitemap.document.root[0].id;resources.parentId=intent.parentId;}
else if(['page-title','page-slug','page-source'].includes(kind)){assert(resources.pageId);intent.pageId=resources.pageId;if(kind==='page-title')intent.value=`Static ${resources.marker}`;if(kind==='page-slug')intent.value=resources.marker;if(kind==='page-source')intent.source=resources.composition;}
else if(kind==='reparent'){
 assert(resources.pageId);intent.pageId=resources.pageId;intent.fromParentId=resources.parentId;
 const candidates=sitemap.document.root[0].children.filter(n=>n.slug==='about'&&n.source.kind==='composition');assert.equal(candidates.length,1);intent.toParentId=candidates[0].id;
}else if(kind==='navigation-add'){
 assert(resources.pageId&&!resources.navigationId);intent.pageId=resources.pageId;const root=sitemap.document.root[0];assert.equal(root.source.kind,'composition');const routes=(await compiled()).build.routes.filter(r=>r.sitemapNode.id===root.id&&!r.selectedEntry);assert.equal(routes.length,1);assert.equal(routes[0].pathname,'/');assert.equal(routes[0].displayTitle,root.title);intent.destinationId=root.id;intent.label=routes[0].displayTitle;
}else if(['navigation-label','navigation-target'].includes(kind)){
 assert(resources.navigationId&&resources.pageId);intent.pageId=resources.pageId;intent.itemId=resources.navigationId;
 if(kind==='navigation-label')intent.value=`Navigation ${resources.marker}`;
 else{const node=page(sitemap.document,resources.pageId);assert.equal(node.source.kind,'composition');const routes=(await compiled()).build.routes.filter(r=>r.sitemapNode.id===node.id&&!r.selectedEntry);assert.equal(routes.length,1);intent.destinationValue=`${node.id}|${routes[0].pathname}|`;}
}else if(kind==='copy-create'){assert(resources.pageId&&!resources.copy);const node=page(sitemap.document,resources.pageId);assert.equal(node.source.kind,'composition');assert.equal(resources.parentId,sitemap.document.root[0].id);intent.route=`/${node.slug}/`;intent.title=node.title;}else if(kind==='copy-route'){assert(resources.copy&&resources.pageId);const routes=(await compiled()).build.routes.filter(r=>r.sitemapNode.id===resources.pageId&&!r.selectedEntry);assert.equal(routes.length,1);intent.route=`${routes[0].pathname}/`;}else if(kind==='copy-publish'){
 assert(resources.copy&&resources.pageId);assert(activeIdentity?.projectId&&activeIdentity.revision&&activeIdentity.buildId,'Accepted public active identity required');intent.expectedActive=activeIdentity;
 const routes=(await compiled()).build.routes.filter(r=>r.sitemapNode.id===resources.pageId&&!r.selectedEntry);assert.equal(routes.length,1);intent.route=routes[0].pathname;intent.title=page(sitemap.document,resources.pageId).title;
}else throw Error('Phase not yet executable; no browser started');
return intent;
}
