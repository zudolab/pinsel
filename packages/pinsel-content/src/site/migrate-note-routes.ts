import { createHash } from "node:crypto";
import { canonicalStringifyJson, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import type { JsonValue } from "@zudo-composer/component-contract";
import type { SiteProject } from "zudo-composer/site-project";
import { projectNativeModelGuidance } from "./native-model-guidance";

const hash = (value: unknown) => createHash("sha256").update(canonicalStringifyJson(value as JsonValue)).digest("hex");
const SLUGS = ["exam-schedule", "free-tuition", "german-language", "online-exam", "what-is-mappe"];
const PREFIX = "note-detail";
// Reviewed 361adda source: canonical documents plus relative attachment order,
// with only the five known Note identity prefixes normalized. No Content values.
const REVIEWED_NOTE_GRAPHS = new Set([
  "c42a817ae1433748f5885c670fbcb6394d5b1a8c136ec1fadb1fb28735833245", // Captured old explicit pins plus impossible fallback condition.
  "7162990926f46bfea46f979a1dc62995b2ed4aae3d46386e509d1e090d3cdb6a", // Public DSL pins, without obsolete fallback condition.
]);
/** Retain old records as internal recovery material; never regenerate Content. */
export function normalizeNoteRoutes(input: SiteProject): SiteProject {
  if (input.id !== "pinsel" || input.schemaVersion !== 2 || input.componentPack.packId !== "pinsel" || input.activeSitemap?.providerId !== "sitemap-filesystem" || input.activeSitemap.recordId !== "main") throw new Error("Unsupported qualified Pinsel workspace graph");
  const project = structuredClone(input);
  const compositions = project.providers.compositions.find(provider => provider.id === "files")!.records;
  const mappings = project.providers.mappings.find(provider => provider.id === "mapping-filesystem")!.records;
  const sitemap = project.providers.sitemaps.find(provider => provider.id === "sitemap-filesystem")!.records.find(record => record.id === "main")!.document;
  const notes = sitemap.root[0]!.children.find(page => page.id === "notes");
  if (!notes || notes.slug !== "notes" || notes.children.length !== 5) throw new Error("Unexpected Notes route graph; review source before migration");
  for (const slug of SLUGS) {
    const page = notes.children.find(page => page.id === `note-${slug}`);
    if (!page || page.slug !== slug || page.title !== slug || page.notes !== undefined || page.children.length || page.source.kind !== "composition" || page.source.ref.providerId !== "files" || page.source.ref.recordId !== `note-${slug}`) throw new Error("Customized Note routes need explicit migration");
  }
  const retiredNodes = new Set(SLUGS.map(slug => `note-${slug}`));
  for (const item of [...sitemap.navigation.primary, ...sitemap.navigation.footer]) {
    const destination = item.destination;
    if (destination.kind === "route" && (retiredNodes.has(destination.nodeId) || destination.ancestors?.some(ancestor => retiredNodes.has(ancestor.nodeId)))) throw new Error("Navigation references a fixed Note node; review its dynamic entry destination explicitly");
  }
  const graph = (slug: string) => {
    const prefix = `note-${slug}`;
    const normalize = (value: unknown): unknown => {
      if (typeof value === "string") return value === slug ? "NOTE" : value.replaceAll(prefix, "note-NOTE");
      if (Array.isArray(value)) return value.map(normalize);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
      return value;
    };
    return normalize({ compositions: compositions.filter(record => record.id === prefix || record.id.startsWith(`${prefix}-`)).map(record => record.document).sort((a,b)=>a.id < b.id ? -1 : 1),
      mappings: mappings.filter(record => record.id.startsWith(`${prefix}-`)).map(record => record.document).sort((a,b)=>a.id < b.id ? -1 : 1),
      attachments: project.collectionAttachments.filter(attachment => attachment.composition.recordId === prefix || attachment.composition.recordId.startsWith(`${prefix}-`)).sort((a,b)=>a.order-b.order).map((attachment,order) => ({...attachment,order})) });
  };
  for (const slug of SLUGS) {
    const noteEntries = project.providers.content.filter(provider => provider.id === "content-filesystem").flatMap(provider => provider.entries).filter(entry => entry.modelId === "note" && entry.id === slug);
    if (noteEntries.length !== 1 || noteEntries[0]!.lifecycle !== "published" || noteEntries[0]!.values["note-slug"] !== slug) throw new Error("Existing Note identity/publication/URL changed; review migration explicitly");
    for (const [suffix, targets] of [["crumb", [["title", "breadcrumb", "label"]]], ["heading", [["title", "heading", "title"], ["description", "heading", "description"], ["slug", "heading", "slug"]]], ["body", [["body", "prose", "markdown"]]], ["toc-items", [["body", "items", "markdown"]]]] as const) {
      const mapping = mappings.find(record => record.id === `note-${slug}-${suffix}`)?.document;
      if (!mapping || mapping.contentModel.providerId !== "content-filesystem" || mapping.contentModel.recordId !== "note" || mapping.composition.recordId !== `note-${slug}-${suffix}` || mapping.composition.providerId !== "files" || mapping.mode.kind !== "collection") throw new Error("Unexpected Note mapping owner");
      const query = mapping.mode.query;
      if (query.publication !== "published-only" || query.limit !== 1 || query.sort.length || (query.conditions.length !== 0 && hash(query.conditions) !== hash([{fieldId:"note-order",operator:"equals",value:-1}])) || hash(query.pins) !== hash([{providerId:"content-filesystem",modelId:"note",recordId:slug}])) throw new Error("Customized Note selection needs explicit migration");
      if (mapping.bindings.length !== targets.length || targets.some(([field,nodeId,prop]) => !mapping.bindings.some(binding => "sourceFieldId" in binding && binding.sourceFieldId === `note-${field}` && binding.target.nodeId === nodeId && binding.target.prop === prop && binding.projection?.kind === "value" && binding.transform.kind === "identity"))) throw new Error("Customized Note bindings need explicit migration");
    }
  }
  const baseline = hash(graph(SLUGS[0]!));
  if (!REVIEWED_NOTE_GRAPHS.has(baseline) || SLUGS.some(slug => hash(graph(slug)) !== baseline)) throw new Error("Distinct authored Note layouts cannot be consolidated automatically");
  if (compositions.some(record => record.id === PREFIX || record.id === `${PREFIX}-label`) || mappings.some(record => record.id === PREFIX || record.id === `${PREFIX}-label`)) throw new Error("Note migration destination already exists");
  const source = `note-${SLUGS[0]}`;
  const composition = (id: string) => { const record = compositions.find(record => record.id === id); if (!record) throw new Error(`Missing composition ${id}`); return record; };
  const template = structuredClone(composition(source));
  template.id = template.document.id = PREFIX; template.document.name = "Note detail";
  type Node = (typeof template.document.root)[number];
  const child = (suffix: string, id: string): Node => { const node = structuredClone(composition(`${source}-${suffix}`).document.root[0]!); node.id = id; return node; };
  const walk = (nodes: Node[]): Node[] => nodes.map(node => {
    if (node.id === "crumb") return child("crumb", "note-breadcrumb");
    if (node.id === "heading") return child("heading", "note-heading");
    if (node.id === "body") return child("body", "note-prose");
    if (node.id === "toc") return { id: "note-toc", componentId: "pinsel.note-toc", componentVersion: 1, props: { wide: false }, slots: { label: [], items: [child("toc-items", "note-toc-items")] } };
    return { ...node, slots: Object.fromEntries(Object.entries(node.slots).map(([slot, children]) => [slot, walk(children)])) };
  });
  template.document.root = walk(template.document.root); compositions.push(template);
  const label = structuredClone(composition(`${source}-eyebrow`)); label.id = label.document.id = `${PREFIX}-label`; label.document.name = "Shared Note contents label";
  label.document.root = [{ id: "label", componentId: "pinsel.toc-label", componentVersion: 1, props: {}, slots: {} }]; compositions.push(label);
  const oldMapping = mappings.find(record => record.id === `${source}-heading`)!;
  const mapping = structuredClone(oldMapping); mapping.id = mapping.document.id = PREFIX; mapping.document.name = "Note details"; mapping.document.composition.recordId = PREFIX;
  mapping.document.mode = { kind: "collection", query: { publication: "published-only", conditions: [], pins: [], sort: [{ fieldId: "note-slug", direction: "asc" }], limit: 1000 } };
  mapping.document.bindings = [["title", "note-breadcrumb", "label"], ["title", "note-heading", "title"], ["description", "note-heading", "description"], ["slug", "note-heading", "slug"], ["body", "note-prose", "markdown"], ["body", "note-toc-items", "markdown"]].map(([field, nodeId, prop]) => ({ id: `${PREFIX}-${nodeId}-${prop}`, sourceFieldId: `note-${field}`, projection: { kind: "value" }, transform: { kind: "identity" }, target: { nodeId: nodeId!, prop: prop! } })); mappings.push(mapping);
  const labelMapping = structuredClone(mappings.find(record => record.id === `${source}-toc`)!); labelMapping.id = labelMapping.document.id = `${PREFIX}-label`; labelMapping.document.name = "Shared Note contents label"; labelMapping.document.composition.recordId = `${PREFIX}-label`;
  labelMapping.document.bindings = [{ id: `${PREFIX}-label-text`, sourceFieldId: "site-copy-contents-label", projection: { kind: "value" }, transform: { kind: "identity" }, target: { nodeId: "label", prop: "text" } }]; mappings.push(labelMapping);
  let order = project.collectionAttachments.reduce((highest, attachment) => Math.max(highest, attachment.order), -1) + 1;
  for (const [nodeId, slotId, mappingId] of [["frame", "header", "frame-header"], ["frame", "footer", "frame-footer"], ["note-heading", "eyebrow", `${source}-eyebrow`], ["note-toc", "label", `${PREFIX}-label`], ["related", "items", `${source}-related`]]) {
    project.collectionAttachments.push({ id: `${PREFIX}--${nodeId}--${slotId}`, order: order++, composition: { providerId: "files", recordId: PREFIX }, target: { nodeId: nodeId!, slotId: slotId! }, mapping: { providerId: "mapping-filesystem", recordId: mappingId! } });
  }
  const knowledge = mappings.find(record => record.id === "lessons-knowledge-cards")!;
  const binding = knowledge.document.bindings.find(binding => "sourceFieldId" in binding && binding.sourceFieldId === "knowledge-card-note");
  const card = composition("lessons-knowledge-cards").document.root[0]!;
  if (knowledge.document.contentModel.providerId !== "content-filesystem" || knowledge.document.contentModel.recordId !== "knowledge-card" || knowledge.document.composition.providerId !== "files" || knowledge.document.composition.recordId !== "lessons-knowledge-cards" || card.id !== "card" || card.componentId !== "pinsel.note-card" || card.componentVersion !== 1 || !binding || binding.target.nodeId !== "card" || binding.transform.kind !== "identity" || !("projection" in binding) || binding.projection?.kind !== "reference-id" || binding.target.prop !== "slug" || card.props.slug || card.props.href || knowledge.document.bindings.some(other => other !== binding && ["slug", "href"].includes(other.target.prop))) throw new Error("Customized Knowledge link needs explicit migration");
  binding.projection = { kind: "route-link" }; binding.target.prop = "href";
  notes.children = [{ id: PREFIX, title: "Note detail", source: { kind: "mapping", ref: { providerId: "mapping-filesystem", recordId: PREFIX }, route: { kind: "entry-field", fieldId: "note-slug", titleFieldId: "note-title" } }, children: [] }];
  project.componentPack.packVersion = "0.4.0";
  if (hash(project.providers.content) !== hash(input.providers.content)) throw new Error("Content changed during Note migration");
  return project;
}

export function migrateNoteRoutes(snapshot: AuthoringWorkspaceSnapshot, expectedDigest: string) {
  const { digest, ...body } = snapshot;
  if (!/^[a-f0-9]{64}$/.test(expectedDigest) || digest !== expectedDigest || hash(body) !== digest || snapshot.schemaVersion !== 1 || snapshot.workspaceId !== "pinsel" || snapshot.project.id !== "pinsel" || snapshot.project.componentPack.packId !== "pinsel" || snapshot.renderer.id !== "pinsel-zfb" || snapshot.project.componentPack.packVersion !== "0.3.0" || snapshot.renderer.version !== "native-v2") throw new Error("Unsupported or changed Note migration source");
  const project = projectNativeModelGuidance(normalizeNoteRoutes(snapshot.project));
  return { project, evidence: { sourceDigest: digest, sourceTokens: snapshot.tokens, projectDigest: hash(project), contentDigest: hash(project.providers.content), originalRecordsRetained: true, changes: projectChanges(snapshot.project, project) } };
}

function projectChanges(before: unknown, after: unknown, path = ""): {path:string;before?:unknown;after?:unknown}[] {
 if (before === undefined || after === undefined) return before === after ? [] : [{path,...(before === undefined ? {} : {before}),...(after === undefined ? {} : {after})}];
 if (hash(before) === hash(after)) return [];
 if (before && after && typeof before === "object" && typeof after === "object" && Array.isArray(before) === Array.isArray(after)) return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>projectChanges((before as Record<string,unknown>)[key],(after as Record<string,unknown>)[key],`${path}/${key.replaceAll("~","~0").replaceAll("/","~1")}`));
 return [{path,before,after}];
}
