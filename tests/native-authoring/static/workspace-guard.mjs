import assert from 'node:assert/strict';
export function assertRequestWorkspace(snapshot,request){assert.equal(request.headers()['x-zudo-composer-workspace'],snapshot.workspaceId,'Mutation workspace differs from reviewed capture');}
