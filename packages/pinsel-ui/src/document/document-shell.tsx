import type { Child } from "@takazudo/zfb/zudo-react";

export interface DocumentShellProps {
  pathname: string;
  title: string;
  description: string;
  /** `noindex` until the launch input sets indexing; the prototype shipped noindex,nofollow. */
  robots: string;
  /** Extra `<head>` children: the stylesheet and, for the private preview, its protocol client. */
  head?: Child;
  children: Child;
}

/** `page-home`, `page-lessons`, `page-notes` (index and articles), `page-not-found`. */
export function bodyClassForPathname(pathname: string): string {
  if (pathname === "/") return "page-home";
  if (pathname === "/404.html") return "page-not-found";
  const [segment] = pathname.replace(/^\//, "").split("/");
  return `page-${segment || "home"}`;
}

/** Prototype `ui.py document()` head and body attributes, shared by the ZFB layout and the Worker preview. */
export function DocumentShell(props: DocumentShellProps): Child {
  return (
    <html lang="ja" id="top" data-motion="off">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content={props.robots} />
        <meta name="description" content={props.description} />
        <meta name="theme-color" content="#f2f5ee" />
        <title>{props.title}</title>
        <link rel="icon" href="/favicon.svg" />
        <link rel="stylesheet" href="/assets/fonts/fonts.css" />
        {props.head ?? null}
      </head>
      <body class={bodyClassForPathname(props.pathname)}>{props.children}</body>
    </html>
  );
}
