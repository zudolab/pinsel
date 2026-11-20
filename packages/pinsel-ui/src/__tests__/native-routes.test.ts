import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {renderToString} from "@takazudo/zfb/zudo-react/server";
import {renderRouteDocument} from "../render/render-route-document";
import {pinselRegistry} from "../pack";
import {expect,it} from "vitest";
import {compileStaticSite} from "zudo-composer/site-build";
import {createFilesystemAssetStore} from "zudo-composer/authoring";
import {pinselPack} from "../pack";
import {renderDocument} from "../render/host-document";
import {buildPinselSite} from "../../../pinsel-content/src/site/structure";
import {normalizeNoteRoutes} from "../../../pinsel-content/src/site/migrate-note-routes";
import {readContentEntries} from "../../../pinsel-content/src/site/entries";

it("renders all fourteen baseline routes and authored Note, static page and Course through public compilation",async()=>{
 const root=await mkdtemp(join(tmpdir(),"pinsel-native-routes-"));
 try {
 const historical=buildPinselSite(await readContentEntries(),pinselPack).project;
 const project=normalizeNoteRoutes(historical);
 await createFilesystemAssetStore({assetsStoreRoot:join(root,"assets")});
 const compile=async()=>{await writeFile(join(root,"project.json"),JSON.stringify(project));return compileStaticSite({projectPath:join(root,"project.json"),pack:pinselPack,assetsStoreRoot:join(root,"assets")});};
 const render=async()=>{const result=await compile();return new Map(await Promise.all(result.build.routes.map(async route=>[route.pathname,await renderDocument({route,project:result.project,identity:{pathname:route.pathname,rendererId:"pinsel-zfb",rendererVersion:"native-v3"},targets:[]})] as const)));};
 const baseline=await render();expect(baseline.size).toBe(14);
 const compiledNew=await compile();
 await writeFile(join(root,"historical.json"),JSON.stringify(historical));
 const compiledOld=await compileStaticSite({projectPath:join(root,"historical.json"),pack:pinselPack,assetsStoreRoot:join(root,"assets")});
 for(const old of compiledOld.build.routes){
  const next=compiledNew.build.routes.find(route=>route.pathname===old.pathname)!;
  const oldBody=renderToString(renderRouteDocument(old,pinselRegistry));
  let newBody=renderToString(renderRouteDocument(next,pinselRegistry));
  if(old.pathname.startsWith("/notes/")) newBody=newBody.replace('aria-labelledby="toc-label-note-toc"','aria-label="Contents"').replace(' id="toc-label-note-toc"','');
  expect(newBody,old.pathname).toBe(oldBody);
 }

 for(const [path,html] of baseline){expect(html).toContain('<!doctype html>');expect(html).toContain('noindex,nofollow');if(path.startsWith('/notes/')){expect(html).toContain('aria-labelledby="toc-label-note-toc"');expect(html).toContain('Contents');}}
 const entries=project.providers.content[0]!.entries;
 const note=structuredClone(entries.find(entry=>entry.modelId==="note")!);note.id="uuid-new-note";note.values["note-slug"]="new-study-guide";note.values["note-title"]="New study guide";note.lifecycle="draft";entries.push(note);
 expect((await compile()).build.routes).toHaveLength(14);
 note.lifecycle="published";
 const knowledge=entries.find(entry=>entry.modelId==="knowledge-card")!;
 const excerpt=knowledge.values["knowledge-card-description"];
 knowledge.values["knowledge-card-note"]={providerId:"content-filesystem",modelId:"note",recordId:note.id};
 const authoredNote=await render();expect(authoredNote.size).toBe(15);expect(authoredNote.get('/notes/new-study-guide')).toContain('<title>New study guide - Pinsel Notes</title>');expect(authoredNote.get('/lessons')).toContain('href="/notes/new-study-guide/"');expect(authoredNote.get('/lessons')).toContain(String(excerpt));
 const sourcePage=project.providers.compositions[0]!.records.find(record=>record.id==="about")!;
 const newPage=structuredClone(sourcePage);newPage.id=newPage.document.id="new-static-page";newPage.document.name="New static page";newPage.document.root=[{id:"local-intro",componentId:"pinsel.paragraph",componentVersion:1,props:{text:"Independent page"},slots:{}}];project.providers.compositions[0]!.records.push(newPage);
 project.providers.sitemaps[0]!.records[0]!.document.root[0]!.children.push({id:"new-static-page",slug:"workshop",title:"Workshop",source:{kind:"composition",ref:{providerId:"files",recordId:newPage.id}},children:[]});
 await expect(render()).rejects.toThrow('exactly one');
 const metadata=structuredClone(entries.find(entry=>entry.modelId==="page-copy"&&entry.values["page-copy-route"]==="/about/")!);metadata.id="new-static-metadata";metadata.values["page-copy-route"]="/workshop/";metadata.values["page-copy-meta-title"]="Independent Workshop";entries.push(metadata);
 const course=structuredClone(entries.find(entry=>entry.id==="two-month")!);course.id="uuid-new-course";course.values["course-name"]="New Course";course.values["course-contact-option-label"]="New Course option";course.values["course-order"]=4;entries.push(course);
 const authored=await render();expect(authored.size).toBe(16);expect(authored.get('/workshop')).toContain('<title>Independent Workshop</title>');expect(authored.get('/workshop')).toContain('Independent page');expect(authored.get('/')).toContain('/contact/?course=uuid-new-course');expect(authored.get('/contact')).toContain('data-course-id="uuid-new-course"');expect(authored.get('/')).not.toContain('href="/workshop/"');
 }finally{await rm(root,{recursive:true,force:true});}
},30000);
