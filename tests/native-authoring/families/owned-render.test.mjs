import {test} from 'vitest';import assert from 'node:assert/strict';
import {assertOwnedFamilyHtml} from './owned-html.mjs';
import {artifactFiles} from './static-visitor.mjs';
import {mkdtemp,writeFile,symlink,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
for(const kind of ['faq','results'])test(`${kind} owned secondary content and exact parent heading cannot be omitted or borrowed`,()=>{
 const expected={kind,fragment:'family-proof',heading:'Parent',childText:'Child',secondary:'Owned secondary'};
 const item=kind==='faq'?'<details><summary><span>Q.</span><span>Child</span></summary><div class="faq-list__answer"><p>Owned secondary</p></div></details>':'<li class="result-row"><div><p>Child</p><p>Owned secondary</p></div></li>';
 const html=`<section id="family-proof"><h2>Parent</h2>${item}</section>`;
 assert.doesNotThrow(()=>assertOwnedFamilyHtml(html,expected));for(const bad of [html.replace('Owned secondary',''),html.replace('Parent','Wrong'),html.replace('Owned secondary','Wrong')+'<p>Owned secondary</p>',html.replace(item,item+item)])assert.throws(()=>assertOwnedFamilyHtml(bad,expected));
 const moved=`<section id="family-proof"><h2>Parent</h2></section><section id="old">${item}</section>`;assert.doesNotThrow(()=>assertOwnedFamilyHtml(moved,expected,{moved:true,oldFragment:'old'}));assert.throws(()=>assertOwnedFamilyHtml(moved.replace('Owned secondary','Wrong'),expected,{moved:true,oldFragment:'old'}));
});
test('artifact byte manifest detects changes and refuses symlinks',async()=>{const root=await mkdtemp(join(tmpdir(),'family-artifact-'));try{await writeFile(join(root,'index.html'),'one');const before=await artifactFiles(root);await writeFile(join(root,'index.html'),'two');assert.notDeepEqual(await artifactFiles(root),before);await symlink('index.html',join(root,'alias'));await assert.rejects(artifactFiles(root));}finally{await rm(root,{recursive:true});}});
