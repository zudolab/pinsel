import copy,importlib.util,json,subprocess,sys,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('batch',Path(__file__).with_name('batch.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PARENT={'providerId':'content-filesystem','modelId':'result-year','recordId':'actual-parent'}
CHILD_QUERY={'publication':'published-only','conditions':[{'fieldId':'result-entry-year','operator':'equals','value':PARENT}],'sort':[{'fieldId':'result-entry-order','direction':'asc'}],'pins':[],'limit':1000}
def node(id,component,slots=None):
 return {'id':id,'componentId':component,'props':{},'slots':slots or {}}
class Tests(unittest.TestCase):
 def test_unfilled_cli_no_outputs(self):
  with tempfile.TemporaryDirectory() as d:
   r=subprocess.run([sys.executable,str(Path(__file__).with_name('batch.py'))],cwd=d,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0);self.assertIn('Unfilled exact five-phase',r.stderr);self.assertEqual(list(Path(d).iterdir()),[])
 def test_sequence_stops_and_refuses_other_ranges(self):
  calls=[]
  def step(i):
   calls.append(i)
   if i==40:raise RuntimeError('uncertain')
  with self.assertRaises(RuntimeError):m.sequential(list(range(40,45)),step)
  self.assertEqual(calls,[40])
  for indices in [list(range(30,40)),[40],[44]]:
   with self.assertRaises(ValueError):m.sequential(indices,lambda i:None)
 def fixture(self,index):
  body=[node(f'year-year-{year}','pinsel.group') for year in range(2025,2014,-1)]
  if index>=43:body.append(node('body-group-new','pinsel.group',{'items':[]}))
  items=[node(f'toc-year-{year}','pinsel.group') for year in range(2025,2014,-1)]
  if index>=44:items.append(node('toc-group-new','pinsel.group',{'items':[]}))
  page={'id':'results','document':{'root':[node('frame','pinsel.site-frame',{'main':[node('archive','pinsel.archive-layout',{'body':body})]})]}}
  toc={'id':'results-toc','document':{'root':[node('toc','pinsel.toc',{'items':items})]}}
  parent_comp={'id':'parent-comp','document':{'root':[node('parent-root','pinsel.year-section',{'items':[]})]}}
  child={'id':'child-map','document':{'mode':{'kind':'collection','query':copy.deepcopy(CHILD_QUERY)}}}
  toc_map={'id':'toc-map','document':{'mode':{'kind':'collection','query':{'publication':'published-only','conditions':[],'sort':[],'pins':[PARENT],'limit':1}},'bindings':[{'target':{'prop':'href'},'transform':{'kind':'prefix','prefix':'#year-'}}]}}
  attached=199+max(0,index-42)
  snapshot={'digest':'c'*64,'project':{'collectionAttachments':[{'id':f'a{i}'} for i in range(attached)],'providers':{'compositions':[{'id':'files','records':[page,toc,parent_comp]}],'mappings':[{'id':'mapping-filesystem','records':[child,toc_map]}]}}}
  proofs=[{'beforeDigest':'0'*64,'afterDigest':'1'*64,'intent':{'sequence':{'index':i}}} for i in range(index)]
  proofs[0]['result']={'record':{'id':'actual-parent'}};proofs[10]['result']={'record':{'id':'parent-comp'}};proofs[11]['result']={'record':{'id':'parent-map'}};proofs[18]['result']={'record':{'id':'child-map'}};proofs[32]['result']={'record':{'id':'toc-map'}}
  proofs[31]['status']='COMPOSITION_PROP_FILL_RECOVERY_VERIFIED';proofs[31]['intent']={'sequence':{'index':31,'step':'toc-prop-number'}}
  proofs[33]['status']='TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED';proofs[33]['intent']={'sequence':{'index':33,'step':'toc-bind-label'}}
  proofs[39]['intent']={'sequence':{'configHash':m.CONFIG_HASH,'index':39,'step':'toc-pin','total':45}}
  if index>40:proofs[40]['result']={'record':{'document':page['document']}}
  if index>41:proofs[41]['result']={'record':{'document':toc['document']}}
  for i in range(1,index):proofs[i]['beforeDigest']=proofs[i-1]['afterDigest']
  proofs[index-1]['afterCapture']='/e/actual-after';proofs[index-1]['afterDigest']=snapshot['digest']
  descriptors=[{'proofPath':'/e/d'+str(i)} for i in range(8)]
  boundary={'proofPath':'/e/boundary','freezeManifestPath':'/e/freeze','freezeManifestSha256':'d'*64}
  b={'historyIn':'/e/history'+str(index),'sourceBoundary':boundary}
  intent={'sequence':{'configHash':m.CONFIG_HASH,'index':index,'step':m.STEPS[index],'total':45},'family':'results','captureDigest':snapshot['digest'],'capturePath':'/e/actual-after','familyBoundaryHistory':{'path':b['historyIn'],'sha256':'b'*64},'familyOperatorSourceBoundary':boundary,**dict(zip(m.KEYS,descriptors))}
  if index==40:intent.update({'kind':'group','domain':'compositions','owner':{'providerId':'files','recordId':'results'},'parentId':'archive','slotId':'body'})
  elif index==41:intent.update({'kind':'group','domain':'compositions','owner':{'providerId':'files','recordId':'results-toc'},'parentId':'toc','slotId':'items'})
  elif index==42:intent.update({'kind':'attachment','domain':'workspace','owner':{'providerId':'files','recordId':'parent-comp'},'mapping':{'providerId':'mapping-filesystem','recordId':'child-map'},'target':{'nodeId':'parent-root','slotId':'items'}})
  elif index==43:intent.update({'kind':'attachment','domain':'workspace','owner':{'providerId':'files','recordId':'results'},'mapping':{'providerId':'mapping-filesystem','recordId':'parent-map'},'target':{'nodeId':'body-group-new','slotId':'items'}})
  else:intent.update({'kind':'attachment','domain':'workspace','owner':{'providerId':'files','recordId':'results-toc'},'mapping':{'providerId':'mapping-filesystem','recordId':'toc-map'},'target':{'nodeId':'toc-group-new','slotId':'items'}})
  return b,snapshot,proofs,descriptors,intent
 def test_exact_group_deltas(self):
  for index in range(40,45):
   with self.subTest(index=index):
    b,s,p,d,i=self.fixture(index);m.validate_intent(i,s,p,d,b,'b'*64,index,b['sourceBoundary'])
 def test_negative_targets(self):
  b,s,p,d,i=self.fixture(40);x=copy.deepcopy(i);x['slotId']='aside'
  with self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,40,b['sourceBoundary'])
  b,s,p,d,i=self.fixture(42);x=copy.deepcopy(i);x['mapping']['recordId']='foreign'
  with self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,42,b['sourceBoundary'])
  b,s,p,d,i=self.fixture(44);x=copy.deepcopy(i);x['target']['nodeId']='toc-year-2015'
  with self.assertRaises(ValueError):m.validate_intent(x,s,p,d,b,'b'*64,44,b['sourceBoundary'])
 def test_bare_review_is_refused(self):
  with tempfile.TemporaryDirectory() as d:
   history=Path(d)/'history.json';history.write_text('[]')
   review=Path(d)/'independent-review.json';review.write_text(json.dumps({'verdict':'PASS','mismatches':[]}))
   with self.assertRaises(ValueError):m.assert_phase_review(review,40,str(history))
 def test_resume_from_history41_keeps_phase40(self):
  paths=['/p/%02d.json'%i for i in range(41)]
  self.assertEqual(m.admit_history41_resume(paths,41),paths)
  out=m.history42_from(paths,'/p/phase41-proof.json')
  self.assertEqual(out[:-1],paths);self.assertEqual(len(out),42)
  with self.assertRaises(ValueError):m.admit_history41_resume(paths,40)
  with self.assertRaises(ValueError):m.admit_history41_resume(paths[:40],41)
  with self.assertRaises(ValueError):m.admit_history41_resume(['relative.json']+paths[1:],41)
  with self.assertRaises(ValueError):m.sequential([41],lambda i:None)
  argv=m.package_transition_argv('/boundary/descriptor.json')
  self.assertEqual(argv[-1],'/boundary/descriptor.json');self.assertNotIn('--force',argv)
 def test_frozen_drivers_remain_separate(self):
  frozen=Path('/workspace/composer-adoption-notes/results-continuation24-batch24-27-template-03/batch.py').read_text()
  toc=Path('/workspace/pinsel-baseline-publication/tests/native-authoring/families/results-toc-30-39/batch.py').read_text()
  self.assertIn('Only24-27 allowed',frozen);self.assertNotIn('body-group',frozen)
  self.assertIn('Only30-39 allowed',toc);self.assertNotIn('body-group',toc)
if __name__=='__main__':unittest.main(verbosity=2)
