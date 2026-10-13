import type { Child } from "@takazudo/zfb/zudo-react";
import type { RouteContext } from "../render/types";

export interface NavLinkProps {
  href: string;
  label: string;
  /** Injected by the renderer; marks the item `aria-current="page"` on its own section. */
  route?: RouteContext;
}

/** `/lessons` → `/lessons/`: compiled plan pathnames carry no trailing slash, hrefs do. */
export function directoryPath(pathname: string): string {
  return pathname.endsWith("/") || pathname.endsWith(".html") ? pathname : `${pathname}/`;
}

/** Same rule as the prototype header: the current route starts with the item's path. */
export function isCurrentSection(pathname: string | undefined, href: string): boolean {
  if (!pathname) return false;
  const current = directoryPath(pathname);
  const target = directoryPath(href);
  return current === target || (target !== "/" && current.startsWith(target));
}

/** One `a.site-nav__item` of the header navigation. */
export function NavLink({ href, label, route }: NavLinkProps): Child {
  return (
    <a class="site-nav__item" href={href} aria-current={isCurrentSection(route?.pathname, href) ? "page" : null}>
      {label}
    </a>
  );
}
