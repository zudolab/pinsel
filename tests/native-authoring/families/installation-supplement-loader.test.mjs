import {test} from 'vitest';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inputHash} from './expected-hashes.mjs';
import {loadFamilyInstallationSupplement,assertHistoricalFamilySource} from './installation-supplement-loader.mjs';
import {parseSupplementArgs} from './prepare-installation-supplement.mjs';
import {familyConsumers} from './installation-history.mjs';
test('supplement loader rejects changed sealed evidence before looking up any installation',async()=>{
 const freeze=Buffer.from(JSON.stringify({'/proof':inputHash('original')})),descriptor={freezeManifestPath:'/freeze',freezeManifestSha256:inputHash(freeze),proofPath:'/proof'};
 await assert.rejects(loadFamilyInstallationSupplement({originalDescriptor:{},descriptor,repo:'/unused',bytes:async path=>path==='/freeze'?freeze:Buffer.from('changed')}),/Frozen supplement dependency changed/);
});
test('historical source identity is checked against immutable git objects, not current checkout bytes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-historical-source-'));try{
  execFileSync('git',['init','--quiet',dir]);const sha='a'.repeat(40),hashes={};for(const consumer of familyConsumers){const path=consumer+'/package.json',bytes=JSON.stringify({dependencies:{'zudo-composer':`git+https://github.com/Takazudo/zudo-composer.git#${sha}`}});await import('node:fs/promises').then(m=>m.mkdir(join(dir,consumer),{recursive:true}));await writeFile(join(dir,path),bytes);hashes[path]=inputHash(bytes);}execFileSync('git',['-C',dir,'add','.']);execFileSync('git',['-C',dir,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--quiet','-m','fixture']);const head=execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();const installation={source:{head,hashes},composer:sha};await writeFile(join(dir,'apps/editor/package.json'),'changed live checkout');await assertHistoricalFamilySource(dir,installation);await assert.rejects(assertHistoricalFamilySource(dir,{...installation,source:{head,hashes:{...hashes,'unknown':'b'.repeat(64)}}}),/inventory/);await assert.rejects(assertHistoricalFamilySource(dir,{...installation,composer:'b'.repeat(40)}));
 }finally{await rm(dir,{recursive:true});}
});
test('actual two-descriptor CLI reaches validation without reentering CLI module',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-supplement-cli-'));try{for(const name of ['config','capture','history','active','original'])await writeFile(join(dir,name+'.json'),name==='history'?'[]':'{}');const result=spawnSync(process.execPath,[fileURLToPath(new URL('./sequence.mjs',import.meta.url)),...['config','capture','history','active'].map(n=>join(dir,n+'.json')),join(dir,'out.json'),join(dir,'original.json'),join(dir,'missing-supplement.json')],{encoding:'utf8',timeout:10000});assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/ENOENT/);assert(!result.stderr.includes('unsettled top-level await'));}finally{await rm(dir,{recursive:true});}
});
test('supplement preparation refuses missing and duplicate flags before any work',()=>{assert.throws(()=>parseSupplementArgs([]));assert.throws(()=>parseSupplementArgs(['--before','/a','--before','/b']));});
