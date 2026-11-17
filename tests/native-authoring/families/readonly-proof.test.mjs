import {releaseLifecycle} from './release-lifecycle.mjs';
import {describe,it,expect} from 'vitest';
import {classifyRead,closingReadAction,validateReadIntent,activeReadback} from './readonly-proof.mjs';
const headers={'x-zudo-composer-workspace':'pinsel','x-zudo-composer-capability':'fixture-capability'};
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

// Wire-shaped fixtures from installed Composer5fe6d8d's shared domain client,
// Assets store and workspace registry. Capability is deliberately synthetic.
const capability={'content-type':'application/json','x-zudo-composer-capability':'fixture-capability'};
const wire=(provider,operation,body=null)=>({path:`/__zudo_composer_${provider}_provider`,headers:{...capability,[provider==='asset_file'?'x-zudo-composer-asset-operation':'x-zudo-composer-operation']:operation,...(['content','mapping','sitemapper'].includes(provider)?{'x-zudo-composer-workspace':'pinsel'}:{})},body});
const admit=request=>classifyRead(request.path,request.headers,request.body,'pinsel');
describe('installed provider wire scopes',()=>{
 it.each([
  wire('asset_file','initialize'),wire('asset_file','snapshot'),wire('asset_file','list',{}),wire('asset_file','get'),
  wire('workspace','list'),wire('workspace','selection'),wire('workspace','generation'),wire('workspace','open',{}),wire('workspace','open',{id:'pinsel'}),
  wire('content','read-all'),wire('content','get-model',{id:'note'}),wire('mapping','snapshot'),wire('sitemapper','snapshot'),wire('sitemapper','get',{id:'main'}),
 ])('admits installed read $path $headers',request=>expect(admit(request)).toBe('provider'));
 it.each(['content','mapping','sitemapper'])('keeps %s workspace scope required',provider=>{
  const request=wire(provider,provider==='content'?'read-all':'snapshot');delete request.headers['x-zudo-composer-workspace'];expect(()=>admit(request)).toThrow();request.headers['x-zudo-composer-workspace']='foreign';expect(()=>admit(request)).toThrow();
 });
 it.each(['asset_file','workspace','content','mapping','sitemapper'])('requires capability and denies writes for %s',provider=>{
  const read=wire(provider,provider==='content'?'read-all':provider==='workspace'?'list':'snapshot');delete read.headers['x-zudo-composer-capability'];expect(()=>admit(read)).toThrow();
  for(const operation of ['put','put-entry','put-model','delete','delete-entry','transact','transaction','seed','clear','start-fresh','reconcile-publication','editorial-save','editorial-restore','content-ai-apply','content-ai-undo','create','update','complete','mark-seed-cleanup','discard-seeding','delete-directories','upload','replace','metadata','trash','restore','create-folder','update-folder','trash-folder','restore-folder'])expect(()=>admit(wire(provider,operation,{}))).toThrow();
 });
 it('does not accept misspelled provider or use another domain read allowlist',()=>{
  expect(()=>admit(wire('sitemap','snapshot'))).toThrow();expect(()=>admit(wire('asset_file','read-all'))).toThrow();expect(()=>admit(wire('mapping','editorial-read'))).toThrow();
 });
 it('binds explicit registry target and actual selected/opened result without forged header',async()=>{
  const {assertReadScope}=await import('./readonly-proof.mjs');
  expect(()=>admit(wire('workspace','open',{id:'foreign'}))).toThrow();
  const open=wire('workspace','open',{}),selection=wire('workspace','selection');
  expect(()=>assertReadScope(open.path,open.headers,{id:'pinsel'},'pinsel')).not.toThrow();
  expect(()=>assertReadScope(open.path,open.headers,{id:'foreign'},'pinsel')).toThrow();
  expect(()=>assertReadScope(selection.path,selection.headers,'foreign','pinsel')).toThrow();
  expect(()=>assertReadScope(selection.path,selection.headers,'pinsel','pinsel')).not.toThrow();
  const conflicting=wire('asset_file','snapshot');conflicting.headers['x-zudo-composer-workspace']='foreign';expect(()=>admit(conflicting)).toThrow();
 });
});

describe('readonly close fence classification',()=>{
 it('aborts known late reads without dispatching or admitting a write',()=>{
  expect(closingReadAction('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-operation':'read-all'},{},'pinsel')).toBe('abort-read');
  expect(closingReadAction('/__zudo-release',rh,release('list'),'pinsel')).toBe('abort-read');
  expect(closingReadAction('/__zudo_composer_file_provider',headers,{operation:'list'},'pinsel')).toBe('abort-read');
 });
 it('keeps unknown, canonical mutation and foreign scope refusals during close',()=>{
  for(const op of ['transact','put-entry','delete-entry'])expect(()=>closingReadAction('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-operation':op},{},'pinsel')).toThrow();
  for(const op of ['put','remove','transact'])expect(()=>closingReadAction('/__zudo_composer_file_provider',headers,{operation:op,outputsById:{x:{status:'generated',code:''}}},'pinsel')).toThrow();
  expect(()=>closingReadAction('/unknown',headers,{},'pinsel')).toThrow();
  expect(()=>closingReadAction('/__zudo-release',rh,release('activate'),'pinsel')).toThrow();
  expect(()=>closingReadAction('/__zudo-native-edit',{}, {operation:'apply'},'pinsel')).toThrow();
  expect(()=>closingReadAction('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-workspace':'foreign','x-zudo-composer-operation':'read-all'},{},'pinsel')).toThrow();
 });
 it('delegates nonempty derived output only to the existing exact challenge gate',()=>{
  expect(closingReadAction('/__zudo_composer_file_provider',headers,{operation:'get',id:'a',outputsById:{a:{status:'generated',code:'x'}}},'pinsel')).toBe('settle-composition');
  expect(()=>closingReadAction('/__zudo_composer_file_provider',headers,{operation:'get',outputsById:[]},'pinsel')).toThrow();
 });
});

it('late known read abort settles cleanly, but late mutation still poisons close',async()=>{
 for(const operation of ['read-all','transact']){
  let blocked,aborted=0,dispatched=0;
  const lane={async drain(){if(blocked)throw blocked;}};
  const lifecycle=releaseLifecycle({lanes:[lane],composition:{assertSettled(){}},blocked:()=>blocked});
  const close=lifecycle.close({async close(){
   expect(lifecycle.closing).toBe(true);
   try{const action=closingReadAction('/__zudo_composer_content_provider',{...headers,'x-zudo-composer-operation':operation},{},'pinsel');if(action==='abort-read')aborted++;else dispatched++;}catch(error){blocked=error;aborted++;}
  }});
  if(operation==='read-all')await close;else await expect(close).rejects.toThrow();
  expect(aborted).toBe(1);expect(dispatched).toBe(0);
 }
});
