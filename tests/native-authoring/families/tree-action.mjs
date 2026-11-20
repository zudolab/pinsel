/** Structure-row actions stay collapsed until the row is hovered or focused. */
export async function clickRevealedTreeAction(page, expect, name) {
  const add = page.getByRole('button', { name, exact: true });
  const header = page.locator('.cms-tree-group__header').filter({ has: add });
  await expect(header).toHaveCount(1, { timeout: 180000 });
  await header.scrollIntoViewIfNeeded();
  await header.hover();
  const action = header.getByRole('button', { name, exact: true });
  await expect(action).toBeVisible({ timeout: 180000 });
  await action.click();
}
