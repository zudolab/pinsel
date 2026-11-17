import {assertChildDOMOrder} from './order-followup.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,readdir,lstat,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {repoRoot} from './config.mjs';
import {verifyFamily} from './family-graph.mjs';
import {ownedFamilyExpectation,assertOwnedFamilyDOM} from './owned-render.mjs';
export async function artifactFiles(root){
 const hashes={};async function walk(relative=''){for(const name of (await readdir(join(root,relative))).sort()){const rel=join(relative,name),stat=await lstat(join(root,rel));assert(!stat.isSymbolicLink(),'Artifact symlinks refused');if(stat.isDirectory())await walk(rel);else{assert(stat.isFile());hashes[rel]=createHash('sha256').update(await readFile(join(root,rel))).digest('hex');}}}await walk();return hashes;
}
export async function verifyStaticVisitor({snapshot,family,kind,output,artifacts,moved=false,secondChild}){
 output=resolve(output);artifacts=resolve(artifacts);assert(!artifacts.startsWith(output+sep)&&artifacts!==output,'Evidence must be outside built artifact');
 verifyFamily(snapshot,family,kind,{moved});const expected=ownedFamilyExpectation(snapshot,{kind,marker:family.marker,family});
 const evidence=JSON.parse(await readFile(join(output,'build-evidence.json'),'utf8'));assert.equal(evidence.snapshotDigest,snapshot.digest);assert.equal(evidence.workspaceId,snapshot.workspaceId);assert.deepEqual(evidence.componentPack,snapshot.componentPack);assert.deepEqual(evidence.renderer,snapshot.renderer);
 const before=await artifactFiles(output);await mkdir(artifacts,{recursive:false});
 const failures=[];const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 const server=createServer(async(req,res)=>{try{assert(['GET','HEAD'].includes(req.method));const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(output,'.'+pathname);assert(file.startsWith(output+sep));if((await lstat(file)).isDirectory())file=join(file,'index.html');assert(Object.hasOwn(before,file.slice(output.length+1)),'Uncaptured artifact file');res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.end(req.method==='HEAD'?undefined:await readFile(file));}catch(e){failures.push(e.message);res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const {chromium,expect}=createRequire(join(repoRoot,'package.json'))('@playwright/test');let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.NATIVE_ACCEPTANCE_CHROMIUM||chromium.executablePath()});const context=await browser.newContext({viewport:{width:1600,height:1050}});
  await context.route('**/*',async route=>{const r=route.request();if(new URL(r.url()).origin!==base||r.method()!=='GET'){failures.push(`Refused ${r.method()} ${r.url()}`);return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/${kind}/`,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  const toc=page.locator(`a[href="#${expected.fragment}"]`);await expect(toc).toHaveCount(1);await expect(toc).toBeVisible();await toc.click();await expect.poll(()=>new URL(page.url()).hash).toBe('#'+expected.fragment);
  await assertOwnedFamilyDOM(page,expected,{expect,moved,oldFragment:family.oldFragment});
  if(secondChild){assert(!moved);await assertChildDOMOrder(page,snapshot,family,kind,secondChild,expect);}
  assert(await page.locator('link[rel="stylesheet"]').count()>0,'Actual stylesheet required');
  assert(await page.evaluate(()=>[...document.styleSheets].some(s=>s.href&&s.cssRules.length>0)),'Loaded CSS rules required');
  await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),{timeout:30000}).toBe(true);
  await page.screenshot({path:join(artifacts,'visitor.png'),fullPage:true});await context.close();await browser.close();browser=undefined;assert.deepEqual(failures,[]);
  const after=await artifactFiles(output);assert.deepEqual(after,before,'Built artifact changed during visitor verification');
  const result={status:'PASS',kind,moved,captureDigest:snapshot.digest,workspaceId:snapshot.workspaceId,componentPack:snapshot.componentPack,renderer:snapshot.renderer,expected,secondChild:secondChild??null,artifactFiles:before,checks:['toc-hash','owned-fields','faq-disclosure-or-result-row','loaded-css','loaded-images','no-request-errors']};
  await writeFile(join(artifacts,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});return result;
 }catch(error){await writeFile(join(artifacts,'failure.json'),JSON.stringify({status:'FAIL',captureDigest:snapshot.digest,error:error.message,failures},null,2),{flag:'wx'});throw error;}finally{await browser?.close();await new Promise(r=>server.close(r));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const[capture,family,kind,output,artifacts,state,secondChildPath]=process.argv.slice(2);assert(['created','moved','restored'].includes(state));const read=async p=>JSON.parse(await readFile(p,'utf8'));await verifyStaticVisitor({snapshot:await read(capture),family:await read(family),kind,output,artifacts,moved:state==='moved',secondChild:secondChildPath?await read(secondChildPath):undefined});}
