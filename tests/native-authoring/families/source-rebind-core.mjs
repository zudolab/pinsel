import assert from 'node:assert/strict';
import {assertFamilySupplementBoundary} from './installation-supplement-boundary.mjs';
const restricted=path=>/(^|\/)(package\.json|[^/]*lock[^/]*|[^/]*config[^/]*)$/i.test(path);
export function assertReviewedHarnessDelta(oldSource,currentSource,reviewed){
 assert.notEqual(oldSource.head,currentSource.head);assert.match(currentSource.head,/^[a-f0-9]{40}$/);
 const paths=[...new Set([...Object.keys(oldSource.hashes),...Object.keys(currentSource.hashes)])].sort();
 const actual=paths.filter(path=>oldSource.hashes[path]!==currentSource.hashes[path]).map(path=>({path,before:oldSource.hashes[path]??null,after:currentSource.hashes[path]??null}));
 assert(actual.length,'Source rebind requires a reviewed change');assert.deepEqual(reviewed,actual,'Exact reviewed source delta required');
 for(const {path,before,after}of actual){assert(/^(tests|docs)\//.test(path)&&!restricted(path),'Runtime/manifest/config change forbidden');for(const h of [before,after])if(h!==null)assert.match(h,/^[a-f0-9]{64}$/);}
 return actual;
}
export function sourceRebindProof({chain,before,after,oldInstallation,installation,reviewed,paths}){
 assert.equal(chain.history.length,16);assert.equal(chain.history[15].intent.sequence.step,'parent-limit');
 assert.deepEqual(before,chain.snapshot);assert.deepEqual(after,before,'Source-only rebind cannot alter any public state');
 assert.equal(oldInstallation.source.head,chain.supplement.source);
 assert.equal(oldInstallation.composer,'c5ffd410f74ba4b3aa003da068efeeae6e663c37');
 assert.equal(installation.composer,oldInstallation.composer);assert.equal(installation.stage,oldInstallation.stage);
 assert.deepEqual(installation.installed,oldInstallation.installed,'Four installed packages and lock must remain exact');
 assert.deepEqual(installation.identities,oldInstallation.identities,'Pack/renderer/schema identity drift');
 const changes=assertReviewedHarnessDelta(oldInstallation.source,installation.source,reviewed);
 return{schemaVersion:1,kind:'family-source-rebind',boundary:16,composer:installation.composer,stage:installation.stage,oldSource:oldInstallation.source.head,source:installation.source.head,captureDigest:after.digest,changes,...paths};
}
export function assertSourceRebindBoundary(rebind,bridge,supplement,history,snapshot){
 assert.equal(rebind.status,'FAMILY_SOURCE_REBIND_VERIFIED');assert.equal(rebind.boundary,16);assert(history.length>=16);
 assert.deepEqual(rebind.originalDescriptor,bridge.descriptor);assert.deepEqual(rebind.supplementDescriptor,supplement.descriptor);
 assertFamilySupplementBoundary(bridge,supplement,history,snapshot);
 for(let i=0;i<16;i++)assert.deepEqual(history[i],rebind.history[i],'Historical proof changed');
 if(history.length===16)assert.deepEqual(snapshot,rebind.snapshot,'Full source rebind boundary capture required');
 for(let i=16;i<history.length;i++)assert.deepEqual(history[i].intent.familySourceRebind,rebind.descriptor,'Unqualified source gap');
}
