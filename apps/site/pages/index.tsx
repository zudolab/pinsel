import type { Child } from "@takazudo/zfb/zudo-react";
import { pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import DefaultLayout from "~/layouts/default";
import { ROUTES } from "~/data/routes.generated";

// Gate-1: the home route rendered from the projected route document. The
// metadata below is the `page-copy` entry for "/"; the routes sub-issue reads
// it from the generated data instead of this literal.
const HOME_META = { title: "Pinsel - ドイツ美大受験オンラインクラス", description: "ドイツ美大受験をマンツーマンでサポート。123件以上の合格実績。" };

export default function Index(): Child {
  const route = ROUTES.find((candidate) => candidate.pathname === "/");
  if (!route) throw new Error('routes.generated.ts has no "/" route; run `pnpm content:project`.');
  return (
    <DefaultLayout pathname="/" title={HOME_META.title} description={HOME_META.description}>
      {renderRouteDocument(route, pinselRegistry)}
    </DefaultLayout>
  );
}
