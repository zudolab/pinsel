import type { Child } from "@takazudo/zfb/zudo-react";
import { Icon } from "../icon/icon";

export interface BreadcrumbProps {
  label: string;
  /** Intermediate level (`Notes` for an article); empty label = none. */
  parentLabel?: string;
  parentHref?: string;
}

/** Prototype `ui.py breadcrumb()`: トップ › [parent ›] current page. */
export function Breadcrumb({ label, parentLabel, parentHref }: BreadcrumbProps): Child {
  return (
    <nav class="breadcrumb container" aria-label="パンくずリスト">
      <ol>
        <li>
          <a href="/">
            <Icon name="home" />
            <span>トップ</span>
          </a>
        </li>
        {parentLabel && parentHref ? (
          <li>
            <Icon name="chevron-right" class="breadcrumb__separator" />
            <a href={parentHref}>{parentLabel}</a>
          </li>
        ) : null}
        <li aria-current="page">
          <Icon name="chevron-right" class="breadcrumb__separator" />
          <span>{label}</span>
        </li>
      </ol>
    </nav>
  );
}
