import {isNativeRead,contentPreviewOperations,assertContentPreviewHeaders} from '../native-preview-reads.mjs';
import {validateBindingDiagnostic} from './binding-diagnostic.mjs';
import assert from 'node:assert/strict';
import {contentReadOperations} from '../content-browser-transport.mjs';
import {compositionRead} from './composition-read.mjs';
// Installed native transport: domain records are workspace-scoped; the workspace
// registry and host Assets root are capability-scoped and send no workspace header.
const providerReads = {
  content: contentReadOperations,
  mapping: new Set(['initialize','read-all','list','get','snapshot']),
  sitemapper: new Set(['initialize','read-all','list','get','snapshot']),
  workspace: new Set(['list','selection','generation','open','find-seeding','missing-directories']),
  asset_file: new Set(['initialize','list','get','snapshot','resolve-version','pin-manifest']),
};
export function classifyRead(path, headers, body, workspaceId) {
  if (path === '/__zudo-native-edit') {
    assert(isNativeRead(path,body,workspaceId), 'Native mutation or malformed read refused');if(contentPreviewOperations.has(body.operation))assertContentPreviewHeaders(headers);
    return 'native';
  }
  if (path === '/__zudo-release') {
    assert(body?.clientId && body.requestId);
    assert.equal(body.clientId, headers['x-zudo-release-client']);
    assert.equal(body.requestId, headers['x-zudo-release-request']);
    assert.equal(body.request?.protocolVersion, 2);
    assert(['describe','list','get','active','stage','completed'].includes(body.request.operation), 'Release mutation refused');
    return 'release';
  }
  assert(typeof headers['x-zudo-composer-capability'] === 'string' && headers['x-zudo-composer-capability'].length > 0, 'Provider capability missing');
  if (path === '/__zudo_composer_file_provider') {
    assert.equal(headers['x-zudo-composer-workspace'], workspaceId);
    return 'composition'; // Existing gate validates the body operation/challenge.
  }
  const provider = /^\/__zudo_composer_(.+)_provider$/.exec(path)?.[1];
  assert(Object.hasOwn(providerReads,provider), 'Unknown provider refused');
  const operation = headers[provider === 'asset_file' ? 'x-zudo-composer-asset-operation' : 'x-zudo-composer-operation'];
  assert(providerReads[provider].has(operation), 'Provider mutation or unsupported read refused');
  if (provider === 'workspace' || provider === 'asset_file') {
    // Do not invent a header the installed store does not send. If present, it
    // must still agree; same-origin original transport and server capability bind
    // these global endpoints to the owned host, not to a client-supplied workspace.
    if (Object.hasOwn(headers,'x-zudo-composer-workspace')) assert.equal(headers['x-zudo-composer-workspace'],workspaceId);
    if (provider === 'workspace') {
      if (operation === 'open' && body?.id !== undefined) assert.equal(body.id,workspaceId);
      if (operation === 'missing-directories') assert.equal(body?.id,workspaceId);
      if (operation === 'find-seeding') assert.equal(body?.project?.id,workspaceId);
    }
  } else assert.equal(headers['x-zudo-composer-workspace'],workspaceId);
  return 'provider';
}
/** Closing aborts new reads; only the existing gate may settle derived outputs. */
export function closingReadAction(path,headers,body,workspaceId) {
  const kind=classifyRead(path,headers,body,workspaceId);
  if(kind!=='composition'||compositionRead(body))return 'abort-read';
  assert(['list','get'].includes(body?.operation),'Canonical Composition mutation refused at close');
  assert(body.outputsById&&typeof body.outputsById==='object'&&!Array.isArray(body.outputsById)&&Object.keys(body.outputsById).length,'Malformed Composition read refused at close');
  // This is delegation, not admission: the gate must match an outstanding exact
  // challenge and validate outputs before dispatch. Unchallenged output fails.
  return 'settle-composition';
}
/** Registry reads have no workspace header; bind selected/opened results instead. */
export function assertReadScope(path,headers,result,workspaceId) {
  if (path !== '/__zudo_composer_workspace_provider') return;
  const operation=headers['x-zudo-composer-operation'];
  if (operation === 'open') assert.equal(result?.id,workspaceId,'Opened another workspace');
  if (operation === 'selection') assert.equal(result,workspaceId,'Selected another workspace');
}

export function validateReadIntent(intent, snapshot) {
  assert(['mapping-binding-diagnostic','family-render','active-identity','header-restart','knowledge-saved-reference','knowledge-captured-reference','mapping-saved-create'].includes(intent.kind));
  if(intent.kind==='mapping-binding-diagnostic')validateBindingDiagnostic(intent,snapshot);
  assert.equal(intent.captureDigest, snapshot.digest);
  assert(/^[a-f0-9]{64}$/.test(snapshot.digest));
  assert(intent.capturePath?.startsWith('/'));
  if(['knowledge-saved-reference','knowledge-captured-reference','mapping-saved-create'].includes(intent.kind))assert(intent.recoveryEvidencePath?.startsWith('/'));
  if (intent.kind === 'header-restart') assert(intent.forwardProofPath?.startsWith('/'));
  if (intent.kind === 'family-render') {
    assert(['results','faq'].includes(intent.family));
    assert(typeof intent.marker === 'string' && /^[a-z][a-z0-9-]{4,60}$/.test(intent.marker));
    assert(typeof intent.childText === 'string' && intent.childText);
    assert(typeof intent.present === 'boolean');
    if (!intent.present) assert(typeof intent.oldFragment === 'string' && /^[a-z0-9-]+$/.test(intent.oldFragment));
  }
}
export function activeReadback(projectId) {
  let catalog, project;
  return {
    observe(input, result) {
      if (input.operation === 'list') {
        assert(result && Array.isArray(result.projects));
        const active = result.active;
        assert(active && active.projectId === projectId, 'Existing active release required');
        assert(typeof active.revision === 'string' && active.revision);
        assert(typeof active.buildId === 'string' && active.buildId);
        assert.equal(result.projects.find(p => p.projectId === projectId)?.head, active.revision, 'Unreviewed staged head');
        if (catalog) assert.deepEqual(result, catalog);
        catalog = structuredClone(result);
      }
      if (input.operation === 'get') {
        assert(catalog, 'Catalog must precede active project read');
        assert.equal(input.projectId, catalog.active.projectId);
        assert.equal(input.revision, catalog.active.revision);
        assert.equal(result.project?.id, projectId);
        assert.equal(result.revision, catalog.active.revision);
        if (project) assert.deepEqual(result, project);
        project = structuredClone(result);
      }
    },
    finish() { assert(catalog && project, 'Actual catalog and active project readback required'); return structuredClone(catalog.active); },
  };
}

export function assertPreviewIdentity(snapshot, preview) {
  const identity=preview?.identity;
  assert(identity);
  const expected={workspaceId:snapshot.workspaceId,revision:snapshot.digest,packId:snapshot.project.componentPack.packId,packVersion:snapshot.project.componentPack.packVersion,rendererId:snapshot.renderer.id,rendererVersion:snapshot.renderer.version,rendererDigest:snapshot.renderer.digest};
  for(const [key,value] of Object.entries(expected))assert.equal(identity[key],value,`Preview ${key} changed`);
  assert(typeof identity.pathname==='string' && identity.pathname.startsWith('/'));
}
export function validateHeaderRestart(snapshot, proof) {
  assert.equal(proof.status,'PUBLIC_CAPTURE_VERIFIED');
  assert.equal(proof.afterDigest,snapshot.digest,'Header accepted state changed');
  assert(['header','knowledge-reference'].includes(proof.intent?.kind));
  const ref=proof.ref;
  const entry=snapshot.project.providers.content.find(p=>p.id===ref.providerId)?.entries.find(e=>e.id===ref.recordId && e.modelId===ref.modelId);
  assert(entry,'Accepted Header/Knowledge owner missing');
  assert.deepEqual(entry.values,proof.result.record.values,'Accepted owner values changed');
  assert.deepEqual(entry.values[proof.field],proof.value);
  return proof;
}

/** Observe the installed client's bounded read retry; never issue a request here. */
export function busyReadTracker(){
 const pending=new Set(),retrying=new Set();
 const requestKey=(path,headers,input)=>JSON.stringify([path,headers['x-zudo-composer-operation'],headers['x-zudo-native-client'],headers['x-zudo-native-epoch'],input]);
 const retryable=new Set(['list','get','snapshot','read-all','list-models','get-model','get-entry','count-entries','page-entries','scan-entries','selection','generation','find-seeding','missing-directories']);
 return{
  get outstanding(){return pending.size;},
  claimRetry(path,headers,input){const key=requestKey(path,headers,input);if(!pending.has(key)||retrying.has(key))return false;retrying.add(key);return true;},
  observe(path,headers,input,response,workspaceId){
   const operation=headers['x-zudo-composer-operation']??input?.operation;
   const key=requestKey(path,headers,input);retrying.delete(key);
   if(response.status===409&&response.body?.ok===false&&response.body.error?.code==='authoring-busy'){
    const kind=classifyRead(path,headers,input,workspaceId);assert(kind==='provider'||(kind==='native'&&contentPreviewOperations.has(operation)),'Busy retry requires an exact installed marked read');
    assert.equal(headers['x-zudo-authoring-read'],'1','Busy read lacks installed retry hint');
    assert(retryable.has(operation)||(path==='/__zudo-native-edit'&&contentPreviewOperations.has(operation)),'Read has no installed retry contract');
    assert(typeof headers['x-zudo-native-client']==='string'&&headers['x-zudo-native-client']);
    assert(/^\d+$/.test(headers['x-zudo-native-epoch']??''),'Busy read has no coordinated epoch');
    pending.add(key);return true;
   }
   assert.equal(response.status,200);assert.equal(response.body?.ok,true);
   pending.delete(key);return false;
  },
  assertSettled(){assert.equal(pending.size,0,'Retryable read never produced matching successful original response');},
 };
}
