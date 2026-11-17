import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {freezeReadInputs,assertInputsUnchanged,readFrozenBundle,inputHash} from './frozen-inputs.mjs';
it('freezes actual parent inputs and rejects a changed mode or accepted Header proof before child use',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'readonly-inputs-'));
 try {
  const intentPath=join(dir,'intent.json'),capturePath=join(dir,'capture.json'),forwardProofPath=join(dir,'header.json'),bundlePath=join(dir,'bundle.json');
  const intent={kind:'header-restart',capturePath,forwardProofPath};
  await writeFile(intentPath,JSON.stringify(intent));await writeFile(capturePath,JSON.stringify({digest:'original'}));await writeFile(forwardProofPath,JSON.stringify({status:'PUBLIC_CAPTURE_VERIFIED'}));
  const inputs=await freezeReadInputs(intentPath),bytes=JSON.stringify(inputs),hash=inputHash(bytes);await writeFile(bundlePath,bytes);
  await expect(assertInputsUnchanged(inputs.hashes)).resolves.toBeUndefined();
  await writeFile(intentPath,JSON.stringify({...intent,kind:'active-identity'}));
  expect((await readFrozenBundle(bundlePath,hash)).intent.kind).toBe('header-restart');
  await expect(assertInputsUnchanged(inputs.hashes)).rejects.toThrow('input changed');
  await writeFile(intentPath,JSON.stringify(intent));await writeFile(forwardProofPath,JSON.stringify({status:'FAILED'}));
  await expect(assertInputsUnchanged(inputs.hashes)).rejects.toThrow('input changed');
  await writeFile(bundlePath,JSON.stringify({...inputs,intent:{...intent,kind:'active-identity'}}));
  await expect(readFrozenBundle(bundlePath,hash)).rejects.toThrow('bundle changed');
 } finally {await rm(dir,{recursive:true});}
});

it.each(['record-edit','header'])('seals mutating %s intent and whole snapshot even when digest is unchanged',async kind=>{
 const dir=await mkdtemp(join(tmpdir(),'mutation-inputs-'));
 try{const capturePath=join(dir,'capture.json'),intentPath=join(dir,'intent.json'),bundlePath=join(dir,'accepted.json');const intent={kind,capturePath,captureDigest:'same',value:'reviewed'},snapshot={digest:'same',project:{name:'accepted'}};await writeFile(intentPath,JSON.stringify(intent));await writeFile(capturePath,JSON.stringify(snapshot));const inputs=await freezeReadInputs(intentPath),bytes=JSON.stringify(inputs),hash=inputHash(bytes);await writeFile(bundlePath,bytes,{flag:'wx',mode:0o444});
 await writeFile(intentPath,JSON.stringify({...intent,value:'other'}));await expect(assertInputsUnchanged(inputs.hashes)).rejects.toThrow();expect((await readFrozenBundle(bundlePath,hash)).intent.value).toBe('reviewed');
 await chmod(bundlePath,0o600); // Simulate replacement by its owner; the independent hash must still refuse.
 for(const changed of [{...inputs,intent:{...intent,value:'other'}},{...inputs,snapshot:{...snapshot,project:{name:'other'}}}]){await writeFile(bundlePath,JSON.stringify(changed));await expect(readFrozenBundle(bundlePath,hash)).rejects.toThrow();}
 }finally{await rm(dir,{recursive:true});}
});

for(const kind of ['knowledge-saved-reference','header-saved-href'])it(`${kind} freezes original journal and all capture evidence before child use`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'saved-reference-inputs-'));
 try{const paths=Object.fromEntries(['bundle','bundleHash','before','after','events','provenance'].map(k=>[k,join(dir,k+'.json')]));for(const path of Object.values(paths))await writeFile(path,'{}');await writeFile(paths.events,'{"phase":"begin"}\n{"phase":"held"}\n');
 const intentPath=join(dir,'intent.json'),recoveryEvidencePath=join(dir,'recovery.json');await writeFile(recoveryEvidencePath,JSON.stringify(paths));await writeFile(intentPath,JSON.stringify({kind,capturePath:paths.after,recoveryEvidencePath}));
 const inputs=await freezeReadInputs(intentPath);expect(inputs.savedReference.events.map(e=>e.phase)).toEqual(['begin','held']);expect(Object.keys(inputs.savedReference.hashes)).toHaveLength(6);await assertInputsUnchanged(inputs.hashes);await writeFile(paths.events,'{"phase":"substituted"}');await expect(assertInputsUnchanged(inputs.hashes)).rejects.toThrow('input changed');expect(inputs.savedReference.events[1].phase).toBe('held');
 }finally{await rm(dir,{recursive:true});}
});

it('captured reference manifest requires and freezes the save-only UI result',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'captured-reference-inputs-'));
 try{const paths=Object.fromEntries(['bundle','bundleHash','before','after','events','provenance','uiResult'].map(k=>[k,join(dir,k+'.json')]));for(const path of Object.values(paths))await writeFile(path,'{}');
 const intentPath=join(dir,'intent.json'),recoveryEvidencePath=join(dir,'evidence.json');await writeFile(recoveryEvidencePath,JSON.stringify(paths));await writeFile(intentPath,JSON.stringify({kind:'knowledge-captured-reference',capturePath:paths.after,recoveryEvidencePath}));const inputs=await freezeReadInputs(intentPath);expect(inputs.savedReference.uiResult).toEqual({});expect(Object.keys(inputs.savedReference.hashes)).toHaveLength(7);await writeFile(paths.uiResult,'{"stage":"wrong"}');await expect(assertInputsUnchanged(inputs.hashes)).rejects.toThrow();
 }finally{await rm(dir,{recursive:true});}
});
