import type { Child } from "@takazudo/zfb/zudo-react";
import { pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import DefaultLayout from "~/layouts/default";
import { OUTPUTS, ROUTES } from "~/data/routes.generated";

export type RouteOutput = (typeof OUTPUTS)[number];

export function outputFor(route: string): RouteOutput {
  const output = OUTPUTS.find((candidate) => candidate.route === route);
  if (!output) throw new Error(`routes.generated.ts has no output ${route}; run \`pnpm content:project\`.`);
  return output;
}

/** One approved output: its compiled route document through the shared renderer, inside the site layout. */
export function RoutePage(props: { route: string }): Child {
  const output = outputFor(props.route);
  const document = ROUTES.find((candidate) => candidate.pathname === output.pathname);
  if (!document) throw new Error(`routes.generated.ts has no route document ${output.pathname}; run \`pnpm content:project\`.`);
  return (
    <DefaultLayout route={output.route} title={output.title} description={output.description}>
      {renderRouteDocument(document, pinselRegistry)}
    </DefaultLayout>
  );
}

/** Note article slugs (`/notes/<slug>/`) in output order. */
export function noteSlugs(): string[] {
  return OUTPUTS.flatMap((output) => {
    const match = /^\/notes\/([^/]+)\/$/.exec(output.route);
    return match ? [match[1]!] : [];
  });
}
