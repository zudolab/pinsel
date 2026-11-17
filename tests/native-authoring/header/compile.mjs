import assert from 'node:assert/strict';
import {isDeepStrictEqual}from'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join, resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { repoRoot } from '../families/config.mjs';
import { assertInstalledIdentities } from '../families/installed-identity.mjs';
import { Window } from 'happy-dom';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export async function compile(snapshot) {
 const require=createRequire(join(repoRoot,'packages/pinsel-content/package.json'));
 const {loadHostContext}=await import(pathToFileURL(require.resolve('zudo-composer/vite')));
 const {resolveAuthoringPackIdentity,resolveAuthoringRendererIdentity}=await import(pathToFileURL(require.resolve('zudo-composer/authoring')));
 const {compileAuthoringWorkspaceSnapshot}=await import(pathToFileURL(require.resolve('zudo-composer/site-build')));
 const host=await loadHostContext({workspaceRoot:join(repoRoot,'packages/pinsel-content')}),packIdentity=await resolveAuthoringPackIdentity(host),renderer=await resolveAuthoringRendererIdentity(host);
 assertInstalledIdentities(snapshot,{packIdentity,renderer});return compileAuthoringWorkspaceSnapshot({snapshot,pack:host.pack,packIdentity,renderer});
}
export async function verifyExactBuild(snapshot,root,compiled) {
 assert.equal(resolve(root),join(repoRoot,'packages/pinsel-content/.native-builds',snapshot.digest));
 const bytes=await readFile(join(root,'build-evidence.json')),evidence=JSON.parse(bytes);
 assert.equal(evidence.snapshotDigest,snapshot.digest);assert.equal(evidence.workspaceId,snapshot.workspaceId);assert.deepEqual(evidence.componentPack,snapshot.componentPack);assert.deepEqual(evidence.renderer,snapshot.renderer);assert.deepEqual(evidence.routes,compiled.build.routes.map(r=>r.pathname));
 for(const route of compiled.build.routes){const relative=route.pathname.replace(/^\//,'');const file=relative.endsWith('.html')?relative:join(relative,'index.html');const target=resolve(root,file);assert(target.startsWith(resolve(root)+sep));await readFile(target);}
 for(const asset of compiled.assetFiles){const target=resolve(root,asset.fileName);assert(target.startsWith(resolve(root)+sep));assert.equal(digest(await readFile(target)),digest(asset.source));}
 return{buildEvidenceHash:digest(bytes),routes:evidence.routes,assetCount:compiled.assetFiles.length};
}
export function assertDestination(compiled,intent){
 if(intent.kind==='knowledge-reference'){const routes=compiled.build.routes.filter(r=>isDeepStrictEqual(r.selectedEntry,intent.value));assert.equal(routes.length,1,'Exact qualified Note must compile to one route');return routes[0].pathname;}
 if(intent.field!=='nav-link-href'||intent.direction!=='forward')return null;
 const proof=intent.staticRouteProof,route=compiled.build.routes.find(r=>r.pathname===(proof.route.replace(/\/$/,'')||'/'));assert(route&&!route.selectedEntry);assert.equal(route.sitemapNode.id,proof.pageId);return route.pathname;
}
export async function verifyDestinationHtml(root,pathname,proof){
 assert(pathname.startsWith('/')&&!pathname.includes('..')&&!pathname.includes('\\'));
 const path=pathname==='/'?'index.html':pathname.endsWith('.html')?pathname.slice(1):join(pathname.slice(1),'index.html');
 const html=await readFile(join(root,path),'utf8'),window=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
 try{const doc=new window.DOMParser().parseFromString(html,'text/html');if(proof?.title)assert.equal(doc.querySelector('title')?.textContent,proof.title);if(proof?.sectionTitle){assert.equal(doc.querySelectorAll('h2').length,1);assert.equal(doc.querySelector('h2')?.textContent,proof.sectionTitle);}return{route:pathname,htmlSha256:digest(html)};}finally{await window.happyDOM.close();}
}
