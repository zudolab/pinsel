import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import{isFragmentId}from'./fragment-id.mjs';
export function assertOwnedFamilyHtml(html,expected,{moved=false,oldFragment}={}){
 const win=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
 try{
  const doc=new win.DOMParser().parseFromString(html,'text/html');
  const one=(nodes)=>{assert.equal(nodes.length,1);return nodes[0];};
  const section=one(doc.querySelectorAll(`section[id="${expected.fragment}"]`));assert.equal(one(section.querySelectorAll('h2')).textContent,expected.heading);
  let target=section;if(moved){assert(isFragmentId(oldFragment));assert(!section.textContent.includes(expected.childText));target=one(doc.querySelectorAll(`section[id="${oldFragment}"]`));}
  if(expected.kind==='faq'){
   const item=one([...target.querySelectorAll('details')].filter(d=>[...d.querySelectorAll('summary span')].some(s=>s.textContent===expected.childText)));
   assert.equal(one(item.querySelectorAll('.faq-list__answer p')).textContent,expected.secondary);
  }else{
   const row=one([...target.querySelectorAll('li.result-row')].filter(r=>r.querySelector('p')?.textContent===expected.childText));assert.deepEqual([...row.querySelectorAll('p')].map(p=>p.textContent),[expected.childText,expected.secondary]);
  }
  return expected;
 }finally{win.happyDOM.abort();}
}
