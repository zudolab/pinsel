import { h, type Child } from "@takazudo/zfb/zudo-react";

export interface HeadingProps {
  level: "h2" | "h3" | "h4";
  text: string;
  id: string;
}

export function Heading(props: HeadingProps): Child {
  return h(props.level, { id: props.id || null }, props.text);
}
