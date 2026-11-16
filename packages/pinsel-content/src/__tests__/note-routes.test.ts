import { expect, it } from "vitest";
import { projectHostedSite } from "zudo-composer/hosted-content";
import { contractPack } from "../site/contract-pack";
import { readContentEntries } from "../site/entries";
import { buildPinselSite } from "../site/structure";
import { normalizeNoteRoutes } from "../site/migrate-note-routes";
const pack = contractPack();
const entries = await readContentEntries();
const original = () => buildPinselSite(entries, pack).project;
it("retains all Content and baseline routes with dynamic qualified Note ownership", async () => {
  const source = original(); const before = structuredClone(source);
  const project = normalizeNoteRoutes(source);
  expect(source).toEqual(before); expect(project.providers.content).toEqual(source.providers.content);
  const result = await projectHostedSite({project, componentPack:pack.manifest}, []);
  if (result.status !== "ready") throw new Error(JSON.stringify(result));
  expect(result.routes).toHaveLength(14);
  expect(result.routes.filter(route => route.pathname.startsWith("/notes/")).map(route => route.pathname)).toEqual(["exam-schedule","free-tuition","german-language","online-exam","what-is-mappe"].map(slug => `/notes/${slug}`));
});
it("compiles a fifteenth Note whose identity differs from slug and retains Knowledge excerpts", async () => {
  const project = normalizeNoteRoutes(original());
  const content = project.providers.content[0]!;
  const originalNote = content.entries.find(entry => entry.modelId === "note")!;
  const id = "64b504c4-d13e-4de0-a357-f662543eb07e";
  content.entries.push({...structuredClone(originalNote),id,values:{...originalNote.values,"note-slug":"new-study-guide","note-title":"New guide"}});
  const knowledge = content.entries.find(entry => entry.modelId === "knowledge-card")!;
  const excerpt = {title:knowledge.values["knowledge-card-title"],description:knowledge.values["knowledge-card-description"]};
  knowledge.values["knowledge-card-note"] = {providerId:content.id,modelId:"note",recordId:id};
  const result = await projectHostedSite({project, componentPack:pack.manifest}, []);
  if (result.status !== "ready") throw new Error(JSON.stringify(result));
  expect(result.routes).toHaveLength(15); expect(result.routes.some(route => route.pathname === "/notes/new-study-guide")).toBe(true);
  const lessons = result.routes.find(route => route.pathname === "/lessons")!;
  const text = JSON.stringify(lessons); expect(text).toContain('/notes/new-study-guide'); expect(text).toContain(String(excerpt.title)); expect(text).toContain(String(excerpt.description));
  content.entries.find(entry => entry.id === id)!.lifecycle = "draft";
  expect((await projectHostedSite({project,componentPack:pack.manifest},[])).status).not.toBe("ready");
});
it("refuses divergent local layouts and existing link overrides without writes", () => {
  for (const change of ["layout","link"]) {
    const project=original();
    const records=project.providers.compositions[0]!.records;
    if(change === "layout") records.find(record=>record.id === "note-free-tuition")!.document.root[0]!.props.test="local";
    else records.find(record=>record.id === "lessons-knowledge-cards")!.document.root[0]!.props.slug="custom";
    const before=structuredClone(project); expect(()=>normalizeNoteRoutes(project)).toThrow(); expect(project).toEqual(before);
  }
});
it.each(["wide","binding","attachment","title"])("refuses identical unsupported customization across every Note: %s", kind => {
 const project=original();
 const slugs=["exam-schedule","free-tuition","german-language","online-exam","what-is-mappe"];
 for(const slug of slugs) {
  if(kind === "wide") project.providers.compositions[0]!.records.find(record=>record.id===`note-${slug}-toc`)!.document.root[0]!.props.wide=true;
  if(kind === "binding") project.providers.mappings[0]!.records.find(record=>record.id===`note-${slug}-heading`)!.document.bindings[0]!.transform={kind:"prefix",prefix:"Changed"};
  if(kind === "attachment") {const attachment=project.collectionAttachments.find(item=>item.composition.recordId===`note-${slug}`)!;attachment.order+=1000;}
  if(kind === "title") project.providers.sitemaps[0]!.records[0]!.document.root[0]!.children.find(page=>page.id==="notes")!.children.find(page=>page.id===`note-${slug}`)!.title="Custom";
 }
 const before=structuredClone(project);expect(()=>normalizeNoteRoutes(project)).toThrow();expect(project).toEqual(before);
});
it("accepts the reviewed captured pin form without carrying its obsolete fallback condition", () => {
 const project=original();
 for(const record of project.providers.mappings[0]!.records) if(/^note-(exam-schedule|free-tuition|german-language|online-exam|what-is-mappe)-(crumb|heading|body|toc-items)$/.test(record.id)) {
  if(record.document.mode.kind!=="collection")throw new Error("fixture");record.document.mode.query.conditions=[{fieldId:"note-order",operator:"equals",value:-1}];
 }
 expect(normalizeNoteRoutes(project).providers.content).toEqual(project.providers.content);
});
it("refuses authored Sitemap notes and old-node navigation rather than dropping them", () => {
 for(const kind of ["notes","navigation","ancestor"]) {
  const project=original();const sitemap=project.providers.sitemaps[0]!.records[0]!.document;
  if(kind === "notes") sitemap.root[0]!.children.find(page=>page.id==="notes")!.children[0]!.notes="Owner instructions";
  else sitemap.navigation.primary.push({id:"custom",label:"Custom",visible:true,destination:{kind:"route",nodeId:kind==="navigation"?"note-exam-schedule":"home",...(kind==="ancestor"?{ancestors:[{nodeId:"note-exam-schedule",entry:{providerId:"content-filesystem",modelId:"note",recordId:"exam-schedule"}}]}:{})}});
  const before=structuredClone(project);expect(()=>normalizeNoteRoutes(project)).toThrow();expect(project).toEqual(before);
 }
});
