import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";
import type { RouteContext } from "../render/types";

// Gate-1 structure literals from the approved prototype (`ui.py` NAV and the
// footer `navLinks` frontmatter). The content-migration sub-issue replaces
// them with `nav-link` entries projected through the structure manifest.
export const HEADER_NAV: readonly { href: string; label: string }[] = [
  { href: "/lessons/", label: "オンラインクラス" },
  { href: "/about/", label: "講師紹介" },
  { href: "/results/", label: "合格実績" },
  { href: "/voices/", label: "生徒の声" },
  { href: "/notes/", label: "Notes" },
  { href: "/faq/", label: "よくある質問" },
];

export const FOOTER_NAV: readonly { href: string; label: string; title: string; description: string }[] = [
  { href: "/lessons/", label: "Lessons", title: "オンラインクラス", description: "マッペ制作から出願まで完全マンツーマンサポート" },
  { href: "/notes/", label: "Notes", title: "ドイツ美大受験ノート", description: "ドイツ美大受験に関する情報まとめ" },
  { href: "/results/", label: "Results", title: "合格実績", description: "11年間で123件以上、30校以上の合格実績" },
  { href: "/voices/", label: "Voices", title: "生徒の声", description: "受講生の合格体験談をご紹介" },
  { href: "/about/", label: "About", title: "講師紹介", description: "東京芸大卒・ミュンヘン芸術アカデミー修了" },
  { href: "/faq/", label: "FAQ", title: "よくある質問", description: "レッスンや受験に関するQ&A" },
  { href: "/contact/", label: "Contact", title: "お問い合わせ", description: "まずはお気軽にご相談ください" },
];

export const INSTAGRAM_URL = "https://www.instagram.com/yuko_takatsudo";

export interface SiteFrameProps {
  brandWord: string;
  brandSub: string;
  instagramLabel: string;
  copyright: string;
  backToTopLabel: string;
  /** Composer outlet slot: the route's own composition renders here, inside `<main>`. */
  main?: readonly unknown[];
  /** Injected by the renderer; never authored. */
  route?: RouteContext;
}

function isCurrent(pathname: string | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function Brand({ word, sub }: { word: string; sub: string }): Child {
  return (
    <a href="/" class="brand" aria-label={`${word} トップページ`}>
      <span class="brand__word">{word}</span>
      <span class="brand__sub">{sub}</span>
    </a>
  );
}

/** Prototype `ui.py header()` / `footer()` / `document()` chrome around `<main id="main">`. */
export function SiteFrame(props: SiteFrameProps): Child {
  const pathname = props.route?.pathname;
  return (
    <>
      <a class="skip-link" href="#main">本文へスキップ</a>
      <div class="site-header">
        <header class="container site-header__inner">
          <Brand word={props.brandWord} sub={props.brandSub} />
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
            <span>メニュー</span>
            <Icon name="menu" class="menu-open-icon" />
            <Icon name="close" class="menu-close-icon" />
          </button>
          <nav id="site-navigation" class="site-nav" aria-label="メインメニュー">
            {HEADER_NAV.map((item) => (
              <a class="site-nav__item" href={item.href} aria-current={isCurrent(pathname, item.href) ? "page" : null}>
                {item.label}
              </a>
            ))}
            <a class="site-nav__contact button--primary" href="/contact/" aria-current={isCurrent(pathname, "/contact/") ? "page" : null}>
              <Icon name="mail" />
              <span>お問い合わせ</span>
            </a>
          </nav>
          <button class="motion-toggle" type="button" aria-label="装飾の動きと色の変化" aria-pressed="false" data-motion-toggle="">
            <Icon name="pause" class="motion-running-icon" />
            <Icon name="play" class="motion-paused-icon" />
            <span data-motion-label="">動き OFF</span>
          </button>
        </header>
      </div>
      <main id="main" tabindex={-1}>
        {(props.main ?? []) as Child}
      </main>
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
            <ul class="footer-nav">
              {FOOTER_NAV.map((item) => (
                <li>
                  <a href={item.href}>
                    <span class="eyebrow">{item.label}</span>
                    <span class="footer-nav__title">{item.title}</span>
                    <span class="footer-nav__description">{item.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div class="container footer-bottom">
          <p>{props.copyright}</p>
          <a href="#top">
            <span>{props.backToTopLabel}</span>
            <Icon name="arrow-up" />
          </a>
        </div>
      </footer>
    </>
  );
}
