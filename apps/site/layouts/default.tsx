import type { Child } from "@takazudo/zfb/zudo-react";
import { DocumentShell } from "@pinsel/ui";

export interface DefaultLayoutProps {
  pathname: string;
  title: string;
  description: string;
  children: Child;
}

// zfb appends the compiled stylesheet link to <head>; everything else in the
// shell is shared with the authoring Worker's preview document.
export default function DefaultLayout(props: DefaultLayoutProps): Child {
  return (
    <DocumentShell pathname={props.pathname} title={props.title} description={props.description} robots="noindex,nofollow">
      {props.children}
    </DocumentShell>
  );
}
