import { installNativeOwnerIpc } from "./native-owner-ipc.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startComposerDevServer } from "zudo-composer";
import { captureAuthoringWorkspace, resolveAuthoringPackIdentity, resolveAuthoringRendererIdentity } from "zudo-composer/authoring";
import { loadHostContext } from "zudo-composer/vite";
import { nativePublicFiles } from "./prepare-native-public";

// Startup validates existing authority. Only the separate, explicit initializer
// may create a workspace or prepare public files from committed baseline inputs.
const args = process.argv.slice(2).filter(value => value !== "--");
let port = 4190;
let strictPort = false;
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === "--strict-port") strictPort = true;
  else if (arg === "--port") {
    const value = args[++index];
    if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
      throw new Error("--port requires an integer from 1 to 65535");
    }
    port = Number(value);
  } else throw new Error(`Unsupported native authoring option: ${arg}`);
}

const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
try {
  const host = await loadHostContext({ workspaceRoot });
  // Public coherent inspection refuses incomplete/missing stores or another
  // active authoring lease. The result is not written or used to reseed data.
  const snapshot = await captureAuthoringWorkspace({
    ...host,
    packIdentity: await resolveAuthoringPackIdentity(host),
    renderer: await resolveAuthoringRendererIdentity({ composerConfig: host.composerConfig }),
    publicFiles: await nativePublicFiles(workspaceRoot, dirname(host.composerConfig.paths.publicAssets)),
  });
  console.log(`Opening saved native workspace ${snapshot.workspaceId}. Legacy D1 is untouched.`);
} catch (cause) {
  throw new Error(
    "Cannot open the existing native workspace. Preserve saved data and resolve the cause below. " +
    "An older pack workspace requires explicit staged migration; follow docs/composer-note-migration.md and select a verified compatible stage with PINSEL_AUTHORING_STAGE=notes-v1. " +
    "For a new known-data rehearsal only, run pnpm --filter @pinsel/content authoring:init explicitly. " +
    "Never initialize over an existing workspace or substitute committed inputs for owner drafts.",
    { cause },
  );
}
const ipcNonce = process.env.PINSEL_NATIVE_OWNER_IPC_NONCE;
if (ipcNonce !== undefined && (!/^[a-f0-9-]{36}$/.test(ipcNonce) || !process.send || !process.connected)) {
  throw new Error("Native owner IPC requires a valid nonce and inherited connected channel");
}
const { server } = await startComposerDevServer({ workspaceRoot, host: "127.0.0.1", port, strictPort });
server.printUrls();
console.log("Open /composer?native=1. Save and stop this server before offline capture/build.");
const ownerIpc = ipcNonce === undefined ? undefined : installNativeOwnerIpc({
  server, nonce: ipcNonce, port, hostRoot: workspaceRoot,
});
await ownerIpc?.ready();
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    // A Promise alone does not keep Node alive while the server drains writes
    // and releases its lease. Do not impose a deadline on canonical persistence.
    const keepAlive = setInterval(() => {
      console.log("Waiting for safe authoring shutdown; active writes must finish.");
    }, 30_000);
    void (ownerIpc ? ownerIpc.close() : server.close()).then(() => {
      clearInterval(keepAlive);
      process.exit(0);
    }, error => {
      clearInterval(keepAlive);
      console.error(error);
      process.exit(1);
    });
  });
}
