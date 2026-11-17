import assert from 'node:assert/strict';
import { drainAll } from './original-request.mjs';
/** Close is a settlement boundary, including handlers that finish during context.close. */
export function releaseLifecycle({ lanes, composition, blocked }) {
  let closing = false;
  const requireOpen = () => assert(!closing, 'Publication close fence');
  const requireSettled = () => {
    requireOpen();
    composition.assertSettled();
    assert(!blocked(), blocked()?.message);
  };
  const settle = async () => {
    await drainAll(...lanes);
    composition.assertSettled();
    assert(!blocked(), blocked()?.message);
  };
  return {
    get closing() { return closing; },
    requireOpen,
    requireSettled,
    async close(context) {
      closing = true;
      let failure;
      try { await settle(); } catch (error) { failure = error; }
      try { await context.close(); } catch (error) { failure ??= error; }
      try { await settle(); } catch (error) { failure ??= error; }
      if (failure) throw failure;
    },
  };
}
