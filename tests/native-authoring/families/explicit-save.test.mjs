import { test } from 'vitest';
import assert from 'node:assert/strict';
import { explicitSaveControl } from './explicit-save.mjs';

test('composition property edits do not wait for a Save button', () => {
  assert.equal(explicitSaveControl('compositions'), false);
  assert.equal(explicitSaveControl('mappings'), true);
  assert.equal(explicitSaveControl('content'), true);
});
