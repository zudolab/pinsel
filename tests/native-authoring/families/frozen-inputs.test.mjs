import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
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
