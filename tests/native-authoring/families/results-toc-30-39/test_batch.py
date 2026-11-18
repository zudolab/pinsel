import copy,importlib.util,subprocess,sys,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('batch',Path(__file__).with_name('batch.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PARENT={'providerId':'content-filesystem','modelId':'result-year','recordId':'actual-parent'}
CHILD_QUERY={'publication':'published-only','conditions':[{'fieldId':'result-entry-year','operator':'equals','value':PARENT}],'sort':[{'fieldId':'result-entry-order','direction':'asc'}],'pins':[],'limit':1000}
PARENT_MODE={'kind':'collection','query':{'publication':'published-only','conditions':[],'sort':[],'pins':[PARENT],'limit':1}}
def binding(prop,transform):
 return {'id':'binding-'+prop,'sourceFieldId':m.YEAR_FIELD,'projection':{'kind':'value'},'target':{'nodeId':'node-1','prop':prop},'transform':transform}
class Tests(unittest.TestCase):
 def test_unfilled_cli_no_outputs(self):
  with tempfile.TemporaryDirectory()as d:
   r=subprocess.run([sys.executable,str(Path(__file__).with_name('batch.py'))],cwd=d,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0);self.assertIn('Unfilled exact ten-phase',r.stderr);self.assertEqual(list(Path(d).iterdir()),[])
 def test_sequence_stops_first_failure(self):
  calls=[]
  def step(i):
   calls.append(i)
   if i==30:raise RuntimeError('uncertain saved operation')
  with self.assertRaises(RuntimeError):m.sequential(list(range(30,40)),step)
  self.assertEqual(calls,[30])
 def test_sequence_refuses_other_ranges(self):
  for indices in [list(range(28,30)),list(range(30,41)),[30],[39],list(range(24,28))]:
   with self.assertRaises(ValueError):m.sequential(indices,lambda i:None)
 def fixture(self,index):
  template={'id':m.TOC_TEMPLATE,'document':{'root':[{'id':'template-node','componentId':'pinsel.toc-item','props':{'number':11},'slots':{}}]}}
  comp={'id':'toc-comp','document':{'root':[{'id':'node-1','componentId':'pinsel.toc-item','props':{'number':11 if index==31 else 999},'slots':{}}]}}
  href={'kind':'identity'} if index==35 else {'kind':'prefix','prefix':''} if index==36 else {'kind':'prefix','prefix':'#year-'}
  bindings=[] if index==33 else [binding('label',{'kind':'identity'})] if index==34 else [binding('label',{'kind':'identity'}),binding('href',href)]
  if index<37:mode={'kind':'single'}
  elif index==37:mode={'kind':'single'}
  elif index==38:mode={'kind':'collection','query':{'publication':'published-only','conditions':[],'sort':[],'pins':[],'limit':100}}
  else:mode={'kind':'collection','query':{'publication':'published-only','conditions':[],'sort':[],'pins':[],'limit':1}}
  toc_map={'id':'toc-map','document':{'id':'toc-map','name':m.MARKER+'-toc','schemaVersion':1,'mode':mode,'bindings':bindings,'composition':{'providerId':'files','recordId':'toc-comp'},'contentModel':{'providerId':'content-filesystem','recordId':'result-year'}}}
  child={'id':'actual-child','document':{'mode':{'kind':'collection','query':copy.deepcopy(CHILD_QUERY)}}}
  parent_map={'id':'parent-map','document':{'mode':copy.deepcopy(PARENT_MODE)}}
  maps=[child,parent_map]+([toc_map] if index>=33 else [])
  comps=[template]+([comp] if index>=31 else [])
  snapshot={'digest':'c'*64,'project':{'providers':{'mappings':[{'id':'mapping-filesystem','records':maps}],'compositions':[{'id':'files','records':comps}],'content':[{'id':'content-filesystem','models':[{'id':'result-year','document':{'fields':[{'id':m.YEAR_FIELD,'label':'年度','kind':'text'}]}}]}]}}}
  proofs=[{'beforeDigest':'0'*64,'afterDigest':'1'*64,'intent':{'sequence':{'index':i}}} for i in range(index)]
  proofs[0]['result']={'record':{'id':'actual-parent'}};proofs[11]['result']={'record':{'id':'parent-map'}};proofs[18]['result']={'record':{'id':'actual-child'}}
  proofs[27]['intent']={'sequence':{'configHash':m.CONFIG_HASH,'index':27,'step':'child-reference-equals-again','total':45}}
  proofs[29]['intent']={'sequence':{'configHash':m.CONFIG_HASH,'index':29,'step':'child-sort-field','total':45}}
  if index>30:proofs[30]['result']={'record':{'id':'toc-comp'}}
  if index>32:proofs[32]['result']={'record':{'id':'toc-map'}}
  for i in range(1,index):proofs[i]['beforeDigest']=proofs[i-1]['afterDigest']
  proofs[index-1]['afterCapture']='/e/actual-after';proofs[index-1]['afterDigest']=snapshot['digest']
  descriptors=[{'proofPath':'/e/d'+str(i)} for i in range(8)]
  boundary={'proofPath':'/e/boundary','freezeManifestPath':'/e/freeze','freezeManifestSha256':'d'*64}
  b={'historyIn':'/e/history'+str(index),'sourceBoundary':boundary}
  intent={'sequence':{'configHash':m.CONFIG_HASH,'index':index,'step':m.STEPS[index],'total':45},'family':'results','captureDigest':snapshot['digest'],'capturePath':'/e/actual-after','familyBoundaryHistory':{'path':b['historyIn'],'sha256':'b'*64},'familyOperatorSourceBoundary':boundary,**dict(zip(m.KEYS,descriptors))}
  if index==30:intent.update({'kind':'duplicate','domain':'compositions','source':{'providerId':'files','recordId':m.TOC_TEMPLATE}})
  elif index==31:
   doc=copy.deepcopy(comp['document']);doc['root'][0]['props']['number']=999
   intent.update({'kind':'record-edit','domain':'compositions','owner':{'providerId':'files','recordId':'toc-comp'},'document':doc,'action':{'kind':'fill','label':'番号','value':999,'treeRoot':True}})
  elif index==32:intent.update({'kind':'mapping-create','domain':'mappings','name':m.MARKER+'-toc','contentModel':{'providerId':'content-filesystem','recordId':'result-year'},'composition':{'providerId':'files','recordId':'toc-comp'}})
  elif index in (33,34):intent.update({'kind':'binding','domain':'mappings','owner':{'providerId':'mapping-filesystem','recordId':'toc-map'},'fieldId':m.YEAR_FIELD,'fieldLabel':'年度','title':'TOC item','target':{'nodeId':'node-1','prop':'label' if index==33 else 'href'}})
  else:
   doc=copy.deepcopy(toc_map['document']);action=None
   if index==35:doc['bindings'][1]['transform']={'kind':'prefix','prefix':''};action={'kind':'select','label':'Transform for 年度 → TOC item.href','value':'prefix'}
   elif index==36:doc['bindings'][1]['transform']={'kind':'prefix','prefix':'#year-'};action={'kind':'fill','label':'Prefix for 年度 → TOC item.href','value':'#year-'}
   elif index==37:doc['mode']={'kind':'collection','query':{'publication':'published-only','conditions':[],'sort':[],'pins':[],'limit':100}};action={'kind':'select','label':'Mapping mode','value':'collection'}
   elif index==38:doc['mode']['query']['limit']=1;action={'kind':'fill','label':'Result limit','value':1}
   else:doc['mode']['query']['pins']=[PARENT];action={'kind':'pins','ref':PARENT}
   intent.update({'kind':'record-edit','domain':'mappings','owner':{'providerId':'mapping-filesystem','recordId':'toc-map'},'document':doc,'action':action})
  return b,snapshot,proofs,descriptors,intent
 def test_exact_toc_deltas(self):
  for index in range(30,40):
   with self.subTest(index=index):
    b,s,p,d,i=self.fixture(index);m.validate_intent(i,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_negative_owner_history_boundary(self):
  for index in range(30,40):
   b,s,p,d,i=self.fixture(index)
   for name,edit in [('history',lambda x:x['familyBoundaryHistory'].__setitem__('path','/stale')),('step',lambda x:x['sequence'].__setitem__('index',29)),('boundary',lambda x:x.__setitem__('familyOperatorSourceBoundary',{})),('descriptor',lambda x:x.__setitem__('familyContinuation',{})),('child',lambda x:x.__setitem__('_skip',None))]:
    x=copy.deepcopy(i);edit(x)
    snap=copy.deepcopy(s)
    if name=='child':snap['project']['providers']['mappings'][0]['records'][0]['document']['mode']['query']['sort']=[]
    with self.subTest(index=index,name=name),self.assertRaises(ValueError):m.validate_intent(x,snap,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_negative_wrong_owner(self):
  for index in range(30,40):
   b,s,p,d,i=self.fixture(index);x=copy.deepcopy(i)
   if 'owner' in x:x['owner']={'providerId':x['owner']['providerId'],'recordId':'foreign'}
   elif index==30:x['owner']={'providerId':'files','recordId':'foreign'}
   else:x['composition']['recordId']='foreign'
   with self.subTest(index=index),self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_negative_step_deltas(self):
  cases={30:lambda x:x['source'].__setitem__('recordId','results-year-year-2015'),31:lambda x:x['document']['root'][0]['props'].__setitem__('number',11),32:lambda x:x.__setitem__('name','other-toc'),33:lambda x:x['target'].__setitem__('prop','href'),34:lambda x:x.__setitem__('fieldId','result-year-order'),35:lambda x:x['document']['bindings'][1]['transform'].__setitem__('prefix','#year-'),36:lambda x:x['action'].__setitem__('value','#other'),37:lambda x:x['document']['mode']['query'].__setitem__('limit',1),38:lambda x:x['document']['mode']['query'].__setitem__('limit',1000),39:lambda x:x['document']['mode']['query'].__setitem__('pins',[])}
  for index,edit in cases.items():
   b,s,p,d,i=self.fixture(index);x=copy.deepcopy(i);edit(x)
   with self.subTest(index=index),self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_template_number_and_outside_batch(self):
  b,s,p,d,i=self.fixture(30);s['project']['providers']['compositions'][0]['records'][0]['document']['root'][0]['props']['number']=999
  with self.assertRaises(ValueError):m.validate_intent(i,s,p,d,b,'b'*64,30,b['sourceBoundary'])
  with self.assertRaises(ValueError):m.validate_intent(i,s,p,d,b,'b'*64,29,b['sourceBoundary'])
 def test_digest_chain_and_phase29_predecessor_refuse(self):
  b,s,p,d,i=self.fixture(30)
  paths=['/h']*30;paths[23]='/c/recovery-sequence-proof.json'
  p[22].update({'status':'MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED','originalScenario':'FAIL','originalAfterCapture':'ABSENT','originalProof':'ABSENT','intent':{'sequence':{'index':22,'step':'child-collection'}}})
  p[23].update({'status':'SAVED_FAMILY_OPERATION_CAPTURE_RECOVERY_VERIFIED','originalScenario':'FAIL427','originalAfterCapture':'ABSENT','originalProof':'ABSENT','originalGracefulClose':'NOT_PROVEN','rawRecoveryInventory':'NOT_RETAINED_NO_RAW_PRESERVATION_CLAIM','intent':{'sequence':{'index':23,'step':'child-limit'},'owner':{'providerId':'mapping-filesystem','recordId':'actual-child'}}})
  p[22]['result']={'record':{'id':'actual-child'}};p[23]['result']={'record':{'id':'actual-child'}}
  p[28]['beforeDigest']='f'*64
  with self.assertRaises(ValueError):m.validate_history(paths,paths[:23],p,s,30,'/c/descriptor.json')
  p[28]['beforeDigest']=p[27]['afterDigest'];p[29]['intent']['sequence']['step']='child-sort-add'
  with self.assertRaises(ValueError):m.validate_history(paths,paths[:23],p,s,30,'/c/descriptor.json')
 def test_frozen_drivers_remain_separate(self):
  frozen=Path('/workspace/composer-adoption-notes/results-continuation24-batch24-27-template-03/batch.py').read_text()
  sort=Path('/workspace/pinsel-baseline-publication/tests/native-authoring/families/results-sort-28-29/batch.py').read_text()
  self.assertIn('BATCH_BINDINGS=None',frozen);self.assertIn('Only24-27 allowed',frozen);self.assertNotIn('toc-duplicate',frozen)
  self.assertIn('BATCH_BINDINGS=None',sort);self.assertIn('Only28-29 allowed',sort);self.assertNotIn('toc-duplicate',sort)
if __name__=='__main__':unittest.main(verbosity=2)
