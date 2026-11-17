import {test} from 'vitest';
import assert from 'node:assert/strict';
import {isFamilyProviderRead} from './provider-reads.mjs';

test('installed catalogue and asset reads do not hold the family writer',()=>{
 for(const [path,operation] of [
  ['/__zudo_composer_sitemapper_provider','read-all'],
  ['/__zudo_composer_mapping_provider','read-all'],
  ['/__zudo_composer_asset_file_provider','pin-manifest'],
 ]) assert.equal(isFamilyProviderRead(path,operation),true);
});
test('read admission stays endpoint-specific and cannot admit writes',()=>{
 for(const provider of ['sitemapper','mapping','content','workspace','asset_file']){
  const path=`/__zudo_composer_${provider}_provider`;
  for(const operation of ['put','put-entry','delete','update','publish','replace-all'])
   assert.equal(isFamilyProviderRead(path,operation),false);
 }
 assert.equal(isFamilyProviderRead('/__zudo_composer_content_provider','pin-manifest'),false);
 assert.equal(isFamilyProviderRead('/__zudo_composer_unknown_provider','read-all'),false);
});
