import assert from 'node:assert/strict';
/** Manifest digest is additionally verified by public compileAuthoringWorkspaceSnapshot. */
export function assertInstalledIdentities(snapshot, { packIdentity, renderer }) {
  const { manifestDigest, ...capturedIdentity } = snapshot.componentPack;
  assert(typeof manifestDigest === 'string' && manifestDigest.length > 0, 'Captured pack manifest digest required');
  assert.deepEqual(packIdentity, capturedIdentity, 'Installed host pack changed');
  assert.deepEqual(renderer, snapshot.renderer, 'Installed host renderer changed');
}
