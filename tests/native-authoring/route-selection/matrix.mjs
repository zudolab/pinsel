import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {join,isAbsolute} from 'node:path';import {pathToFileURL} from 'node:url';
import {inputHash} from '../families/frozen-inputs.mjs';import {getRecord} from '../families/intents.mjs';import {routes,validateIntent} from './proof.mjs';
const walk=nodes=>nodes.flatMap(n=>[n,...walk(n.children??[])]);
export function routeMatrix({snapshot,capturePath,captureHash,composer,sourceHead,stage}){
 assert(isAbsolute(capturePath));assert.match(captureHash,/^[a-f0-9]{64}$/);assert.match(composer,/^[a-f0-9]{40}$/);assert.match(sourceHead,/^[a-f0-9]{40}$/);assert.match(stage,/^[a-z][a-z0-9-]{0,63}$/);
 const sitemap=getRecord(snapshot,'sitemaps',snapshot.project.activeSitemap);
 const scenarios=Object.entries(routes).map(([pathname,pageId])=>{const found=walk(sitemap.document.root).filter(p=>p.id===pageId);assert.equal(found.length,1);assert.equal(found[0].source.kind,'composition');const pageSource=found[0].source.ref;getRecord(snapshot,'compositions',pageSource);
  const intent={kind:'route-owner-selection',pathname,capturePath,captureDigest:snapshot.digest};validateIntent(intent,snapshot);
  return{name:pageId,intent,expected:{sitemap:structuredClone(snapshot.project.activeSitemap),pageId,pageSource:structuredClone(pageSource),workspaceId:snapshot.workspaceId,revision:snapshot.digest,pack:snapshot.project.componentPack,renderer:snapshot.renderer,targetPolicy:'CAPTURED_CANONICAL_SEMANTIC_DESCENDANT_OF_PAGE_MAIN'}};
 });
 return{status:'PREPARED_NOT_RUN',composer,sourceHead,stage,capturePath,captureHash,captureDigest:snapshot.digest,scenarios};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const[capturePath,composer,sourceHead,stage,out]=process.argv.slice(2);assert(isAbsolute(out));const bytes=await readFile(capturePath),matrix=routeMatrix({snapshot:JSON.parse(bytes),capturePath,captureHash:inputHash(bytes),composer,sourceHead,stage});await mkdir(out);for(const s of matrix.scenarios)await writeFile(join(out,s.name+'-intent.json'),JSON.stringify(s.intent,null,2),{flag:'wx'});await writeFile(join(out,'matrix.json'),JSON.stringify(matrix,null,2),{flag:'wx'});console.log(JSON.stringify({status:matrix.status,scenarios:matrix.scenarios.map(s=>s.name)}));}
