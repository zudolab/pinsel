import assert from'node:assert/strict';
import{CONTINUATION_SOURCE}from'./continuation-core.mjs';
// Exact production bytes independently reviewed at 1755ec1cba2efea87f8c434d78fbc86ee4ec4d8f.
// Policy receipt fe088c6188ea0a10c04b257ce86ff6f34997d81fa3dc108293ca7803515f9bab; no native acceptance implied.
export const IPC_RUNTIME_DELTA={
  "packages/pinsel-content/src/site/start-native.ts": {
    "before": "ccefac6d8b061c82539648986d942368d59fe4840c3a6b16331261d7580bcce2",
    "after": "3791083d5a15907e35d83d0b80b67602a8f6ad97515eb6dfb84d03bae870bc3e"
  },
  "packages/pinsel-content/src/site/native-owner-ipc.mjs": {
    "before": null,
    "after": "e6fb37b41c9bb3212d3afbb9b47d0f7c02e3bc5b3987e5eca260c743c7af7116"
  },
  "packages/pinsel-content/src/site/native-owner-ipc.d.mts": {
    "before": null,
    "after": "e125031d4c076e0ec5bc222060ed4ae507beb32c9c82f07e50aee2f4085427f2"
  }
};
export function assertContinuationSource(oldSource,currentSource,reviewed){
 assert.equal(oldSource.head,CONTINUATION_SOURCE);assert.match(currentSource.head,/^[a-f0-9]{40}$/);assert.notEqual(oldSource.head,currentSource.head);assert.equal(currentSource.status??'', '');
 const names=[...new Set([...Object.keys(oldSource.hashes),...Object.keys(currentSource.hashes)])].sort();const actual=names.filter(p=>oldSource.hashes[p]!==currentSource.hashes[p]).map(path=>({path,before:oldSource.hashes[path]??null,after:currentSource.hashes[path]??null}));assert.deepEqual(reviewed,actual);
 for(const[path,pair]of Object.entries(IPC_RUNTIME_DELTA)){assert.deepEqual({before:oldSource.hashes[path]??null,after:currentSource.hashes[path]??null},pair,'Exact independently reviewed IPC production bytes required');assert(actual.some(x=>x.path===path));}
 for(const row of actual){if(Object.hasOwn(IPC_RUNTIME_DELTA,row.path))continue;assert(/^(tests|docs)\//.test(row.path)&&!/(^|\/)(package\.json|[^/]*lock[^/]*|[^/]*config[^/]*)$/i.test(row.path),'Unreviewed runtime/config/package change');for(const h of [row.before,row.after])if(h!==null)assert.match(h,/^[a-f0-9]{64}$/);}return actual;
}
