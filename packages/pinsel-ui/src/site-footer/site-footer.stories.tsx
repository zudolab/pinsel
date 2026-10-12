import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { FooterLink } from "../footer-link/footer-link";
import { FOOTER_NAV } from "../site-frame/site-frame";
import { SiteFooter } from "./site-footer";

const meta: StoryMeta = {
  title: "SiteFooter",
  category: "Chrome",
  description: "Identity and Instagram, the seven footer links, copyright and back-to-top.",
  usage: `import { SiteFooter } from "@pinsel/ui";\n\n<SiteFooter brandWord="Pinsel" … copyright="© 2015–{year} Pinsel Germany. All rights reserved." nav={links} />`,
};
export default meta;

export const Default: Story = {
  name: "Footer",
  render: (): Child => (
    <SiteFooter
      brandWord="Pinsel"
      brandSub="ART STUDY IN GERMANY"
      instagramLabel="yuko_takatsudo"
      copyright="© 2015–2026 Pinsel Germany. All rights reserved."
      backToTopLabel="ページの先頭へ"
      nav={FOOTER_NAV.map((item) => <FooterLink {...item} />)}
    />
  ),
};
