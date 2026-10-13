import type { Child } from "@takazudo/zfb/zudo-react";
import { FooterLink } from "../footer-link/footer-link";
import { NavLink } from "../nav-link/nav-link";
import type { RouteContext } from "../render/types";
import { SiteFooter } from "../site-footer/site-footer";
import { SiteHeader } from "../site-header/site-header";
import { SkipLink } from "../skip-link/skip-link";

export { INSTAGRAM_URL } from "../site-footer/site-footer";

// The approved navigation (`ui.py` NAV and the footer `navLinks`
// frontmatter). The structure manifest projects `nav-link` entries into the
// `headerNav` / `footerNav` slots; these literals render only when a slot is
// left empty, which keeps the Gate-1 frame (no nav slots) unchanged.
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

export interface SiteFrameProps {
  brandWord: string;
  brandSub: string;
  instagramLabel: string;
  /** `{year}` is replaced with the current year. */
  copyright: string;
  backToTopLabel: string;
  contactLabel?: string;
  /** Composer outlet slot: the route's own composition renders here, inside `<main>`. */
  main?: readonly unknown[];
  /** `pinsel.nav-link` children; empty → the approved literals. */
  headerNav?: readonly unknown[];
  /** `pinsel.footer-link` children; empty → the approved literals. */
  footerNav?: readonly unknown[];
  /** Injected by the renderer; never authored. */
  route?: RouteContext;
}

const filled = (children: readonly unknown[] | undefined): children is readonly unknown[] => children !== undefined && children.length > 0;

/** Prototype `ui.py document()` body: skip link, header, `<main id="main">`, footer. */
export function SiteFrame(props: SiteFrameProps): Child {
  const pathname = props.route?.pathname;
  const headerNav = filled(props.headerNav) ? (props.headerNav as Child) : HEADER_NAV.map((item) => <NavLink {...item} route={props.route} />);
  const footerNav = filled(props.footerNav) ? (props.footerNav as Child) : FOOTER_NAV.map((item) => <FooterLink {...item} />);
  return (
    <>
      <SkipLink />
      <SiteHeader brandWord={props.brandWord} brandSub={props.brandSub} contactLabel={props.contactLabel ?? "お問い合わせ"} nav={headerNav} pathname={pathname} />
      <main id="main" tabindex={-1}>
        {(props.main ?? []) as Child}
      </main>
      <SiteFooter
        brandWord={props.brandWord}
        brandSub={props.brandSub}
        instagramLabel={props.instagramLabel}
        copyright={props.copyright}
        backToTopLabel={props.backToTopLabel}
        nav={footerNav}
      />
    </>
  );
}
