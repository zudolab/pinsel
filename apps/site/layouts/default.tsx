import type { Child } from "@takazudo/zfb/zudo-react";
import { clientScript } from "@takazudo/zfb";
import { DocumentShell } from "@pinsel/ui";
import { VISITOR_SCRIPT_NAMES } from "@pinsel/ui/src/scripts/entries.ts";
import { siteConfig } from "~/lib/site-config";

export interface DefaultLayoutProps {
  /** Approved output route (`/lessons/`, `/404.html`). */
  route: string;
  title: string;
  description: string;
  children: Child;
}

export const ROBOTS = siteConfig.indexing === "index" ? "index,follow" : "noindex,nofollow";

// zfb appends the compiled stylesheet link to <head>; the body is the shared
// renderer output, so the Worker preview and this layout differ only in <head>.
// Every page (404 included) carries the same meta set: the publication gate
// requires one metadata policy across all 14 outputs.
export default function DefaultLayout(props: DefaultLayoutProps): Child {
  const url = `${siteConfig.origin}${props.route}`;
  const head = [
    <link rel="canonical" href={url} />,
    <meta property="og:type" content="website" />,
    <meta property="og:locale" content="ja_JP" />,
    <meta property="og:site_name" content="Pinsel" />,
    <meta property="og:title" content={props.title} />,
    <meta property="og:description" content={props.description} />,
    <meta property="og:url" content={url} />,
  ];
  const scripts = VISITOR_SCRIPT_NAMES.map((name) => <script type="module" src={clientScript(name)}></script>);
  return (
    <DocumentShell pathname={props.route} title={props.title} description={props.description} robots={ROBOTS} head={head} scripts={scripts}>
      {props.children}
    </DocumentShell>
  );
}
