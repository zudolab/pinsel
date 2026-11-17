import assert from 'node:assert/strict';
const key = ref => JSON.stringify([ref.providerId, ref.modelId, ref.recordId]);
const sorted = values => [...values].sort((a,b) => key(a.ref).localeCompare(key(b.ref)));
/** Public release messages only. No private store reads or inferred model ownership. */
export function firstBaselineProof({ snapshot, requested, expectedActive }) {
  assert.equal(expectedActive,null, "First baseline requires explicitly reviewed null active identity");
  const published=snapshot.project.providers.content.flatMap(p=>p.entries.filter(e=>e.lifecycle==='published').map(e=>({ref:{providerId:p.id,modelId:e.modelId,recordId:e.id},action:'publish'})));
  assert(published.length>0, "Published baseline required");
  assert.deepEqual(sorted(requested),sorted(published), "Select exactly reviewed published baseline; no drafts or additions");
  let catalog, plan, staged, stageGeneration, completed, activated, activationPending=false, reconciliation, activeRead=false, candidateRead=false, challenge, workspaceToken, reconciledSnapshot;
  const selected = () => {
    assert(catalog, 'Successful public empty catalog required');
    assert.equal(catalog.active,null);
    const refs=[];
    const map = new Map(refs.map(ref => [key(ref), { ref, action:'publish' }]));
    for (const item of requested) {
      assert.equal(item.action,'publish','Static-copy publication only');
      assert(item.ref.providerId && item.ref.modelId && item.ref.recordId);
      assert.equal(requested.filter(x => key(x.ref) === key(item.ref)).length, 1, 'Duplicate intended reference');
      map.set(key(item.ref), item);
    }
    return [...map.values()];
  };
  return {
    selection: selected,
    workspaceRead(record) {
      assert.equal(record.id,snapshot.workspaceId);assert.equal(record.status,'ready');
      const metadata=structuredClone(snapshot.project);
      for(const domain of Object.keys(metadata.providers))metadata.providers[domain]=metadata.providers[domain].map(({id})=>({id}));
      assert.deepEqual(record.metadata,metadata);assert(Number.isSafeInteger(record.mutationToken));
      if(workspaceToken!==undefined)assert.equal(record.mutationToken,workspaceToken);
      workspaceToken=record.mutationToken;
    },
    reconcileChallenge(payload) {
      assert(activationPending && completed && !challenge);
      assert.equal(payload.kind,'reconcile');assert.deepEqual(payload.active,completed.identity);
      assert.deepEqual(payload.changes,completed.stage.publication);
      assert(Number.isSafeInteger(payload.activationGeneration) && payload.activationGeneration>0);
      challenge=structuredClone(payload);
    },
    reconcileBefore(input) {
      assert(challenge,'Exact activation WebSocket challenge required');
      assert.equal(input.activationGeneration,challenge.activationGeneration);
      assert(activationPending && completed && !reconciliation, 'Only one reconciliation during exact activation');
      assert.deepEqual(input.reconciliations, completed.stage.publication);
      assert(Number.isSafeInteger(input.activationGeneration) && input.activationGeneration > 0);
      reconciliation=structuredClone(input);
    },
    reconcileAfter(body) {
      assert(body.ok); assert.equal(body.result.activationGeneration,reconciliation.activationGeneration);
      assert.equal(snapshot.project.providers.content.length,1);
      const provider=snapshot.project.providers.content[0];
      assert.deepEqual(body.result,{providerId:provider.id,models:provider.models??[],entries:provider.entries,mutationToken:snapshot.tokens.content+1,activationGeneration:reconciliation.activationGeneration});
      reconciledSnapshot=structuredClone(body.result);
    },
    before(input) {
      assert.equal(input.protocolVersion, 2);
      if (input.operation === 'plan') {
        assert(!plan, 'Do not prepare a second plan');
        assert.deepEqual(input.project, snapshot.project, 'Working project changed');
        assert(workspaceToken!==undefined,'Public workspace open response required');
        const tokens={workspace:workspaceToken,'assets:asset-files':snapshot.tokens.assets};
        for(const domain of ['compositions','mappings','sitemaps','content']){
          assert.equal(snapshot.project.providers[domain].length,1,'Pilot requires one native provider per domain');
          tokens[`${domain}:${snapshot.project.providers[domain][0].id}`]=snapshot.tokens[domain];
        }
        assert.deepEqual(input.workingPrecondition.tokens,tokens,'Qualified working tokens changed');
        assert.equal(input.workingPrecondition.workspaceId,snapshot.workspaceId);
        assert(Number.isSafeInteger(input.workingPrecondition.sessionGeneration) && input.workingPrecondition.sessionGeneration>=0);
        assert.deepEqual(input.expectedActive, catalog?.active);
        assert.equal(input.expectedRevision, catalog?.projects.find(p => p.projectId === snapshot.project.id)?.head ?? null);
        assert.deepEqual(sorted(input.selection), sorted(selected()));
      } else if (input.operation === 'apply') { assert(plan && !staged); assert.deepEqual(input.plan, plan); }
      else if (input.operation === 'build') { assert(staged && !completed); assert.deepEqual({projectId:input.projectId,buildId:input.buildId}, {projectId:staged.projectId,buildId:staged.buildId}); }
      else if (input.operation === 'activate') {
        assert(completed && !activated);
        assert.deepEqual({projectId:input.projectId,revision:input.revision,buildId:input.buildId}, completed.identity);
        assert.deepEqual(input.expectedActive, catalog.active); activationPending=true;
      } else assert(['describe','list','get','active','stage','completed'].includes(input.operation), 'Unapproved release operation');
    },
    after(input, body) {
      assert.equal(body.ok, true, JSON.stringify(body));
      const result = body.result;
      if (input.operation === 'list' && activated) { assert.deepEqual(result.active,activated); activeRead=true; }
      else if (input.operation === 'get' && activated) { assert.deepEqual({projectId:input.projectId,revision:input.revision},{projectId:activated.projectId,revision:activated.revision}); assert.deepEqual(result.project,plan.candidate); assert.equal(result.revision,plan.projectRevision); candidateRead=true; }
      else if(input.operation==='get' && !plan) { assert.fail('No preexisting release is allowed for first baseline'); }
      else if (input.operation === 'list' && !plan) {
        assert(result && Array.isArray(result.projects) && Object.hasOwn(result,'active'));
        assert.equal(result.active,null,'Existing active release refuses first activation');
        assert.equal(result.projects.length,0,'Any preexisting project or staged head refuses first activation');
        if(catalog)assert.deepEqual(result,catalog,'Release catalog changed');
        catalog=structuredClone(result);
      } else if (input.operation === 'plan') {
        assert.deepEqual(result.workingProject, input.project);
        assert.deepEqual(result.workingPrecondition, input.workingPrecondition);
        assert.deepEqual(sorted(result.selection), sorted(input.selection));
        assert.deepEqual(result.expectedActive, input.expectedActive);
        assert.equal(result.expectedRevision, input.expectedRevision);
        assert.equal(result.storeGeneration, catalog.generation);
        assert(!result.checks.some(c => c.severity === 'blocking'));
        for (const field of ['projectRevision','buildId','planDigest']) assert(typeof result[field] === 'string' && result[field]);
        assert(result.toolchain && result.candidate?.id === snapshot.project.id);
        const expected=structuredClone(snapshot.project);
        for(const provider of expected.providers.content)provider.entries=provider.entries.filter(e=>e.lifecycle==='published').sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
        assert.deepEqual(result.candidate,expected,'First baseline changed canonical values or included an unselected draft');
        assert.equal(result.publication.length,published.length);
        assert.deepEqual(sorted(result.publication.map(item=>({ref:item.ref,action:'publish'}))),sorted(published));
        for(const item of result.publication){
          const owner=snapshot.project.providers.content.find(p=>p.id===item.ref.providerId).entries.find(e=>e.id===item.ref.recordId&&e.modelId===item.ref.modelId);
          assert.deepEqual(Object.keys(item).sort(),['ref','expectedGeneration','expectedDigest','lifecycle'].sort());
          assert.equal(item.lifecycle,'published');assert.equal(item.expectedGeneration,owner.generation);
          assert.equal(typeof item.expectedDigest,'string');assert(item.expectedDigest.length>0);
        }
        plan = structuredClone(result);
      } else if (input.operation === 'apply') {
        assert(Number.isInteger(result.stageGeneration));
        assert.deepEqual(result.staged, {schemaVersion:2,projectId:plan.candidate.id,revision:plan.projectRevision,buildId:plan.buildId,assetLock:plan.assetLock,toolchain:plan.toolchain,planDigest:plan.planDigest,publication:plan.publication});
        staged = structuredClone(result.staged); stageGeneration=result.stageGeneration;
      } else if (input.operation === 'build') {
        assert.deepEqual(result.stage, staged);
        assert.deepEqual(result.identity,{projectId:staged.projectId,revision:staged.revision,buildId:staged.buildId});
        assert(result.completionDigest && result.files && result.build);
        completed = structuredClone(result);
      } else if (input.operation === 'activate') {
        assert.deepEqual(result.active, completed.identity); assert.equal(result.reconciliation,'applied');
        assert(reconciliation && reconciledSnapshot); assert.equal(result.activationGeneration,reconciliation.activationGeneration);
        activated = structuredClone(result.active);
      }
    },
    finish() { assert(activated && activeRead && candidateRead, 'Exact activation and public catalog/candidate readback required'); return { plan, staged, stageGeneration, completed, active:activated, reconciledSnapshot }; }
  };
}

export function auditFirstBaseline(before,after,release) {
  assert(release?.active && release.reconciledSnapshot,'Durable public activation/reconciliation evidence required');
  assert.equal(after.tokens.content,before.tokens.content+1);
  assert.equal(after.tokens.content,release.reconciledSnapshot.mutationToken);
  const strip=s=>{const value=structuredClone(s);delete value.digest;delete value.tokens.content;return value;};
  assert.deepEqual(strip(after),strip(before),'First activation changed canonical fields, generations, structure, assets or other domain tokens');
  assert.notEqual(after.digest,before.digest);
  return {beforeDigest:before.digest,afterDigest:after.digest,beforeContentToken:before.tokens.content,afterContentToken:after.tokens.content};
}
