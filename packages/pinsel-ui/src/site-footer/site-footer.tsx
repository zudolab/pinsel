import type { Child } from "@takazudo/zfb/zudo-react";
import { Brand } from "../brand/brand";
import { Icon } from "../icon/icon";

export const INSTAGRAM_URL = "https://www.instagram.com/yuko_takatsudo";

export interface SiteFooterProps {
  brandWord: string;
  brandSub: string;
  instagramLabel: string;
  /** `{year}` is replaced with the current year. */
  copyright: string;
  backToTopLabel: string;
  /** Rendered `FooterLink`s, seven in the approved design. */
  nav: Child;
}

export function formatCopyright(copyright: string, now: Date = new Date()): string {
  return copyright.replaceAll("{year}", String(now.getUTCFullYear()));
}

/** Prototype `ui.py footer()`: identity + Instagram, the seven-link footer menu, copyright and back-to-top. */
export function SiteFooter(props: SiteFooterProps): Child {
  return (
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-identity">
          <Brand word={props.brandWord} sub={props.brandSub} />
          <a class="footer-instagram" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="instagram" />
            <span>
              <span class="footer-instagram__label">Instagram</span>
              <span>{props.instagramLabel}</span>
            </span>
            <Icon name="arrow-up-right" />
          </a>
        </div>
        <nav aria-label="フッターメニュー">
          <ul class="footer-nav">{props.nav}</ul>
        </nav>
      </div>
      <div class="container footer-bottom">
        <p>{formatCopyright(props.copyright)}</p>
        <a href="#top">
          <span>{props.backToTopLabel}</span>
          <Icon name="arrow-up" />
        </a>
      </div>
    </footer>
  );
}
