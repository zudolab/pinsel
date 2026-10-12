// Prints the Node-side body HTML of the home route: compileStaticSite (the
// release compiler) -> renderRouteDocument -> zudo-react server render. The
// Worker tests compare their in-workerd projection against this output, and
// scripts/gate1/parity.mjs compares it against the ZFB build.
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { pinselPack, pinselRegistry, renderRouteDocument } from "@pinsel/ui";
import { stripSiteBuildModules } from "zudo-composer/content";
import { compileStaticSite } from "zudo-composer/site-build";
import { join } from "node:path";

import { SITE_PROJECT_DIR, SITE_PROJECT_PATH } from "./entries";
import { GATE1_ROUTE } from "./proof";

const projectPath = process.argv[2] ?? SITE_PROJECT_PATH;
const compiled = await compileStaticSite({ projectPath, pack: pinselPack, assetsStoreRoot: join(SITE_PROJECT_DIR, "assets") });
const route = stripSiteBuildModules(compiled.build).routes.find((candidate) => candidate.pathname === GATE1_ROUTE);
if (!route) throw new Error(`No ${GATE1_ROUTE} route in ${projectPath}`);
process.stdout.write(renderToString(renderRouteDocument(route, pinselRegistry)));
