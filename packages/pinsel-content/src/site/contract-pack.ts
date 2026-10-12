import { defineComponent, defineComponentPack, type ComponentManifest, type ComponentPackManifest, type TrustedComponentPack } from "@zudo-composer/component-contract";

import { CONTRACT_PACK_ID, CONTRACT_PACK_VERSION, PINSEL_COMPONENT_CONTRACT, type ContractComponent, type ContractProp } from "./component-contract";

// A render-nothing pack with exactly the contract's manifest. The structure
// tests validate and compile against it so they do not depend on how
// `@pinsel/ui` renders; `checkPackAgainstContract` then proves the real pack
// ships the same ids, versions, props and slots, which makes the compiled
// plans identical.

function field(prop: string, spec: ContractProp): Record<string, unknown> {
  if (typeof spec.kind === "object") return { kind: "select", prop, label: prop, options: [...spec.kind.select] };
  if (spec.kind === "number") return { kind: "number", prop, label: prop, step: 1 };
  if (spec.kind === "multiline") return { prop, label: prop, schema: { type: "string" }, editor: { kind: "text", multiline: true } };
  return { kind: spec.kind, prop, label: prop };
}

function stub(entry: ContractComponent) {
  const exportName = entry.id.replace(/^pinsel\./, "").replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
  const define = defineComponent<Record<string, unknown>>() as unknown as (component: unknown, definition: unknown) => unknown;
  return define(() => null, {
    id: entry.id,
    schemaVersion: entry.schemaVersion,
    title: entry.id,
    category: "Contract",
    description: entry.description,
    source: { module: "@pinsel/ui", exportKind: "named", exportName },
    defaults: Object.fromEntries(Object.entries(entry.props).map(([prop, spec]) => [prop, spec.default])),
    fields: Object.entries(entry.props).map(([prop, spec]) => field(prop, spec)) as never,
    slots: entry.slots.map((slot) => ({ id: slot.id, prop: slot.id, label: slot.id, cardinality: slot.cardinality, ...(slot.accepts ? { accepts: [...slot.accepts] } : {}) })) as never,
  });
}

let cached: TrustedComponentPack | undefined;

export function contractPack(): TrustedComponentPack {
  cached ??= defineComponentPack({ packId: CONTRACT_PACK_ID, packVersion: CONTRACT_PACK_VERSION, components: PINSEL_COMPONENT_CONTRACT.map(stub) as never }) as unknown as TrustedComponentPack;
  return cached;
}

export interface ContractMismatch {
  componentId: string;
  message: string;
}

function propKind(manifest: ComponentManifest, prop: string): string | undefined {
  const found = manifest.fields.find((candidate) => candidate.prop === prop) as { kind?: string; editor?: { kind?: string } } | undefined;
  return found?.kind ?? found?.editor?.kind;
}

function expectedKind(spec: ContractProp): string {
  if (typeof spec.kind === "object") return "select";
  return spec.kind === "multiline" ? "text" : spec.kind;
}

/** Every contract component exists in `pack` with the same schema version, props (kind + default) and slots. */
export function checkPackAgainstContract(pack: ComponentPackManifest): ContractMismatch[] {
  const problems: ContractMismatch[] = [];
  if (pack.packId !== CONTRACT_PACK_ID || pack.packVersion !== CONTRACT_PACK_VERSION) {
    problems.push({ componentId: "*", message: `pack is ${pack.packId}@${pack.packVersion}, the contract is ${CONTRACT_PACK_ID}@${CONTRACT_PACK_VERSION}` });
  }
  for (const entry of PINSEL_COMPONENT_CONTRACT) {
    const manifest = pack.components.find((candidate) => candidate.id === entry.id);
    if (!manifest) {
      problems.push({ componentId: entry.id, message: "missing from the pack" });
      continue;
    }
    if (manifest.schemaVersion !== entry.schemaVersion) problems.push({ componentId: entry.id, message: `schemaVersion ${manifest.schemaVersion}, contract ${entry.schemaVersion}` });
    for (const [prop, spec] of Object.entries(entry.props)) {
      const kind = propKind(manifest, prop);
      if (kind === undefined) problems.push({ componentId: entry.id, message: `prop "${prop}" missing` });
      else if (kind !== expectedKind(spec)) problems.push({ componentId: entry.id, message: `prop "${prop}" is ${kind}, contract ${expectedKind(spec)}` });
      if (JSON.stringify(manifest.defaults[prop]) !== JSON.stringify(spec.default)) problems.push({ componentId: entry.id, message: `default of "${prop}" is ${JSON.stringify(manifest.defaults[prop])}, contract ${JSON.stringify(spec.default)}` });
    }
    for (const slot of entry.slots) {
      const found = manifest.slots.find((candidate) => candidate.id === slot.id);
      if (!found) problems.push({ componentId: entry.id, message: `slot "${slot.id}" missing` });
      else if (found.prop !== slot.id || found.cardinality !== slot.cardinality || JSON.stringify(found.accepts ?? null) !== JSON.stringify(slot.accepts ?? null)) {
        problems.push({ componentId: entry.id, message: `slot "${slot.id}" differs (prop ${found.prop}, ${found.cardinality}, accepts ${JSON.stringify(found.accepts ?? null)})` });
      }
    }
  }
  return problems;
}
