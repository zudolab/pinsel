import { test } from 'vitest';
import assert from 'node:assert/strict';
import { clickRevealedTreeAction } from './tree-action.mjs';

test('a collapsed structure action is hovered into view before the click', async () => {
  const order = [];
  let visible = false;
  const action = {
    async click(options = {}) {
      assert.equal(options.force, undefined);
      assert.equal(visible, true);
      order.push('click');
    },
  };
  const header = {
    async scrollIntoViewIfNeeded() { order.push('scroll'); },
    async hover() { visible = true; order.push('hover'); },
    getByRole() { return action; },
  };
  const page = { getByRole: () => ({}), locator: () => ({ filter: () => header }) };
  const expect = { async toHaveCount() { order.push('count'); }, async toBeVisible() { assert.equal(visible, true); order.push('visible'); } };
  await clickRevealedTreeAction(page, (value) => ({ toHaveCount: () => expect.toHaveCount(value), toBeVisible: () => expect.toBeVisible(value) }), 'Add component to body');
  assert.deepEqual(order, ['count', 'scroll', 'hover', 'visible', 'click']);
});
