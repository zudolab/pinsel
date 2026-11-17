/** Composition uses a JSON operation envelope, unlike other domain providers. */
export function compositionRead(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const keys=Object.keys(input);if(input.operation==='snapshot')return keys.length===1;
 if(!['list','get'].includes(input.operation))return false;
 const allowed=input.operation==='get'?['operation','id','outputsById']:['operation','outputsById'];
 if(keys.some(key=>!allowed.includes(key)))return false;
 if(input.operation==='get'&&(typeof input.id!=='string'||!input.id))return false;
 // Nonempty outputsById may persist generated output. It is not a pure read.
 if(input.outputsById!==undefined&&(!input.outputsById||typeof input.outputsById!=='object'||Array.isArray(input.outputsById)||Object.keys(input.outputsById).length))return false;
 return true;
}
