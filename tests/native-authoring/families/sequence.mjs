import {loadFamilyInstallationSupplement} from './installation-supplement-loader.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {nextFamilyIntent} from './sequence-core.mjs';
export {nextFamilyIntent} from './sequence-core.mjs';
import {loadFamilyInstallationBridge} from './installation-bridge.mjs';
import {repoRoot} from './config.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const[configPath,capturePath,historyPath,activePath,out,bridgePath,supplementPath]=process.argv.slice(2);assert([configPath,capturePath,historyPath,activePath,out].every(p=>p?.startsWith('/')));assert(process.argv.slice(2).length<=7);if(supplementPath)assert(bridgePath&&supplementPath.startsWith('/'));const read=async p=>JSON.parse(await readFile(p,'utf8'));const paths=await read(historyPath);assert(Array.isArray(paths));const history=await Promise.all(paths.map(read));const chained=supplementPath?await loadFamilyInstallationSupplement({originalDescriptor:await read(bridgePath),descriptor:await read(supplementPath),repo:repoRoot}):undefined;const installationBridge=chained?.originalBridge??(bridgePath?await loadFamilyInstallationBridge({descriptor:await read(bridgePath),repo:repoRoot}):undefined);const next=nextFamilyIntent({installationBridge,installationSupplement:chained?.supplement,config:await read(configPath),snapshot:await read(capturePath),history,expectedActive:await read(activePath),capturePath});await writeFile(out,JSON.stringify(next,null,2),{flag:'wx'});console.log(JSON.stringify({step:next.sequence?.step,complete:next.complete??false}));}
