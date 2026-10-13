import type { Child } from "@takazudo/zfb/zudo-react";
import { RoutePage, noteSlugs } from "~/lib/route-page";

export function paths(): { params: { slug: string } }[] {
  return noteSlugs().map((slug) => ({ params: { slug } }));
}

export default function NotePage(props: { params: { slug: string } }): Child {
  return <RoutePage route={`/notes/${props.params.slug}/`} />;
}
