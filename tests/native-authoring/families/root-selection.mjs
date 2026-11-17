import assert from 'node:assert/strict';
/** The ARIA root child path is canonical root[0], never virtual Document. */
export function canonicalRoot(record){const root=record.document.root[0];assert(root?.id);const ids=[];const walk=nodes=>nodes.forEach(n=>{ids.push(n.id);walk(Object.values(n.slots??{}).flat());});walk(record.document.root);assert.equal(ids.filter(id=>id===root.id).length,1);return root;}
export async function selectCanonicalRoot(page,expect,record){
 const root=canonicalRoot(record),tree=page.getByRole('tree',{name:'Structure',exact:true});
 const row=tree.locator('[role="treeitem"][aria-level="2"][aria-posinset="1"]');await expect(row).toHaveCount(1,{timeout:180000});await row.click();await expect(row).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Properties',exact:true}).click();
 await expect(page.locator('.sg-composer-inspector-node').locator('code').filter({hasText:new RegExp('^'+RegExp.escape(root.id)+'$')})).toHaveCount(1,{timeout:180000});
 return root.id;
}
