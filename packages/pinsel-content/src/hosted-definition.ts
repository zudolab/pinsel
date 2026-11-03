import type { ComponentPackManifest } from "@zudo-composer/component-contract";
import type { SiteProject } from "zudo-composer/site-project";
import { createPinselHostedPolicy } from "./policy";
export const PINSEL_HOSTED_RENDERER = { rendererId: "pinsel-zfb", rendererVersion: "hosted-v1" };
/** Shared fingerprint input for the running Worker and immutable local builder. */
export function pinselHostedDefinitionDocument(project: SiteProject, manifest: ComponentPackManifest) {
 const providers = project.providers.content.map(provider => ({ providerId: provider.id, models: provider.models, entries: provider.entries }));
 return { project: { ...project, providers: { ...project.providers, content: project.providers.content.map(provider => ({ ...provider, entries: [] })) } },
  policy: createPinselHostedPolicy(providers), pack: { packId: manifest.packId, packVersion: manifest.packVersion }, renderer: PINSEL_HOSTED_RENDERER };
}
