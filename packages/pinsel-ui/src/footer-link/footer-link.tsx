import type { Child } from "@takazudo/zfb/zudo-react";

export interface FooterLinkProps {
  href: string;
  /** English eyebrow (`Lessons`, `Notes`, …). */
  label: string;
  title: string;
  description: string;
}

/** One `li` of the footer navigation. */
export function FooterLink({ href, label, title, description }: FooterLinkProps): Child {
  return (
    <li>
      <a href={href}>
        <span class="eyebrow">{label}</span>
        <span class="footer-nav__title">{title}</span>
        <span class="footer-nav__description">{description}</span>
      </a>
    </li>
  );
}
