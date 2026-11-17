import {test} from 'vitest';import assert from 'node:assert/strict';import {canonicalRoot,selectCanonicalRoot} from './root-selection.mjs';
test('canonical root comes from stable document node ID, not virtual Document or label',()=>{const record={document:{root:[{id:'actual',slots:{children:[{id:'child',slots:{}}]}},{id:'second',slots:{}}]}};assert.equal(canonicalRoot(record).id,'actual');assert.throws(()=>canonicalRoot({document:{root:[]}}));assert.throws(()=>canonicalRoot({document:{root:[{id:'same',slots:{children:[{id:'same',slots:{}}]}}]}}));});
test('root selection uses canonical ARIA child path and refuses wrong inspector ID before editing',async()=>{
 const record={document:{root:[{id:'actual',slots:{}}]}};let id='other',selector,clicked=false;
 const row={click:async()=>{clicked=true;}};const page={getByRole:(role,options)=>role==='tree'?{locator:s=>{selector=s;return row;}}:{click:async()=>{}},locator:()=>({locator:()=>({filter:options=>({idPattern:options.hasText})})})};
 const expect=locator=>({toHaveCount:async()=>{if(locator.idPattern)assert(locator.idPattern.test(id));},toHaveAttribute:async()=>assert(clicked)});
 await assert.rejects(selectCanonicalRoot(page,expect,record));assert.equal(selector,'[role="treeitem"][aria-level="2"][aria-posinset="1"]');id='actual';assert.equal(await selectCanonicalRoot(page,expect,record),'actual');
});
