import type { Child } from "@takazudo/zfb/zudo-react";
import { Brand } from "../brand/brand";
import { Icon } from "../icon/icon";
import { isCurrentSection } from "../nav-link/nav-link";

export interface SiteHeaderProps {
  brandWord: string;
  brandSub: string;
  /** The green contact button's label. */
  contactLabel: string;
  /** Rendered `NavLink`s, six in the approved design (no 料金 item). */
  nav: Child;
  pathname?: string;
}

/**
 * Prototype `ui.py header()`. The visitor scripts depend on `.site-header`,
 * `.menu-toggle[aria-controls=site-navigation]`, `#site-navigation.site-nav`,
 * `[data-motion-toggle]` and `[data-motion-label]`; the menu and motion
 * toggles start collapsed / off and only the scripts change them.
 */
export function SiteHeader(props: SiteHeaderProps): Child {
  return (
    <div class="site-header">
      <header class="container site-header__inner">
        <Brand word={props.brandWord} sub={props.brandSub} />
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
          <span>メニュー</span>
          <Icon name="menu" class="menu-open-icon" />
          <Icon name="close" class="menu-close-icon" />
        </button>
        <nav id="site-navigation" class="site-nav" aria-label="メインメニュー">
          {props.nav}
          <a class="site-nav__contact button--primary" href="/contact/" aria-current={isCurrentSection(props.pathname, "/contact/") ? "page" : null}>
            <Icon name="mail" />
            <span>{props.contactLabel}</span>
          </a>
        </nav>
        <button class="motion-toggle" type="button" aria-label="装飾の動きと色の変化" aria-pressed="false" data-motion-toggle="">
          <Icon name="pause" class="motion-running-icon" />
          <Icon name="play" class="motion-paused-icon" />
          <span data-motion-label="">動き OFF</span>
        </button>
      </header>
    </div>
  );
}
