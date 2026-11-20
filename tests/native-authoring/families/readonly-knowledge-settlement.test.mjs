import assert from 'node:assert/strict';
import {test} from 'vitest';
import {readFile} from 'node:fs/promises';
test('a non-recovered Knowledge restart settles terminal reads after the Note preview',async()=>{
 const source=await readFile(new URL('./readonly-browser.mjs',import.meta.url),'utf8');
 assert(source.includes("(boundary==='after-knowledge-preview'&&(recovered||accepted.intent.kind==='knowledge-reference'))"),'Knowledge restarts must not wait for network idle after the Note preview');
 assert(source.includes("'Exact target preview response required'"),'The exact Note target preview stays required');
});
