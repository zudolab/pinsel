import type { Child } from "@takazudo/zfb/zudo-react";
import { RoutePage } from "~/lib/route-page";

export default function NotFoundPage(): Child {
  return <RoutePage route="/404.html" />;
}
