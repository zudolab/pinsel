import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";

export function isExternalHref(href: string): boolean {
  return href.startsWith("https:") || href.startsWith("http:");
}

export interface TextLinkProps {
  href: string;
  label: string;
}

/** Prototype `ui.py text_link()`: Instagram icon for instagram.com, up-right arrow for external targets. */
export function TextLink({ href, label }: TextLinkProps): Child {
  const social = href.includes("instagram.com");
  return (
    <a class="text-link" href={href}>
      {social ? <Icon name="instagram" /> : null}
      <span>{label}</span>
      <Icon name={isExternalHref(href) ? "arrow-up-right" : "arrow-right"} />
    </a>
  );
}

export interface ButtonLinkProps {
  href: string;
  label: string;
  primary?: boolean;
}

/** Prototype `ui.py link()`: mail icon on contact targets, arrow per destination kind. */
export function ButtonLink({ href, label, primary = false }: ButtonLinkProps): Child {
  return (
    <a class={primary ? "button button--primary" : "button"} href={href}>
      <span class="button__label">
        {href.includes("/contact/") ? <Icon name="mail" /> : null}
        <span>{label}</span>
      </span>
      <Icon name={isExternalHref(href) ? "arrow-up-right" : "arrow-right"} class="button__arrow" />
    </a>
  );
}
