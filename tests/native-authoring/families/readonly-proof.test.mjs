import {describe,it,expect} from 'vitest';
import {classifyRead,validateReadIntent,activeReadback} from './readonly-proof.mjs';
const headers={'x-zudo-composer-workspace':'pinsel'};
const release=operation=>({clientId:'c',requestId:'r',request:{protocolVersion:2,operation}});
const rh={'x-zudo-release-client':'c','x-zudo-release-request':'r'};
describe('standalone readonly admission',()=>{
 it.each(['put-entry','create','delete','transact','reconcile-publication'])('denies provider %s',operation=>expect(()=>classifyRead('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-operation':operation},{},'pinsel')).toThrow());
 it.each(['plan','apply','build','activate'])('denies release %s',op=>expect(()=>classifyRead('/__zudo-release',rh,release(op),'pinsel')).toThrow());
 it('denies unknown endpoints, workspace mismatch and unqualified release',()=>{
  expect(()=>classifyRead('/__zudo_unknown',headers,{},'pinsel')).toThrow();
  expect(()=>classifyRead('/__zudo_composer_content_provider',{'x-zudo-composer-workspace':'other','x-zudo-composer-operation':'read-all'},{},'pinsel')).toThrow();
  expect(()=>classifyRead('/__zudo-release',{},release('list'),'pinsel')).toThrow();
 });
 it('admits declared reads and delegates composition to the existing challenge gate',()=>{
  expect(classifyRead('/__zudo_composer_file_provider',headers,{operation:'get'},'pinsel')).toBe('composition');
  expect(classifyRead('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-operation':'read-all'},{},'pinsel')).toBe('provider');
  expect(classifyRead('/__zudo-release',rh,release('list'),'pinsel')).toBe('release');
 });
 it('denies native Apply and binds render intent to capture',()=>{
  expect(()=>classifyRead('/__zudo-native-edit',{}, {operation:'apply'},'pinsel')).toThrow();
  const snapshot={digest:'a'.repeat(64)},intent={kind:'family-render',captureDigest:snapshot.digest,capturePath:'/accepted.json',family:'faq',marker:'review-faq',childText:'Question',present:true};
  expect(()=>validateReadIntent(intent,snapshot)).not.toThrow();
  expect(()=>validateReadIntent({...intent,captureDigest:'b'.repeat(64)},snapshot)).toThrow();
  expect(()=>validateReadIntent({...intent,present:false},snapshot)).toThrow();
 });
 it('requires actual catalog AND exact project read, refuses staged drift',()=>{
  const p=activeReadback('pinsel'),active={projectId:'pinsel',revision:'r1',buildId:'b1'},catalog={projects:[{projectId:'pinsel',head:'r1'}],active};
  expect(()=>p.finish()).toThrow();p.observe({operation:'list'},catalog);expect(()=>p.finish()).toThrow();
  expect(()=>p.observe({operation:'get',projectId:'pinsel',revision:'wrong'},{project:{id:'pinsel'},revision:'wrong'})).toThrow();
  p.observe({operation:'get',...active},{project:{id:'pinsel'},revision:'r1'});expect(p.finish()).toEqual(active);
  expect(()=>p.observe({operation:'list'},{...catalog,projects:[{projectId:'pinsel',head:'r2'}]})).toThrow();
 });
});

describe('saved preview binding',()=>{
 it('refuses another preview revision and requires a successful matching Header proof',async()=>{
  const {assertPreviewIdentity,validateHeaderRestart}=await import('./readonly-proof.mjs');
  const snapshot={workspaceId:'pinsel',digest:'a'.repeat(64),project:{componentPack:{packId:'pinsel',packVersion:'0.4.0'},providers:{content:[{id:'content-filesystem',entries:[{id:'link',modelId:'nav-link',values:{label:'About'}}]}]}},renderer:{id:'r',version:'v',digest:'d'}};
  const preview={identity:{workspaceId:'pinsel',revision:snapshot.digest,packId:'pinsel',packVersion:'0.4.0',rendererId:'r',rendererVersion:'v',rendererDigest:'d',pathname:'/'}};
  expect(()=>assertPreviewIdentity(snapshot,preview)).not.toThrow();
  expect(()=>assertPreviewIdentity(snapshot,{identity:{...preview.identity,revision:'other'}})).toThrow();
  const proof={status:'PUBLIC_CAPTURE_VERIFIED',afterDigest:snapshot.digest,intent:{kind:'header'},ref:{providerId:'content-filesystem',modelId:'nav-link',recordId:'link'},result:{record:{values:{label:'About'}}},field:'label',value:'About'};
  expect(()=>validateHeaderRestart(snapshot,proof)).not.toThrow();
  expect(()=>validateHeaderRestart(snapshot,{...proof,afterDigest:'other'})).toThrow();
  expect(()=>validateHeaderRestart(snapshot,{...proof,status:'FAILED'})).toThrow();
 });
});
