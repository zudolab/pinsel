import type { Child } from "@takazudo/zfb/zudo-react";
import { RoutePage } from "~/lib/route-page";

export default function NotesPage(): Child {
  return <RoutePage route="/notes/" />;
}
