import { createHash } from "node:crypto";
import { canonicalStringifyJson, type AuthoringWorkspaceSnapshot } from "zudo-composer/authoring";
import type { JsonValue } from "@zudo-composer/component-contract";
import { COURSE_QUERY_IDS } from "@pinsel/ui/src/scripts/course-identity.ts";
import type { SiteProject } from "zudo-composer/site-project";

const hash = (value: unknown) => createHash("sha256").update(canonicalStringifyJson(value as JsonValue)).digest("hex");
type Change = { path: string; before?: unknown; after?: unknown };
function differences(before: unknown, after: unknown, path = ""): Change[] {
  if (hash(before ?? null) === hash(after ?? null) && (before === undefined) === (after === undefined)) return [];
  if (before && after && typeof before === "object" && typeof after === "object" && Array.isArray(before) === Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differences(
      (before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
    ));
  }
  return [{ path, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }) }];
}

/** Pure candidate transformation. Never reads or writes authoring storage. */
export function migrateCourseIdentity(source: AuthoringWorkspaceSnapshot, expectedDigest: string) {
  const { digest, ...body } = source;
  if (!/^[a-f0-9]{64}$/.test(expectedDigest) || digest !== expectedDigest || hash(body) !== digest) throw new Error("Source capture digest mismatch; capture and review the current source again.");
  if (source.schemaVersion !== 1 || source.project.componentPack.packId !== "pinsel" || source.project.componentPack.packVersion !== "0.2.0"
    || source.renderer.id !== "pinsel-zfb" || source.renderer.version !== "native-v1") throw new Error("Unsupported source identity; this migration requires Pinsel 0.2.0/native-v1.");
  const project = structuredClone(source.project);
  const content = project.providers.content;
  const courses = content.flatMap(provider => provider.entries.filter(entry => entry.modelId === "course").map(entry => ({ providerId: provider.id, entry })));
  if (courses.length !== 3 || new Set(courses.map(({ entry }) => entry.id)).size !== 3 || courses.some(({ entry }) => !(COURSE_QUERY_IDS as readonly string[]).includes(entry.id))) throw new Error("Migration requires exactly the three existing canonical Course identities.");
  const mappings = project.providers.mappings.flatMap(provider => provider.records);
  const getMapping = (id: string) => {
    const matches = mappings.filter(record => record.id === id);
    if (matches.length !== 1 || matches[0]!.document.contentModel.recordId !== "course") throw new Error(`Missing or ambiguous course Mapping: ${id}`);
    return matches[0]!.document;
  };
  const home = getMapping("home-pricing-cards");
  const prior = home.bindings.filter(binding => "sourceFieldId" in binding && binding.sourceFieldId === "course-order" && binding.target.nodeId === "card" && binding.target.prop === "courseIndex");
  if (prior.length !== 1 || prior[0]!.transform.kind !== "identity" || !("projection" in prior[0]!) || prior[0]!.projection?.kind !== "value") throw new Error("Home course identity binding differs from the reviewed source.");
  home.bindings = home.bindings.map(binding => binding === prior[0]
    ? { id: binding.id, source: { kind: "entry-id" }, target: { nodeId: "card", prop: "courseId" }, transform: { kind: "identity" } }
    : binding);
  const options = getMapping("contact-course-options");
  if (options.bindings.some(binding => binding.target.prop === "courseId" || binding.id === "contact-course-options-entry-identity")) throw new Error("Contact already has an identity binding; refusing to overwrite it.");
  options.bindings.push({ id: "contact-course-options-entry-identity", source: { kind: "entry-id" }, target: { nodeId: "option", prop: "courseId" }, transform: { kind: "identity" } });
  for (const [id, oldOperator, ids] of [
    ["lessons-consultation-course", "equals", ["consultation"]],
    ["lessons-price-cards", "not-equals", ["two-month", "four-month"]],
  ] as const) {
    const mapping = getMapping(id);
    const unsupported = () => new Error(`Unsupported source membership/arrangement: ${id}. Original source remains authoritative; this customization needs a separately reviewed Mapping migration.`);
    if (mapping.mode.kind !== "collection") throw unsupported();
    const query = mapping.mode.query;
    if (query.pins.length !== 0 || query.publication !== "published-only" || query.limit !== 1000
      || query.sort.length !== 1 || query.sort[0]!.fieldId !== "course-order" || query.sort[0]!.direction !== "asc"
      || query.conditions.length !== 1 || query.conditions[0]!.fieldId !== "course-order"
      || query.conditions[0]!.operator !== oldOperator || query.conditions[0]!.value !== 1) throw unsupported();
    if (courses.some(course => course.providerId !== mapping.contentModel.providerId || course.entry.lifecycle !== "published"
      || typeof course.entry.values["course-order"] !== "number" || !Number.isFinite(course.entry.values["course-order"]))) throw unsupported();
    const selected = courses.filter(course => oldOperator === "equals" ? course.entry.values["course-order"] === 1 : course.entry.values["course-order"] !== 1);
    if (selected.length !== ids.length || selected.some(course => !(ids as readonly string[]).includes(course.entry.id))) throw unsupported();
    // The only supported IDs are ASCII, so this ID comparison is exactly the
    // resolver's Unicode code-point tie break. Preserve captured arrangement.
    selected.sort((left, right) => Number(left.entry.values["course-order"]) - Number(right.entry.values["course-order"])
      || (left.entry.id < right.entry.id ? -1 : left.entry.id > right.entry.id ? 1 : 0));
    mapping.mode.query = { ...query, limit: selected.length, sort: [], conditions: [], pins: selected.map(course => ({
      providerId: course.providerId, modelId: "course", recordId: course.entry.id,
    })) };
  }
  type Node = SiteProject["providers"]["compositions"][number]["records"][number]["document"]["root"][number];
  const visit = (node: Node, providerId: string, recordId: string): void => {
    if (node.componentId === "pinsel.pricing-card") {
      if (node.componentVersion !== 1 || "courseId" in node.props) throw new Error("Unexpected pricing-card version/identity");
      const boundIdentity = providerId === home.composition.providerId && recordId === home.composition.recordId && node.id === "card";
      const alias = node.props.courseIndex ?? 1; // Historical component-v1 manifest default.
      if (typeof alias !== "number" || !Number.isInteger(alias) || alias < 1 || alias > 3) throw new Error("Unsupported legacy courseIndex; refusing an inferred identity");
      delete node.props.courseIndex;
      if (!boundIdentity) node.props.courseId = COURSE_QUERY_IDS[alias - 1]!;
      node.componentVersion = 2;
    }
    if (node.componentId === "pinsel.course-option") {
      if (node.componentVersion !== 1 || providerId !== options.composition.providerId || recordId !== options.composition.recordId || node.id !== "option" || "courseId" in node.props) throw new Error("A custom course option needs an explicit identity migration");
      // Mapping supplies the selected entry identity; do not shadow it in props.
      node.componentVersion = 2;
    }
    for (const children of Object.values(node.slots)) for (const child of children) visit(child, providerId, recordId);
  };
  for (const provider of project.providers.compositions) for (const record of provider.records) for (const node of record.document.root) visit(node, provider.id, record.id);
  project.componentPack.packVersion = "0.3.0";
  if (hash(project.providers.content) !== hash(source.project.providers.content)) throw new Error("Migration unexpectedly changed Content");
  const changes = differences(source.project, project);
  return { project, evidence: {
    migration: "pinsel-course-identity-v1", sourceDigest: digest, sourceWorkspaceId: source.workspaceId, sourceTokens: source.tokens,
    oldIdentity: { componentPack: source.componentPack, projectPack: source.project.componentPack, renderer: source.renderer },
    targetIdentity: { packId: "pinsel", packVersion: "0.3.0", rendererId: "pinsel-zfb", rendererVersion: "native-v2" },
    sourceProjectDigest: hash(source.project), candidateProjectDigest: hash(project), contentDigest: hash(content),
    retainedFields: content.flatMap(provider => provider.models).reduce((sum, model) => sum + model.document.fields.length, 0),
    retainedEntries: content.reduce((sum, provider) => sum + provider.entries.length, 0), changes,
    note: "Explicit pin order owns tuition membership/arrangement; Home and Contact still sort by Content order. All Content fields/values and unrelated references retained. Source history remains in the untouched original store.",
  } };
}

/** Verify the actual public post-import capture, not merely the proposed input.
 * A new store starts entry generations at 1; all other Content bytes must agree.
 */
export function verifyImportedCourseContent(source: SiteProject, imported: SiteProject) {
  const before = source.providers.content;
  const after = imported.providers.content;
  const metadataChanges = differences(before, after).map(change => {
    const match = /^\/(\d+)\/entries\/(\d+)\/generation$/.exec(change.path);
    if (!match || change.after !== 1 || !Number.isSafeInteger(change.before) || Number(change.before) < 1) {
      throw new Error(`Imported Content differs outside the initializer generation reset: ${change.path}`);
    }
    const provider = before[Number(match[1])]!;
    const entry = provider.entries[Number(match[2])]!;
    return { ...change, providerId: provider.id, modelId: entry.modelId, recordId: entry.id, reason: "New native store initializes entry generation to 1" };
  });
  return { verified: true as const, providers: before.length, models: before.reduce((count, provider) => count + provider.models.length, 0),
    entries: before.reduce((count, provider) => count + provider.entries.length, 0), metadataChanges };
}
