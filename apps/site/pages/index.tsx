import type { Child } from "@takazudo/zfb/zudo-react";
import { pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import DefaultLayout from "~/layouts/default";
import { OUTPUTS, ROUTES } from "~/data/routes.generated";

// The home route rendered from the projected route document, with its
// <title>/description from Content (`page-copy` for "/").
export default function Index(): Child {
  const output = OUTPUTS.find((candidate) => candidate.route === "/");
  const route = ROUTES.find((candidate) => candidate.pathname === output?.pathname);
  if (!output || !route) throw new Error('routes.generated.ts has no "/" route; run `pnpm content:project`.');
  return (
    <DefaultLayout pathname="/" title={output.title} description={output.description}>
      {renderRouteDocument(route, pinselRegistry)}
    </DefaultLayout>
  );
}
