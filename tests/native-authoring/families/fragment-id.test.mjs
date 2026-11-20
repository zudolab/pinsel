import assert from 'node:assert/strict';
import {test} from 'vitest';
import {Window} from 'happy-dom';
import {isFragmentId} from './fragment-id.mjs';
import {validateReadIntent} from './readonly-proof.mjs';
test('rendered Results and FAQ section ids are fragment ids; selector-breaking text is not',()=>{
 for(const id of ['faq-1','year-2015年度','faq-exam'])assert(isFragmentId(id),id);
 for(const id of ['','a b','a"b',"a'b",'a\\b','#a','a\nb','<a>',null,1,'x'.repeat(201)])assert(!isFragmentId(id),String(id));
 const doc=new Window().document;doc.body.innerHTML='<section id="year-2015年度"></section>';assert.equal(doc.querySelectorAll('section[id="year-2015年度"]').length,1);
});
test('a moved Results read-only intent with the real year fragment validates',()=>{
 const snapshot={digest:'a'.repeat(64)};const intent={kind:'family-render',family:'results',marker:'fresh-s-res1-1320',childText:'child',present:false,oldFragment:'year-2015年度',captureDigest:snapshot.digest,capturePath:'/tmp/c.json'};
 validateReadIntent(intent,snapshot);
 assert.throws(()=>validateReadIntent({...intent,oldFragment:'year 2015'},snapshot));
});
