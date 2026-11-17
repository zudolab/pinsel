// Installed5fe provider read wire contract. Composition still uses its challenge gate.
const endpoints={content:'/__zudo_composer_content_provider',compositions:'/__zudo_composer_file_provider',mappings:'/__zudo_composer_mapping_provider',workspace:'/__zudo_composer_workspace_provider'};
const reads=new Set(['initialize','list','get','open','selection','generation','snapshot','read-all','list-models','get-model','get-entry','count-entries','page-entries','scan-entries','find-seeding','missing-directories','editorial-read','editorial-fields','editorial-revisions','editorial-revision','editorial-compare','editorial-publication','editorial-operation','content-ai-status','content-ai-scope','content-ai-read']);
const providerReads={
 [endpoints.content]:reads,
 [endpoints.compositions]:new Set(['initialize','list','get','snapshot','find-seeding','missing-directories']),
 [endpoints.mappings]:new Set(['initialize','read-all','list','get','snapshot']),
 [endpoints.workspace]:new Set(['list','open','selection','generation','find-seeding','missing-directories']),
 '/__zudo_composer_sitemapper_provider':new Set(['initialize','read-all','list','get','snapshot']),
 '/__zudo_composer_asset_file_provider':new Set(['initialize','list','get','snapshot','resolve-version','pin-manifest']),
};
export function isFamilyProviderRead(path,operation){return providerReads[path]?.has(operation)??false;}
