// Prints the Node-side body HTML of the home route: compileStaticSite (the
// release compiler) -> renderRouteDocument -> zudo-react server render. The
// Worker tests compare their in-workerd projection against this output, and
// scripts/gate1/parity.mjs compares it against the ZFB build.
import { renderToString } from "@takazudo/zfb/zudo-react/server";
import { pinselRegistry, renderRouteDocument } from "@pinsel/ui";

import { SITE_PROJECT_PATH } from "./entries";
import { structurePack } from "./pack";
import { projectSite } from "./project";

const projectPath = process.argv[2] ?? SITE_PROJECT_PATH;
const { plan } = await projectSite(projectPath, structurePack());
const route = plan.routes.find((candidate) => candidate.pathname === "/");
if (!route) throw new Error(`No / route in ${projectPath}`);
process.stdout.write(renderToString(renderRouteDocument(route, pinselRegistry)));
