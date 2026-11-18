import copy,importlib.util,subprocess,sys,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('batch',Path(__file__).with_name('batch.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PARENT={'providerId':'content-filesystem','modelId':'result-year','recordId':'actual-parent'}
SCHOOL='result-entry-school'
ORDER='result-entry-order'
YEAR='result-entry-year'
class Tests(unittest.TestCase):
 def test_unfilled_cli_no_outputs(self):
  with tempfile.TemporaryDirectory()as d:
   r=subprocess.run([sys.executable,str(Path(__file__).with_name('batch.py'))],cwd=d,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0);self.assertIn('Unfilled exact two-phase',r.stderr);self.assertEqual(list(Path(d).iterdir()),[])
 def test_sequence_stops_first_failure(self):
  calls=[]
  def step(i):
   calls.append(i)
   if i==28:raise RuntimeError('uncertain saved operation')
  with self.assertRaises(RuntimeError):m.sequential([28,29],step)
  self.assertEqual(calls,[28])
 def test_sequence_refuses_other_ranges(self):
  for indices in [[24,25,26,27],[28,29,30],[27,28],[29]]:
   with self.assertRaises(ValueError):m.sequential(indices,lambda i:None)
 def fixture(self,index):
  sort=[] if index==28 else [{'fieldId':SCHOOL,'direction':'asc'}]
  doc={'name':'child','bindings':[{'id':'school'}],'mode':{'kind':'collection','query':{'publication':'published-only','conditions':[{'fieldId':YEAR,'operator':'equals','value':PARENT}],'sort':sort,'pins':[],'limit':1000}}}
  fields=[{'id':YEAR,'kind':'reference','target':{'providerId':'content-filesystem','recordId':'result-year'}},{'id':SCHOOL,'kind':'text'},{'id':ORDER,'kind':'number'}]
  snapshot={'digest':'c'*64,'project':{'providers':{'mappings':[{'id':'mapping-filesystem','records':[{'id':'actual-child','document':doc}]}],'content':[{'id':'content-filesystem','models':[{'id':'result-entry','document':{'fields':fields}}]}]}}}
  proofs=[{'beforeDigest':'0'*64,'afterDigest':'1'*64,'intent':{'sequence':{'index':i}}} for i in range(index)]
  proofs[0]['result']={'record':{'id':'actual-parent'}};proofs[18]['result']={'record':{'id':'actual-child'}}
  proofs[27]['intent']={'sequence':{'configHash':m.CONFIG_HASH,'index':27,'step':'child-reference-equals-again','total':45}}
  for i in range(1,index):proofs[i]['beforeDigest']=proofs[i-1]['afterDigest']
  proofs[index-1]['afterCapture']='/e/actual-after';proofs[index-1]['afterDigest']=snapshot['digest']
  descriptors=[{'proofPath':'/e/d'+str(i)} for i in range(8)]
  boundary={'proofPath':'/e/boundary','freezeManifestPath':'/e/freeze','freezeManifestSha256':'d'*64}
  b={'historyIn':'/e/history'+str(index),'sourceBoundary':boundary}
  want=copy.deepcopy(doc)
  if index==28:want['mode']['query']['sort']=[{'fieldId':SCHOOL,'direction':'asc'}];action={'kind':'button','label':'Add sort'}
  else:want['mode']['query']['sort']=[{'fieldId':ORDER,'direction':'asc'}];action={'kind':'select','label':'Sort 1 field','value':ORDER}
  intent={'sequence':{'configHash':m.CONFIG_HASH,'index':index,'step':m.STEPS[index],'total':45},'kind':'record-edit','domain':'mappings','family':'results','owner':{'providerId':'mapping-filesystem','recordId':'actual-child'},'document':want,'action':action,'captureDigest':snapshot['digest'],'capturePath':'/e/actual-after','familyBoundaryHistory':{'path':b['historyIn'],'sha256':'b'*64},'familyOperatorSourceBoundary':boundary,**dict(zip(m.KEYS,descriptors))}
  return b,snapshot,proofs,descriptors,intent
 def test_exact_sort_deltas(self):
  for index in (28,29):
   with self.subTest(index=index):
    b,s,p,d,i=self.fixture(index);m.validate_intent(i,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_negative_sort_owner_history_schema(self):
  for index in (28,29):
   b,s,p,d,i=self.fixture(index)
   for name,edit in [('owner',lambda x:x['owner'].__setitem__('recordId','foreign')),('sort',lambda x:x['document']['mode']['query']['sort'].append({'fieldId':'other'})),('conditions',lambda x:x['document']['mode']['query']['conditions'][0].__setitem__('operator','not-equals')),('history',lambda x:x['familyBoundaryHistory'].__setitem__('path','/stale')),('step',lambda x:x['sequence'].__setitem__('index',30)),('boundary',lambda x:x.__setitem__('familyOperatorSourceBoundary',{})),('descriptor',lambda x:x.__setitem__('familyContinuation',{}))]:
    x=copy.deepcopy(i);edit(x)
    with self.subTest(index=index,name=name),self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_schema_drift_and_outside_batch(self):
  b,s,p,d,i=self.fixture(28);s['project']['providers']['content'][0]['models'][0]['document']['fields'][1]['id']='result-entry-department'
  with self.assertRaises(ValueError):m.validate_intent(i,s,p,d,b,'b'*64,28,b['sourceBoundary'])
  with self.assertRaises(ValueError):m.validate_intent(i,s,p,d,b,'b'*64,27,b['sourceBoundary'])
 def test_digest_chain_and_phase27_predecessor_refuse(self):
  b,s,p,d,i=self.fixture(28)
  paths=['/h']*28;paths[23]='/c/recovery-sequence-proof.json'
  p[22].update({'status':'MAPPING_RECORD_EDIT_CAPTURE_RECOVERY_VERIFIED','originalScenario':'FAIL','originalAfterCapture':'ABSENT','originalProof':'ABSENT','intent':{'sequence':{'index':22,'step':'child-collection'}}})
  p[23].update({'status':'SAVED_FAMILY_OPERATION_CAPTURE_RECOVERY_VERIFIED','originalScenario':'FAIL427','originalAfterCapture':'ABSENT','originalProof':'ABSENT','originalGracefulClose':'NOT_PROVEN','rawRecoveryInventory':'NOT_RETAINED_NO_RAW_PRESERVATION_CLAIM','intent':{'sequence':{'index':23,'step':'child-limit'},'owner':{'providerId':'mapping-filesystem','recordId':'actual-child'}}})
  p[22]['result']={'record':{'id':'actual-child'}};p[23]['result']={'record':{'id':'actual-child'}}
  p[26]['beforeDigest']='f'*64
  with self.assertRaises(ValueError):m.validate_history(paths,paths[:23],p,s,28,'/c/descriptor.json')
  p[26]['beforeDigest']=p[25]['afterDigest'];p[27]['intent']['sequence']['step']='child-filter-add'
  with self.assertRaises(ValueError):m.validate_history(paths,paths[:23],p,s,28,'/c/descriptor.json')
 def test_frozen_template_contract_remains_separate(self):
  frozen=Path('/workspace/composer-adoption-notes/results-continuation24-batch24-27-template-03/batch.py').read_text()
  self.assertIn('BATCH_BINDINGS=None',frozen);self.assertIn('Only24-27 allowed',frozen);self.assertNotIn('child-sort-add',frozen)
if __name__=='__main__':unittest.main(verbosity=2)
