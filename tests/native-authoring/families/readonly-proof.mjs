import assert from 'node:assert/strict';
const providerReads = new Set(['initialize','read-all','list','get','snapshot','selection','generation','find-seeding','missing-directories','list-records','get-record','list-models','get-model','get-entry','count-entries','page-entries','scan-entries','describe','status','editorial-read','editorial-fields','editorial-revisions','editorial-publication']);
const providers = new Set(['content','mapping','sitemap','workspace','asset_file']);
export function classifyRead(path, headers, body, workspaceId) {
  if (path === '/__zudo-native-edit') {
    assert(['inspect','review','receipt','document-preview'].includes(body?.operation), 'Native mutation refused');
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
  assert.equal(headers['x-zudo-composer-workspace'], workspaceId);
  if (path === '/__zudo_composer_file_provider') return 'composition';
  const provider = /^\/__zudo_composer_(.+)_provider$/.exec(path)?.[1];
  assert(providers.has(provider), 'Unknown provider refused');
  const operation = headers[provider === 'asset_file' ? 'x-zudo-composer-asset-operation' : 'x-zudo-composer-operation'];
  assert(providerReads.has(operation) || (provider === 'workspace' && operation === 'open'), 'Provider mutation refused');
  return 'provider';
}
export function validateReadIntent(intent, snapshot) {
  assert(['family-render','active-identity','header-restart'].includes(intent.kind));
  assert.equal(intent.captureDigest, snapshot.digest);
  assert(/^[a-f0-9]{64}$/.test(snapshot.digest));
  assert(intent.capturePath?.startsWith('/'));
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
