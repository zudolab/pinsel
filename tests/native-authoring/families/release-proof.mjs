import {validateAdditionalChild} from './second-child.mjs';
import assert from 'node:assert/strict';
const key = ref => JSON.stringify([ref.providerId, ref.modelId, ref.recordId]);
const sorted = values => [...values].sort((a,b) => key(a.ref).localeCompare(key(b.ref)));
/** Public release messages only. No private store reads or inferred model ownership. */
export function releaseProof({ snapshot, requested, expectedActive, additionalChild }) {
  let baseline, catalog, plan, staged, stageGeneration, completed, activated, activationPending=false, reconciliation, activeRead=false, candidateRead=false, challenge, workspaceToken;
  if(additionalChild)validateAdditionalChild(snapshot,requested,additionalChild);else {assert.equal(requested.length,2,'Exactly the reviewed parent and child');const [parent,child]=requested.map(x=>x.ref);assert.equal(parent.providerId,'content-filesystem');assert.equal(child.providerId,parent.providerId);const field=parent.modelId==='result-year'&&child.modelId==='result-entry'?'result-entry-year':parent.modelId==='faq-group'&&child.modelId==='faq-item'?'faq-item-group':null;assert(field);const entry=snapshot.project.providers.content.find(p=>p.id===child.providerId).entries.find(e=>e.modelId===child.modelId&&e.id===child.recordId);assert(entry);assert.deepEqual(entry.values[field],parent);}
  const selected = () => {
    assert(catalog && baseline, 'Successful public catalog and exact active project read required');
    assert(expectedActive && expectedActive.projectId===snapshot.project.id);assert.deepEqual(catalog.active,expectedActive);const refs=[];
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
      else if(input.operation==='get' && !plan){assert(catalog);assert.deepEqual({projectId:input.projectId,revision:input.revision},{projectId:expectedActive.projectId,revision:expectedActive.revision});assert.equal(result.revision,expectedActive.revision);assert.equal(result.project.id,expectedActive.projectId);if(baseline)assert.deepEqual(result.project,baseline);baseline=structuredClone(result.project);}
      else if (input.operation === 'list' && !plan) {
        assert(result && Array.isArray(result.projects) && Object.hasOwn(result,'active'));
        assert.deepEqual(result.active,expectedActive,'Active release changed since reviewed publication');assert.equal(result.projects.find(p=>p.projectId===snapshot.project.id)?.head,expectedActive.revision,'Unreviewed staged project head');
        if (catalog) assert.deepEqual(result, catalog, 'Release catalog changed');
        catalog = structuredClone(result);
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
        assert(baseline);
        if(additionalChild){for(const ref of [additionalChild.family.content.parent,additionalChild.family.content.child]){const entries=baseline.providers.content.find(p=>p.id===ref.providerId)?.entries??[];assert.equal(entries.filter(e=>e.modelId===ref.modelId&&e.id===ref.recordId&&e.lifecycle==='published').length,1,'Existing family must remain in active baseline');}}
        const expected=structuredClone(snapshot.project);
        for(const provider of expected.providers.content){
          const entries=new Map((baseline.providers.content.find(p=>p.id===provider.id)?.entries??[]).filter(e=>e.lifecycle==='published').map(e=>[e.id,structuredClone(e)]));
          for(const selected of requested.filter(x=>x.ref.providerId===provider.id)){
            const old=entries.get(selected.ref.recordId);
            const matches=provider.entries.filter(e=>e.id===selected.ref.recordId && e.modelId===selected.ref.modelId);assert.equal(matches.length,1);if(old){assert.equal(matches[0].lifecycle,'published');assert.equal(old.modelId,selected.ref.modelId);assert.notDeepEqual(matches[0].values,old.values,'No-op publication refused');}else assert.equal(matches[0].lifecycle,'draft');
            entries.set(matches[0].id,{...structuredClone(matches[0]),lifecycle:'published'});
          }
          provider.entries=[...entries.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
        }
        assert.deepEqual(result.candidate,expected,'Candidate changed retained baseline or published an unselected draft');
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
        assert(reconciliation); assert.equal(result.activationGeneration,reconciliation.activationGeneration);
        activated = structuredClone(result.active);
      }
    },
    finish() { assert(activated && activeRead && candidateRead, 'Exact activation and public catalog/candidate readback required'); return { plan, staged, stageGeneration, completed, active:activated }; }
  };
}
