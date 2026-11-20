import assert from 'node:assert/strict';
/** Use the site's actual responsive menu, including container-width breakpoints. */
export async function revealHeaderLink(root,link,expect){
 await expect(link).toHaveCount(1);
 if(await link.isVisible())return {menuOpened:false};
 const toggle=root.locator('.menu-toggle[aria-controls="site-navigation"]'),nav=root.locator('#site-navigation.site-nav');
 await expect(toggle).toHaveCount(1);await expect(nav).toHaveCount(1);
 await expect(toggle).toBeVisible({timeout:180000});
 assert.equal(await toggle.getAttribute('aria-expanded'),'false','Hidden target with already expanded menu is not recoverable');
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true',{timeout:180000});
 await expect(nav).toHaveAttribute('data-open','',{timeout:180000});
 await expect(link).toBeVisible({timeout:180000});return {menuOpened:true};
}
