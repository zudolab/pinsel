import type { Child } from "@takazudo/zfb/zudo-react";
import type { Story, StoryMeta } from "../stories/types";
import { NavLink } from "../nav-link/nav-link";
import { HEADER_NAV } from "../site-frame/site-frame";
import { SiteHeader } from "./site-header";

const meta: StoryMeta = {
  title: "SiteHeader",
  category: "Chrome",
  description: "Sticky header: brand, six navigation items, the green contact button and the motion toggle. Narrow the preview below 70rem for the menu.",
  usage: `import { SiteHeader } from "@pinsel/ui";\n\n<SiteHeader brandWord="Pinsel" brandSub="ART STUDY IN GERMANY" contactLabel="お問い合わせ" nav={links} pathname="/lessons/" />`,
};
export default meta;

const header = (options: { pathname: string; menuOpen?: boolean; motionOn?: boolean }): Child => (
  <SiteHeader
    brandWord="Pinsel"
    brandSub="ART STUDY IN GERMANY"
    contactLabel="お問い合わせ"
    nav={HEADER_NAV.map((item) => <NavLink {...item} route={{ pathname: options.pathname }} />)}
    pathname={options.pathname}
    menuOpen={options.menuOpen}
    motionOn={options.motionOn}
  />
);

export const Closed: Story = { name: "Menu closed, motion off (initial)", render: (): Child => header({ pathname: "/" }) };
export const Current: Story = { name: "aria-current on 合格実績", render: (): Child => header({ pathname: "/results/" }) };
export const Open: Story = { name: "Menu open (narrow viewport)", render: (): Child => header({ pathname: "/", menuOpen: true }) };
export const MotionOn: Story = { name: "Motion on", render: (): Child => header({ pathname: "/", motionOn: true }) };
