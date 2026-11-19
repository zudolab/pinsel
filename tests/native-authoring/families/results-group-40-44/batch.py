"""Unfilled Results40–44 group and attachment batch. Earlier drivers are not this file."""
from pathlib import Path
import copy,datetime,hashlib,json,os,re,shutil,socket,subprocess
BATCH_BINDINGS=None
REPO=Path('/workspace/pinsel-baseline-publication')
PIN='c5ffd410f74ba4b3aa003da068efeeae6e663c37'
GUARD='/workspace/codex-settings/.portable-profile-home/.codex/scripts/heavy-guard.sh'
REAPER='/workspace/composer-adoption-notes/run-with-child-reaper.py'
KEYS=['familyInstallationBridge','familyInstallationSupplement','familySourceRebind','familySourceRebindSuccessor','familySourceCreateHandoff','familySavedCreateHandoff','familySourceBoundary23','familyContinuation']
CONFIG_HASH='c6aa85fcdc88798c90221edd45d81a41d24198c777cbec529901d359c932e35d'
RESERVE=1073741824;PHASE_BUDGET=134217728
ENV={'npm_config_userconfig':'/workspace/.cache/npm-config','NPM_CONFIG_USERCONFIG':'/workspace/.cache/npm-config','npm_config_cache':'/workspace/.cache/npm','NPM_CONFIG_CACHE':'/workspace/.cache/npm','XDG_DATA_HOME':'/workspace/.cache/data','XDG_CACHE_HOME':'/workspace/.cache','COREPACK_HOME':'/workspace/.cache/corepack','HEAVY_GUARD_DIR':'/workspace/.cache/agent-guard/heavy','PINSEL_AUTHORING_STAGE':'notes-v1','PLAYWRIGHT_BROWSERS_PATH':'/workspace/.cache/ms-playwright'}
def digest(data):return hashlib.sha256(data).hexdigest()
def require(ok,message):
 if not ok:raise ValueError(message)
def absolute(p):return isinstance(p,str) and Path(p).is_absolute()
def validate_bindings(b):
 require(isinstance(b,dict),'Unfilled final bindings: no execution')
 required={'source','descriptors','history23','historyIn','config','active','installationAudit','runtimePlan','shutdownReview','sourceBoundary','frozen','outputs','knownOwnedPids'}
 require(set(b)==required,'Exact binding keys required')
 require(isinstance(b['source'],str) and re.fullmatch('[a-f0-9]{40}',b['source']) is not None,'Final reviewed source missing')
 require(isinstance(b['descriptors'],list) and len(b['descriptors'])==8 and len(set(b['descriptors']))==8,'Eight distinct descriptors required')
 require(all(absolute(p) for p in b['descriptors']),'Descriptor paths absolute')
 for k in ['history23','historyIn','config','active','installationAudit','runtimePlan','shutdownReview','sourceBoundary']:require(absolute(b[k]),'Absolute input '+k)
 require(isinstance(b['frozen'],dict) and b['frozen'],'Missing reviewed input hashes')
 for p,h in b['frozen'].items():require(absolute(p) and isinstance(h,str) and re.fullmatch('[a-f0-9]{64}',h) is not None,'Invalid frozen hash')
 for p in b['descriptors']+[b[k] for k in ['history23','historyIn','config','active','installationAudit','runtimePlan','shutdownReview','sourceBoundary']]+[REAPER]:require(p in b['frozen'],'Unsealed input '+p)
 require(isinstance(b['knownOwnedPids'],list) and all(isinstance(x,int) and x>0 for x in b['knownOwnedPids']),'Known PID evidence required')
 out=b['outputs'];require(set(out)=={'intent','artifact','generateLog','runtimeLog','verifyLog','journal','result','historyOut','hold'},'Exact exclusive output keys')
 require(all(absolute(p) and not Path(p).is_relative_to(REPO) for p in out.values()),'Outputs must be external absolute paths')
 validate_output_paths(out,b['frozen'])
 require(not(set(out.values())&set(b['frozen'])),'Output overwrites frozen input')
 return b

def canonical_output(p):
 path=Path(p);require(absolute(p) and '..' not in path.parts,'Noncanonical output path')
 for part in [path,*path.parents]:require(not part.is_symlink(),'Symlink output ancestry '+str(part))
 return path.resolve(strict=False)
def validate_output_paths(outputs,frozen):
 paths=[canonical_output(p)for p in outputs.values()]
 require(len(set(paths))==len(paths),'Canonical output alias')
 for path in paths:
  require(not path.is_relative_to(REPO.resolve()),'Output resolves inside consumer')
  require(not os.path.lexists(path),'Existing or dangling output')
  require(all(path!=Path(p).resolve()for p in frozen),'Output aliases frozen input')
 for i,path in enumerate(paths):
  require(all(not(path.is_relative_to(other)or other.is_relative_to(path))for other in paths[i+1:]),'Nested output paths')
def classify_helpers(rows,known):
 owned=set(known)
 for _ in rows:
  owned.update(r['pid']for r in rows if r['ppid']in owned)
 observations=[]
 for r in rows:
  cmd=r['command'];cwd=r['cwd'];direct=str(REPO)in cmd
  relevant=bool(re.search(r'start-native|run-phase\.mjs|capture-native|authoring:capture|zudo-composer.*dev',cmd))
  if r['pid']in owned:raise ValueError('Known owned process live '+str(r['pid']))
  if Path(cmd.split()[0]).name not in ['node','nodejs','pnpm','corepack','tsx','vite','bun']:continue
  if direct:raise ValueError('Command-qualified owned process live '+str(r['pid']))
  if cwd is not None:require(not Path(cwd).is_relative_to(REPO),'Consumer helper live '+str(r['pid']))
  elif relevant:raise ValueError('Relevant helper cwd UNKNOWN '+str(r['pid']))
  observations.append({**r,'qualification':'cwd UNKNOWN; command not attributed to consumer' if cwd is None else 'cwd outside consumer'})
 return observations
def guarded(argv):return ['bash',GUARD,'--max-run','5400','--','python3',REAPER,*argv]
JS_PARSE_EVENTS = r"text => text.trim().split('\n').map(JSON.parse)"
def verifier_script():
 return "import{readFile}from'node:fs/promises';import assert from'node:assert/strict';import{auditBoundaryContinuation}from'./tests/native-authoring/families/boundary23-continuation.mjs';import{assertWholeContinuationDelta,assertContinuationShutdown,assertContinuationAuthority}from'./tests/native-authoring/families/continuation-core.mjs';const p=process.argv[1],j=async n=>JSON.parse(await readFile(p+'/'+n,'utf8')),before=await j('before.json'),after=await j('after.json'),proof=await j('proof.json'),events=("+JS_PARSE_EVENTS+")(await readFile(p+'/events.ndjson','utf8'));assert.deepEqual(auditBoundaryContinuation({before,after,proof,events}),{beforeDigest:proof.beforeDigest,afterDigest:proof.afterDigest,domain:proof.domain});assertWholeContinuationDelta(before,after,proof.domain);const bundle=await j('accepted-inputs.json'),provenance=await j('runtime-provenance.json');assertContinuationAuthority(bundle,{composer:process.argv[3],stage:'notes-v1',sourceHead:process.argv[2]});assert.equal(provenance.sourceHead,process.argv[2]);assert.equal(provenance.sourceStatus,'');assert.equal(provenance.composer,process.argv[3]);assert.equal(provenance.stage,'notes-v1');assert.equal(provenance.baselineDigest,before.digest);assert.equal(provenance.port,4208);assertContinuationShutdown(await j('server-shutdown.json'),await j('server-ipc-trace.json'),{hostRoot:'/workspace/pinsel-baseline-publication/packages/pinsel-content',port:4208});console.log('Original receipt, qualified reload, full delta and IPC completion verified');"
def expected_argv(b):
 o=b['outputs'];return ['bash',GUARD,'--max-run','5400','--','python3',REAPER,'corepack','pnpm','exec','node','tests/native-authoring/families/run-phase.mjs','--composer',PIN,'--stage','notes-v1','--port','4208','--intent',o['intent'],'--artifacts',o['artifact']]
def validate_plan(plan,b):
 require(set(plan)=={'source','composer','cwd','environment','argv'},'Exact command plan keys')
 require(plan['source']==b['source'] and plan['composer']==PIN and plan['cwd']==str(REPO),'Command source/pin/cwd drift')
 require(plan['environment']=={'PATH':'/workspace/.cache/toolchain:$PATH',**ENV},'Full reviewed environment required')
 require(plan['argv']==expected_argv(b),'Exact5400 guard/reaper/runner required')
def retain(hashes,p,h):
 require(p not in hashes or hashes[p]==h,'Conflicting original hash '+p);hashes[p]=h

def seal_read(hashes,path):
 data=Path(path).read_bytes();retain(hashes,str(path),digest(data));return data
def check_hashes(hashes):
 for path,h in hashes.items():require(digest(Path(path).read_bytes())==h,'Previously accepted evidence changed '+path)
def prepare_phase_binding(binding,chain):
 b=copy.deepcopy(binding)
 for path,h in chain.items():retain(b['frozen'],path,h)
 check_hashes(b['frozen'])
 return b

def records(snapshot,domain,provider):
 rows=[p for p in snapshot['project']['providers'][domain] if p['id']==provider]
 require(len(rows)==1,'Ambiguous provider '+provider)
 return rows[0]['records']
def one(rows,record_id,label):
 found=[r for r in rows if r['id']==record_id]
 require(len(found)==1,'Ambiguous '+label)
 return found[0]
def validate_history(paths,prefix,proofs,snapshot,index,continuation_path):
 require(len(paths)==index and index in range(40,45) and len(prefix)==23 and paths[:23]==prefix,'History23 prefix mismatch')
 require(len(proofs)==index,'Proof count')
 p=proofs[22]
 require(p['status']=='MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED' and p['originalScenario']=='FAIL','Genuine recovered22 required')
 require(p['originalAfterCapture']=='ABSENT' and p['originalProof']=='ABSENT','Original failure qualification missing')
 require(p['intent']['sequence']['index']==22 and p['intent']['sequence']['step']=='child-collection','Wrong recovered step')
 require(snapshot['digest']==proofs[index-1]['afterDigest'],'Current recovered capture mismatch')
 require(p['result']['record']['id']==proofs[18]['result']['record']['id'],'Recovered Mapping owner changed')
 p=proofs[23]
 require(paths[23]==str(Path(continuation_path).parent/'recovery-sequence-proof.json'),'Recovered23 must be emitted continuation sibling')
 require(p['status']=='SAVED_FAMILY_OPERATION_CAPTURE_RECOVERY_VERIFIED' and p['originalScenario']=='FAIL427','Genuine recovered23 required')
 require(p['originalAfterCapture']=='ABSENT' and p['originalProof']=='ABSENT' and p['originalGracefulClose']=='NOT_PROVEN','Original23 failure qualification missing')
 require(p['rawRecoveryInventory']=='NOT_RETAINED_NO_RAW_PRESERVATION_CLAIM','No original23 raw preservation claim')
 require(p['intent']['sequence']['index']==23 and p['intent']['sequence']['step']=='child-limit','Wrong recovered23 step')
 require(p['intent']['owner']=={'providerId':'mapping-filesystem','recordId':proofs[18]['result']['record']['id']} and p['result']['record']['id']==proofs[18]['result']['record']['id'],'Recovered23 owner changed')
 require(proofs[31]['status']=='COMPOSITION_PROP_FILL_RECOVERY_VERIFIED' and proofs[31]['intent']['sequence']['step']=='toc-prop-number','Phase31 recovery missing')
 require(proofs[33]['status']=='TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED' and proofs[33]['intent']['sequence']['step']=='toc-bind-label','Phase33 recovery missing')
 require(proofs[39]['intent']['sequence']=={'configHash':CONFIG_HASH,'index':39,'step':'toc-pin','total':45},'Phase39 predecessor missing')
 for i in range(24,index):require(proofs[i].get('beforeDigest')==proofs[i-1]['afterDigest'] and proofs[i]['intent']['sequence']['index']==i,'Continuation digest chain break')

STEPS={40:'body-group',41:'toc-group',42:'child-attach',43:'parent-attach',44:'toc-attach'}
PAGE='results'
TOC_OWNER='results-toc'
def find_node(nodes,node_id):
 for node in nodes:
  if node.get('id')==node_id:return node
  for children in (node.get('slots') or {}).values():
   found=find_node(children,node_id)
   if found:return found
 return None
def group_id(proof,parent_id,slot_id):
 parent=find_node(proof['result']['record']['document']['root'],parent_id)
 require(parent is not None,'Group parent missing')
 group=parent['slots'][slot_id][-1]
 require(group['componentId']=='pinsel.group','Accepted group is not a group')
 return group['id']
def validate_intent(intent,snapshot,proofs,descriptors,b,history_hash,index,boundary_document):
 require(index in STEPS,'Only40-44 allowed')
 require(intent['sequence']=={'configHash':CONFIG_HASH,'index':index,'step':STEPS[index],'total':45},'Wrong next phase')
 require(intent['family']=='results','Wrong family')
 parent={'providerId':'content-filesystem','modelId':'result-year','recordId':proofs[0]['result']['record']['id']}
 comps=records(snapshot,'compositions','files');maps=records(snapshot,'mappings','mapping-filesystem')
 child=one(maps,proofs[18]['result']['record']['id'],'child Mapping')
 require(child['document']['mode']['query']=={'publication':'published-only','conditions':[{'fieldId':'result-entry-year','operator':'equals','value':parent}],'sort':[{'fieldId':'result-entry-order','direction':'asc'}],'pins':[],'limit':1000},'Child query drift')
 toc_map=one(maps,proofs[32]['result']['record']['id'],'TOC Mapping')
 require(toc_map['document']['mode']['query']['limit']==1 and toc_map['document']['mode']['query']['pins']==[parent],'TOC pin drift')
 href=next(item for item in toc_map['document']['bindings'] if item['target']['prop']=='href')
 require(href['transform']=={'kind':'prefix','prefix':'#year-'},'TOC href drift')
 page=one(comps,PAGE,'Results page');archive=find_node(page['document']['root'],'archive')
 require(archive is not None,'Results archive missing')
 toc=one(comps,TOC_OWNER,'Results TOC');require(toc['document']['root'][0]['id']=='toc','TOC root drift')
 if index==40:require([node['id'] for node in archive['slots']['body']][-1]=='year-year-2015','Results archive body drift')
 if index==41:require([node['id'] for node in toc['document']['root'][0]['slots']['items']][-1]=='toc-year-2015','TOC items drift')
 require(len(snapshot['project'].get('collectionAttachments') or [])==199+max(0,index-42),'Attachment count drift')
 if index==40:
  require(intent['kind']=='group' and intent['domain']=='compositions' and intent['owner']=={'providerId':'files','recordId':PAGE},'Wrong body group owner')
  require(intent['parentId']=='archive' and intent['slotId']=='body','Wrong body group slot')
  require('document' not in intent and 'action' not in intent and 'mapping' not in intent,'Group carries an edit')
 elif index==41:
  require(intent['kind']=='group' and intent['domain']=='compositions' and intent['owner']=={'providerId':'files','recordId':TOC_OWNER},'Wrong TOC group owner')
  require(intent['parentId']=='toc' and intent['slotId']=='items','Wrong TOC group slot')
  require('document' not in intent and 'mapping' not in intent,'Group carries an edit')
 elif index==42:
  composition=one(comps,proofs[10]['result']['record']['id'],'parent composition')
  require(intent['kind']=='attachment' and intent['domain']=='workspace','Wrong child attachment')
  require(intent['owner']=={'providerId':'files','recordId':composition['id']},'Wrong child attachment owner')
  require(intent['mapping']=={'providerId':'mapping-filesystem','recordId':proofs[18]['result']['record']['id']},'Wrong child mapping')
  require(intent['target']=={'nodeId':composition['document']['root'][0]['id'],'slotId':'items'},'Wrong child attachment target')
 else:
  role_parent=index==43
  proof=proofs[40 if role_parent else 41]
  node=group_id(proof,'archive' if role_parent else 'toc','body' if role_parent else 'items')
  require(intent['kind']=='attachment' and intent['domain']=='workspace','Wrong attachment')
  require(intent['owner']=={'providerId':'files','recordId':PAGE if role_parent else TOC_OWNER},'Wrong attachment owner')
  require(intent['mapping']=={'providerId':'mapping-filesystem','recordId':proofs[11 if role_parent else 32]['result']['record']['id']},'Wrong attachment mapping')
  require(intent['target']=={'nodeId':node,'slotId':'items'},'Wrong attachment target')
 require('document' not in intent,'Attachment or group carries a document')
 require(intent['captureDigest']==snapshot['digest'] and intent['capturePath']==proofs[index-1]['afterCapture'],'Wrong actual prior capture')
 require(intent['familyBoundaryHistory']=={'path':b['historyIn'],'sha256':history_hash},'Current history seal mismatch')
 require(intent['familyOperatorSourceBoundary']==boundary_document,'Source boundary missing')
 for key,descriptor in zip(KEYS,descriptors):require(intent[key]==descriptor,'Descriptor changed '+key)

def validate_compact(bundle,intent,snapshot,b):
 require(set(bundle)=={'schemaVersion','kind','intent','snapshot','hashes','authority'},'No recursive/extra bundle fields')
 require(bundle['schemaVersion']==3 and bundle['kind']=='family-runtime-view','Compact schema required')
 require(bundle['intent']==intent and bundle['snapshot']==snapshot,'Child authority changed')
 require(bundle['authority']=={'composer':PIN,'stage':'notes-v1','sourceHead':b['source'],'boundary':24,'descriptor':intent['familyContinuation'],'baseDescriptor':intent['familySourceBoundary23']},'Wrong compact authority')
 require(bundle['hashes'].get(b['historyIn'])==intent['familyBoundaryHistory']['sha256'],'Unsealed history')

TEMPLATE_GO=Path('/workspace/composer-adoption-notes/results-group-40-44-template-02/manager-go.json')
def assert_template_go(phase_go):
 require(phase_go.is_file(),'Phase manager-go missing')
 phase=json.loads(phase_go.read_text());template=json.loads(TEMPLATE_GO.read_text())
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
 require(template.get('granted') is True and template.get('template')=='results-group-40-44' and template.get('source')==head,'Template manager-go missing')
 require(phase.get('granted') is True and phase.get('templateGo')==str(TEMPLATE_GO),'Phase GO does not reference the template GO')
 require(phase.get('templateGoSha256')==digest(TEMPLATE_GO.read_bytes()),'Template GO hash mismatch')
 require(TEMPLATE_GO.stat().st_mtime < phase_go.stat().st_mtime,'Template GO is not earlier than the phase GO')
def assert_phase_review(review_path,index,history_in):
 require(review_path.is_file(),'Phase review missing')
 review=json.loads(review_path.read_text())
 require(review.get('verdict')=='PASS' and not review.get('mismatches'),'Phase review is not a pass')
 require(isinstance(review.get('reviewer'),str) and review['reviewer'].strip(),'Bare review: reviewer missing')
 subject=review.get('subject')
 require(isinstance(subject,dict),'Bare review: subject missing')
 require(Path(subject.get('path','')).resolve()==Path(__file__).resolve(),'Review subject is not this sibling')
 require(subject.get('sha256')==digest(Path(__file__).read_bytes()),'Review subject hash mismatch')
 require(subject.get('phase')==index,'Review subject phase mismatch')
 require(subject.get('historyIn')==history_in,'Review subject history mismatch')
 require(subject.get('historyInSha256')==digest(Path(history_in).read_bytes()),'Review subject history hash mismatch')
def run_phase(b,index):
 b=validate_bindings(b) # MUST precede every read, output and subprocess.
 sealed=dict(b['frozen']);out=b['outputs'];env={**os.environ,**ENV,'PATH':'/workspace/.cache/toolchain:'+os.environ['PATH']}
 phase_dir=Path(out['result']).parent
 assert_template_go(phase_dir/'manager-go.json')
 assert_phase_review(phase_dir/'independent-review.json',index,b['historyIn'])
 def raw(p):
  data=Path(p).read_bytes();require(p in sealed and digest(data)==sealed[p],'Changed/unsealed input '+p);return data
 def read(p):return json.loads(raw(p))
 def recheck():
  for p in tuple(sealed):raw(p)
 def journal(event):
  with Path(out['journal']).open('a')as f:f.write(json.dumps({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),**event})+'\n');f.flush();os.fsync(f.fileno())
 def stopped():
  recheck();require(not Path(out['hold']).exists(),'Manager HOLD')
  require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()==b['source'],'Source changed')
  require(not subprocess.check_output(['git','status','--porcelain'],cwd=REPO).strip(),'Dirty consumer')
  require(not os.path.lexists(REPO/'packages/pinsel-content/.zudo-authoring.lock'),'Exact host lease exists')
  with socket.socket()as s:require(s.connect_ex(('127.0.0.1',4208))!=0,'Port4208 live')
  rows=[]
  for row in subprocess.check_output(['ps','-eo','pid=,ppid=,args='],text=True).splitlines():
   pid,ppid,cmd=row.strip().split(None,2)
   try:cwd=os.readlink('/proc/'+pid+'/cwd')
   except FileNotFoundError:continue
   except PermissionError:cwd=None
   rows.append({'pid':int(pid),'ppid':int(ppid),'command':cmd,'cwd':cwd})
  observations=classify_helpers(rows,b['knownOwnedPids'])
  if Path(out['journal']).exists():journal({'event':'stopped-process-observations','helpers':observations})
  for p in out.values():canonical_output(p)
  audit=read(b['installationAudit']);require(len(audit['installs'])==4,'Four installs required')
  require({i['consumer']for i in audit['installs']}=={'apps/editor','apps/authoring-worker','packages/pinsel-content','packages/pinsel-ui'},'Installed consumer scope')
  for i in audit['installs']:
   target=(REPO/i['consumer']/'node_modules/zudo-composer').resolve(strict=True)
   require(str(target)==i['root'] and digest((target/'package.json').read_bytes())==i['manifestHash'],'Installed package changed')
  require(digest((REPO/'pnpm-lock.yaml').read_bytes())==audit['pnpmLockSha256'],'Root lock changed')
  require(digest((REPO/'node_modules/.pnpm/lock.yaml').read_bytes())==audit['installedLockSha256'],'Installed lock changed')
  subprocess.run(['node','--input-type=module','-e',"import{assertInstalledPin}from './tests/native-authoring/families/runtime-preflight.mjs';await assertInstalledPin(process.cwd(),process.argv[1]);",PIN],cwd=REPO,env=env,check=True)
 def run(argv,log):
  journal({'event':'command-start','argv':argv,'log':log})
  with Path(log).open('x')as f:result=subprocess.run(argv,cwd=REPO,env=env,stdout=f,stderr=subprocess.STDOUT)
  journal({'event':'command-exit','exit':result.returncode,'log':log});require(result.returncode==0,'STOP: original command failed; reconcile, never replay')
 # Only immutable artifact reads; every descriptor freeze expectation is retained before parsing further.
 descriptors=[read(p)for p in b['descriptors']]
 for d in descriptors:
  p=d['freezeManifestPath'];retain(sealed,p,d['freezeManifestSha256']);f=read(p)
  for path,h in f.items():retain(sealed,path,h)
 recheck();plan=read(b['runtimePlan']);validate_plan(plan,b);read(b['shutdownReview'])
 history=read(b['historyIn']);prefix=read(b['history23'])
 proofs=[read(p)for p in history];snapshot=read(proofs[index-1]['afterCapture']);validate_history(history,prefix,proofs,snapshot,index,b['descriptors'][7])
 validate_output_paths(out,sealed)
 stopped();require(shutil.disk_usage(REPO).free>=RESERVE+PHASE_BUDGET,'Capacity HOLD before next phase')
 Path(out['journal']).touch(exist_ok=False)
 try:
  run(guarded(['node','tests/native-authoring/families/sequence.mjs',b['config'],proofs[index-1]['afterCapture'],b['historyIn'],b['active'],out['intent'],*b['descriptors'],b['sourceBoundary']]),out['generateLog'])
  retain(sealed,out['intent'],digest(Path(out['intent']).read_bytes()));intent=read(out['intent'])
  validate_intent(intent,snapshot,proofs,descriptors,b,sealed[b['historyIn']],index,read(b['sourceBoundary']));stopped()
  require(shutil.disk_usage(REPO).free>=RESERVE+PHASE_BUDGET,'Capacity HOLD before dispatch')
  run(plan['argv'],out['runtimeLog']);stopped()
  artifact=Path(out['artifact']);load=lambda n:json.loads(seal_read(sealed,artifact/n))
  proof=load('proof.json');require(proof['intent']==intent and proof['beforeDigest']==snapshot['digest'],'Wrong returned proof')
  require(load('before.json')==snapshot,'Full before changed');require(proof['afterCapture']==str(artifact/'after.json'),'After capture pointer changed')
  require(load('after.json')['digest']==proof['afterDigest'],'After digest changed')
  bundle_bytes=seal_read(sealed,artifact/'accepted-inputs.json');require(load('accepted-input-sha256.json')=={'sha256':digest(bundle_bytes)},'Child bundle bytes changed')
  bundle=json.loads(bundle_bytes);validate_compact(bundle,intent,snapshot,b)
  for p,h in bundle['hashes'].items():retain(sealed,p,h)
  for name in ['events.ndjson','runtime-provenance.json','ui-result.json','server.log','server-shutdown.json','server-ipc-trace.json']:
   seal_read(sealed,artifact/name)
  require(not os.path.lexists(artifact/'server-shutdown-errors.json'),'Shutdown error artifact refuses acceptance')
  for path in [out['generateLog'],out['runtimeLog']]:seal_read(sealed,path)
  recheck()
  verifier=verifier_script()
  run(['node','--input-type=module','-e',verifier,str(artifact),b['source'],PIN],out['verifyLog']);stopped()
  require(read(b['historyIn'])==history,'History prefix changed')
  history_bytes=json.dumps(history+[str(artifact/'proof.json')],indent=2).encode();retain(sealed,out['historyOut'],digest(history_bytes))
  with Path(out['historyOut']).open('xb')as f:f.write(history_bytes)
  with Path(out['result']).open('x')as f:json.dump({'status':'PHASE_VERIFIED','proof':str(artifact/'proof.json'),'afterDigest':proof['afterDigest'],'historyOut':out['historyOut'],'index':index,'next':'Only next admitted40-44 step; stop after44'},f,indent=2)
  journal({'event':'accepted','index':index,'historyOut':out['historyOut'],'afterDigest':proof['afterDigest']})
  for path in [out['verifyLog'],out['result'],out['journal']]:seal_read(sealed,path)
  recheck()
  return dict(sealed)
 except BaseException as e:
  journal({'event':'STOP','error':str(e),'policy':'No replay, inverse, lease deletion or later phase'});raise
def validate_batch(batch):
 require(isinstance(batch,list) and len(batch)==5,'Unfilled exact five-phase group batch required')
 all_outputs={}
 for offset,b in enumerate(batch):
  require(isinstance(b,dict),'Unfilled phase binding')
  if offset:
   require(b['historyIn']==batch[offset-1]['outputs']['historyOut'],'History path chain drift')
   for k in ['source','descriptors','history23','config','active','installationAudit','shutdownReview','sourceBoundary','knownOwnedPids']:require(b[k]==batch[0][k],'Batch authority drift '+k)
  for k,path in b['outputs'].items():all_outputs[str(offset)+k]=path
 expected={}
 for b in batch:
  for path,h in b['frozen'].items():retain(expected,path,h)
 validate_output_paths(all_outputs,expected)
 return batch

def sequential(indices,step):
 require(list(indices)==list(range(40,45)),'Bounded five-phase group contract')
 for index in indices:step(index)
def admit_history41_resume(paths,index):
 require(index!=40,'phase40 rerun prevented')
 require(index==41,'Resume runs only phase41-02')
 require(isinstance(paths,list) and len(paths)==41 and len(set(paths))==41,'history41 length or references')
 require(all(isinstance(p,str) and p.startswith('/') for p in paths),'Unpinned history reference')
 return list(paths)
def history42_from(paths,proof_path):
 prior=admit_history41_resume(paths,41)
 require(isinstance(proof_path,str) and proof_path.startswith('/') and proof_path not in prior,'phase41 proof reference')
 out=prior+[proof_path]
 require(out[:-1]==prior and len(out)==42,'history42 prefix')
 return out
def package_transition_argv(descriptor):
 require(isinstance(descriptor,str) and descriptor.startswith('/'),'Unpinned package transition')
 return ['node','tests/native-authoring/families/package-transition-boundary.mjs',descriptor]

def main():
 batch=validate_batch(BATCH_BINDINGS) # Refuse before any command/output when unfilled.
 chain={}
 def step(index):
  b=prepare_phase_binding(batch[index-40],chain)
  accepted=run_phase(b,index) # Raises on failure/unknown; no later generation or replay.
  out=b['outputs'];history=json.loads(Path(out['historyOut']).read_text());require(len(history)==index+1,'New history count')
  prior=json.loads(Path(b['historyIn']).read_text());require(history[:-1]==prior and history[-1]==str(Path(out['artifact'])/'proof.json'),'Exact append required')
  paths=[out['historyOut'],str(Path(out['artifact'])/'proof.json'),str(Path(out['artifact'])/'after.json')]
  for path,h in accepted.items():retain(chain,path,h)
  for path in paths:require(path in chain,'Missing accepted artifact seal '+path)
  check_hashes(chain)
 sequential(list(range(40,45)),step)
if __name__=='__main__':main()
