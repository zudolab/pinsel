import type { Child } from "@takazudo/zfb/zudo-react";
import { Brand } from "../brand/brand";
import { Icon } from "../icon/icon";
import { isCurrentSection } from "../nav-link/nav-link";

export interface SiteHeaderProps {
  brandWord: string;
  /** Legacy shared-frame descriptor; the header uses the accepted caption below. */
  brandSub: string;
  /** The green contact button's label. */
  contactLabel: string;
  /** Rendered `NavLink`s, six in the approved design (no 料金 item). */
  nav: Child;
  pathname?: string;
  /** Static initial states for stories; the visitor scripts own them at runtime. */
  menuOpen?: boolean;
}

/**
 * Prototype `ui.py header()`. The visitor scripts depend on `.site-header`,
 * `.menu-toggle[aria-controls=site-navigation]`, `#site-navigation.site-nav`,
 * the menu starts collapsed and the visitor script changes its state.
 */
export function SiteHeader(props: SiteHeaderProps): Child {
  return (
    <div class="site-header">
      <header class="container site-header__inner">
        <Brand word={props.brandWord} sub={props.brandSub} captionLines={["ONLINE PREPARATION", "FOR GERMAN ART SCHOOLS"]} />
        <button class="menu-toggle" type="button" aria-expanded={props.menuOpen ? "true" : "false"} aria-controls="site-navigation" aria-label="メニュー">
          <span class="menu-toggle__label">メニュー</span>
          <Icon name="menu" class="menu-open-icon" />
          <Icon name="close" class="menu-close-icon" />
        </button>
        <nav id="site-navigation" class="site-nav" aria-label="メインメニュー" data-open={props.menuOpen ? "" : null}>
          {props.nav}
          <a class="site-nav__contact button--primary" href="/contact/" aria-current={isCurrentSection(props.pathname, "/contact/") ? "page" : null}>
            <Icon name="mail" />
            <span>{props.contactLabel}</span>
          </a>
        </nav>
      </header>
    </div>
  );
}
