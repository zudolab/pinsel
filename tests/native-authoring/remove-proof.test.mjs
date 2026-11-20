import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {assertRemoveRefused,localRootTarget,rootNodeIds,assertRemovalJournal,assertRemovedFromSnapshot,assertRemovedFromPreview,assertRemovedText,rootRemovalReason} from './remove-proof.mjs';
const node={providerId:'files',recordId:'lessons',nodeId:'paragraph-1'};
const journal=()=>({node,text:'Stable inserted paragraph text',laterText:'Stable inserted paragraph text — later saved B',removal:{request:{operation:'document-edit',input:{target:{renderedNodeId:'r1',...node},change:{kind:'remove'}}},receipt:{ok:true,result:{}}}});
const snapshot=(children=[])=>({project:{providers:{compositions:[{id:'files',records:[{id:'lessons',document:{root:[{id:'frame',componentId:'pinsel.site-frame',slots:{main:children}}]}},{id:'lessons-consultation',document:{root:[{id:'section',slots:{}}]}}]}]}}});
const target=(nodeId,recordId,remove)=>({renderedNodeId:`r-${nodeId}`,providerId:'files',recordId,nodeId,capabilities:{remove}});
test('root and shared Mapping targets must be refused with the installed reason',()=>{
 assert.equal(assertRemoveRefused(target('frame','lessons',{allowed:false,reason:rootRemovalReason}),'root'),rootRemovalReason);
 assertRemoveRefused(target('section','lessons-consultation',{allowed:false,reason:'This is a shared Mapping presentation. Edit its shared Content sources; local prop overrides are not supported.'}),'shared');
 assertRemoveRefused(target('section','x',{allowed:false,reason:'Linked/global structure belongs to its source editor.'}),'shared');
 for(const [remove,kind] of [[{allowed:true},'root'],[{allowed:true},'shared'],[{allowed:false,reason:'Some other reason'},'root'],[{allowed:false,reason:rootRemovalReason},'shared'],[undefined,'root'],[{allowed:false},'shared']])assert.throws(()=>assertRemoveRefused(target('frame','lessons',remove),kind));
});
test('the root case uses an actual captured local root, never a guessed node',()=>{const s=snapshot();assert.deepEqual(rootNodeIds(s,'lessons'),['frame']);const targets=[target('section','lessons-consultation',{}),target('frame','lessons',{})];assert.equal(localRootTarget(s,targets,'lessons').nodeId,'frame');assert.throws(()=>localRootTarget(s,[targets[0]],'lessons'));assert.throws(()=>localRootTarget(s,targets,'missing'));});
test('post-removal proof requires the original removal receipt for the journaled node',()=>{assertRemovalJournal(journal());for(const alter of [j=>delete j.removal.receipt,j=>j.removal.receipt.ok=false,j=>j.removal.request.input.change={kind:'field'},j=>j.removal.request.input.target.nodeId='other',j=>delete j.node,j=>j.text='x'])
 {const j=journal();alter(j);assert.throws(()=>assertRemovalJournal(j));}});
test('removed node and its saved texts must be absent from capture, preview and built HTML',()=>{
 const j=journal();assertRemovedFromSnapshot(snapshot([{id:'other',slots:{}}]),j);assert.throws(()=>assertRemovedFromSnapshot(snapshot([{id:'paragraph-1',slots:{}}]),j),/still captured/);
 assertRemovedFromPreview([target('frame','lessons',{})],j);assert.throws(()=>assertRemovedFromPreview([target('paragraph-1','lessons',{})],j));assert.throws(()=>assertRemovedFromPreview([],j));
 assertRemovedText('<main>Lessons</main>',j,'html');for(const html of ['<p>Stable inserted paragraph text</p>','<p>Stable inserted paragraph text — later saved B</p>'])assert.throws(()=>assertRemovedText(html,j,'html'),/still present/);
});
test('negative and follow-up flows are wired to the installed Remove control and the exact build verifier',()=>{const browser=readFileSync(new URL('./browser.mjs',import.meta.url),'utf8'),run=readFileSync(new URL('./run.mjs',import.meta.url),'utf8');for(const text of ["'forged-remove-shared': [{ change: { kind: 'remove' } }, 'unsupported-scope']","'forged-remove-root'","await assertRemoveOffered(root, 'root')","await assertRemoveOffered(await selectConsultation(), 'shared')","mode === 'removed-absence'"])assert(browser.includes(text),text);for(const text of ["await browser('removed-absence')","tests/native-authoring/verify-removal-build.mjs","'Build changed public capture'"])assert(run.includes(text),text);});
