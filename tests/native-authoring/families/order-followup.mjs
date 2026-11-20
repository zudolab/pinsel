import assert from 'node:assert/strict';
import {FAMILY,verifyFamily} from './family-graph.mjs';
import {getRecord,auditDelta,admitContentField} from './intents.mjs';
/** Requires two already accepted/published children; never creates or guesses IDs. */
export function orderedChildren(snapshot,family,kind,second){
 verifyFamily(snapshot,family,kind);const spec=FAMILY[kind];assert.deepEqual({providerId:second.providerId,modelId:second.modelId},{providerId:family.content.child.providerId,modelId:spec.childModel});assert.notEqual(second.recordId,family.content.child.recordId);
 const refs=[family.content.child,second],rows=refs.map(ref=>({ref,entry:getRecord(snapshot,'content',ref)}));
 for(const {entry}of rows){assert.equal(entry.lifecycle,'published');assert.deepEqual(entry.values[spec.referenceField],family.content.parent);assert(Number.isFinite(entry.values[spec.orderField]));}
 assert.notEqual(rows[0].entry.values[spec.orderField],rows[1].entry.values[spec.orderField],'Tied order cannot prove reversal');
 return rows.sort((a,b)=>a.entry.values[spec.orderField]-b.entry.values[spec.orderField]);
}
export function childOrderIntent(snapshot,family,kind,second,value,capturePath){orderedChildren(snapshot,family,kind,second);assert(Number.isFinite(value));const spec=FAMILY[kind];assert.notEqual(value,getRecord(snapshot,'content',second).values[spec.orderField]);assert.notEqual(value,getRecord(snapshot,'content',family.content.child).values[spec.orderField]);return{kind:'content-field',domain:'content',family:kind,owner:second,fieldId:spec.orderField,value,capturePath,captureDigest:snapshot.digest};}
export function assertChildOrderDelta(before,after,family,kind,second,intent,result){assert.deepEqual(intent,childOrderIntent(before,family,kind,second,intent.value,intent.capturePath));admitContentField(before,intent,{record:result});auditDelta(before,after,intent,result);return orderedChildren(after,family,kind,second).map(x=>x.ref);}
export async function assertChildDOMOrder(root,snapshot,family,kind,second,expect){const rows=orderedChildren(snapshot,family,kind,second),fragment=kind==='results'?`year-${family.marker}`:family.marker,section=root.locator(`section[id="${fragment}"]`);await expect(section).toHaveCount(1);const field=kind==='faq'?'faq-item-question':'result-entry-school',texts=rows.map(x=>x.entry.values[field]);assert.notEqual(texts[0],texts[1]);const actual=kind==='faq'?section.locator('details > summary > span:nth-child(2)'):section.locator('li.result-row p:first-child');await expect(actual).toHaveText(texts);return rows.map(x=>x.ref);}
