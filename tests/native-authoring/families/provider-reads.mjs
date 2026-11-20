import {contentReadOperations} from '../content-browser-transport.mjs';
// Installed5fe provider read wire contract. Composition still uses its challenge gate.
const endpoints={content:'/__zudo_composer_content_provider',compositions:'/__zudo_composer_file_provider',mappings:'/__zudo_composer_mapping_provider',workspace:'/__zudo_composer_workspace_provider'};

const providerReads={
 [endpoints.content]:contentReadOperations,
 [endpoints.compositions]:new Set(['initialize','list','get','snapshot','find-seeding','missing-directories']),
 [endpoints.mappings]:new Set(['initialize','read-all','list','get','snapshot']),
 [endpoints.workspace]:new Set(['list','open','selection','generation','find-seeding','missing-directories']),
 '/__zudo_composer_sitemapper_provider':new Set(['initialize','read-all','list','get','snapshot']),
 '/__zudo_composer_asset_file_provider':new Set(['initialize','list','get','snapshot','resolve-version','pin-manifest']),
};
export function isFamilyProviderRead(path,operation){return providerReads[path]?.has(operation)??false;}
